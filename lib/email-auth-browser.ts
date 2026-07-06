import {
  buildAnalysisFromTxtLookups,
  type TxtLookupResult,
} from "@/lib/email-auth-core";
import { normalizeDkimSelectorInput, normalizeDomainInput } from "@/lib/domain";
import type { AnalysisResponse } from "@/lib/types";

const DNS_JSON_ENDPOINT = "https://dns.google/resolve";
const DNS_LOOKUP_TIMEOUT_MS = 4000;

type GoogleDnsJsonResponse = {
  Status?: number;
  Answer?: Array<{
    data?: string;
    type?: number;
  }>;
  Comment?: string;
};

function parseTxtPresentationValue(value: string) {
  const chunks = [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) =>
    match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
  );

  if (chunks.length > 0) {
    return chunks.join("").trim();
  }

  return value.trim();
}

async function lookupTxtWithDoh(name: string): Promise<TxtLookupResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DNS_LOOKUP_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      name,
      type: "TXT",
    });
    const response = await fetch(`${DNS_JSON_ENDPOINT}?${params.toString()}`, {
      headers: {
        Accept: "application/dns-json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        name,
        status: "error",
        records: [],
        errorCode: String(response.status),
        errorMessage: `DNS-over-HTTPS returned HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as GoogleDnsJsonResponse;
    const answers = payload.Answer?.filter((answer) => answer.type === 16) ?? [];
    const records = answers
      .map((answer) => answer.data)
      .filter((record): record is string => typeof record === "string")
      .map(parseTxtPresentationValue)
      .filter(Boolean);

    if (records.length > 0) {
      return {
        name,
        status: "ok",
        records,
      };
    }

    if (payload.Status === 0 || payload.Status === 3) {
      return {
        name,
        status: "missing",
        records: [],
      };
    }

    return {
      name,
      status: "error",
      records: [],
      errorCode: String(payload.Status ?? "unknown"),
      errorMessage: payload.Comment ?? "DNS-over-HTTPS lookup failed.",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        name,
        status: "timeout",
        records: [],
        errorMessage: `DNS lookup timed out after ${DNS_LOOKUP_TIMEOUT_MS}ms.`,
      };
    }

    return {
      name,
      status: "error",
      records: [],
      errorMessage: "DNS-over-HTTPS lookup failed.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeDomainWithDoh(
  rawDomain: string,
  rawDkimSelector?: string,
): Promise<AnalysisResponse> {
  const normalizedDomain = normalizeDomainInput(rawDomain);
  if (!normalizedDomain.ok) {
    throw new Error(normalizedDomain.error);
  }

  const normalizedSelector = normalizeDkimSelectorInput(rawDkimSelector ?? "");
  if (!normalizedSelector.ok) {
    throw new Error(normalizedSelector.error);
  }

  const domain = normalizedDomain.value;
  const dkimSelector = normalizedSelector.value || undefined;

  const [domainTxt, dmarcTxt, dkimTxt] = await Promise.all([
    lookupTxtWithDoh(domain),
    lookupTxtWithDoh(`_dmarc.${domain}`),
    dkimSelector
      ? lookupTxtWithDoh(`${dkimSelector}._domainkey.${domain}`)
      : Promise.resolve(null),
  ]);

  return buildAnalysisFromTxtLookups({
    domain,
    dkimSelector,
    domainTxt,
    dmarcTxt,
    dkimTxt,
  });
}
