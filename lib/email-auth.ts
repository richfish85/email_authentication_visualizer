import "server-only";

import { resolveTxt } from "node:dns/promises";

import {
  buildAnalysisFromTxtLookups,
  type TxtLookupResult,
} from "@/lib/email-auth-core";
import { normalizeDkimSelectorInput, normalizeDomainInput } from "@/lib/domain";
import { ValidationError } from "@/lib/errors";
import type { AnalysisResponse } from "@/lib/types";

const DNS_LOOKUP_TIMEOUT_MS = 4000;

function flattenTxtRecords(records: string[][]) {
  return records.map((record) => record.join("").trim());
}

function getErrorCode(error: unknown) {
  if (!(error instanceof Error) || !("code" in error)) {
    return undefined;
  }

  return String(error.code);
}

function isMissingDnsRecord(error: unknown) {
  const code = getErrorCode(error);
  return ["ENODATA", "ENOTFOUND", "ENOTIMP", "ESERVFAIL", "EREFUSED"].includes(
    code ?? "",
  );
}

function describeDnsError(error: unknown) {
  const code = getErrorCode(error);

  if (!code) {
    return "DNS resolution returned an unexpected error.";
  }

  return `DNS resolution returned ${code}.`;
}

async function lookupTxt(name: string): Promise<TxtLookupResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const lookupPromise = resolveTxt(name)
    .then(
      (records) =>
        ({
          name,
          status: "ok",
          records: flattenTxtRecords(records),
        }) satisfies TxtLookupResult,
    )
    .catch((error) => {
      if (isMissingDnsRecord(error)) {
        return {
          name,
          status: "missing",
          records: [],
          errorCode: getErrorCode(error),
        } satisfies TxtLookupResult;
      }

      return {
        name,
        status: "error",
        records: [],
        errorCode: getErrorCode(error),
        errorMessage: describeDnsError(error),
      } satisfies TxtLookupResult;
    });

  const timeoutPromise = new Promise<TxtLookupResult>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        name,
        status: "timeout",
        records: [],
        errorMessage: `DNS lookup timed out after ${DNS_LOOKUP_TIMEOUT_MS}ms.`,
      });
    }, DNS_LOOKUP_TIMEOUT_MS);
  });

  const result = await Promise.race([lookupPromise, timeoutPromise]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return result;
}

export async function analyzeDomain(
  rawDomain: string,
  rawDkimSelector?: string,
): Promise<AnalysisResponse> {
  const normalizedDomain = normalizeDomainInput(rawDomain);
  if (!normalizedDomain.ok) {
    throw new ValidationError(normalizedDomain.error);
  }

  const normalizedSelector = normalizeDkimSelectorInput(rawDkimSelector ?? "");
  if (!normalizedSelector.ok) {
    throw new ValidationError(normalizedSelector.error);
  }

  const domain = normalizedDomain.value;
  const dkimSelector = normalizedSelector.value || undefined;

  const [domainTxt, dmarcTxt, dkimTxt] = await Promise.all([
    lookupTxt(domain),
    lookupTxt(`_dmarc.${domain}`),
    dkimSelector ? lookupTxt(`${dkimSelector}._domainkey.${domain}`) : Promise.resolve(null),
  ]);

  return buildAnalysisFromTxtLookups({
    domain,
    dkimSelector,
    domainTxt,
    dmarcTxt,
    dkimTxt,
  });
}
