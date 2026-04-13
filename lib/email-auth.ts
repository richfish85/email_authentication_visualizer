import "server-only";

import { resolveTxt } from "node:dns/promises";

import { normalizeDkimSelectorInput, normalizeDomainInput } from "@/lib/domain";
import { ValidationError } from "@/lib/errors";
import type {
  AnalysisResponse,
  CheckStatus,
  DkimCheck,
  DmarcCheck,
  SpfCheck,
} from "@/lib/types";

const DNS_LOOKUP_TIMEOUT_MS = 4000;

type LookupStatus = "ok" | "missing" | "timeout" | "error";

type TxtLookupResult = {
  name: string;
  status: LookupStatus;
  records: string[];
  errorCode?: string;
  errorMessage?: string;
};

type SpfParseResult = NonNullable<SpfCheck["parsed"]>;
type DmarcParseResult = NonNullable<DmarcCheck["parsed"]>;

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

function getNonEmptyRecords(records: string[]) {
  return records.filter((record) => record.length > 0);
}

function parseSpfRecord(record: string): SpfParseResult {
  const tokens = record.split(/\s+/).filter(Boolean);

  return {
    version: tokens[0],
    includes: tokens
      .filter((token) => token.toLowerCase().startsWith("include:"))
      .map((token) => token.slice(8)),
    ip4: tokens
      .filter((token) => token.toLowerCase().startsWith("ip4:"))
      .map((token) => token.slice(4)),
    ip6: tokens
      .filter((token) => token.toLowerCase().startsWith("ip6:"))
      .map((token) => token.slice(4)),
    all: tokens.find((token) => /^[+~?-]?all$/i.test(token)) ?? null,
  };
}

function summarizeSpf(
  lookup: TxtLookupResult,
  recordCount: number,
  parsed?: SpfParseResult,
) {
  if (lookup.status === "timeout") {
    return {
      status: "warning" as CheckStatus,
      message: "SPF lookup timed out.",
    };
  }

  if (lookup.status === "error") {
    return {
      status: "warning" as CheckStatus,
      message: "SPF lookup failed during DNS resolution.",
    };
  }

  if (recordCount === 0 || !parsed) {
    return {
      status: "fail" as CheckStatus,
      message: "No SPF TXT record was found for this domain.",
    };
  }

  if (recordCount > 1) {
    return {
      status: "fail" as CheckStatus,
      message:
        "Multiple SPF TXT records were found. SPF should be published as a single record.",
    };
  }

  const finalMechanism = parsed.all?.toLowerCase() ?? null;

  if (!finalMechanism) {
    return {
      status: "warning" as CheckStatus,
      message: "SPF exists, but the record does not include a final all mechanism.",
    };
  }

  if (finalMechanism === "+all") {
    return {
      status: "fail" as CheckStatus,
      message: "SPF exists, but +all allows any sender and should not be used.",
    };
  }

  if (finalMechanism === "~all") {
    return {
      status: "warning" as CheckStatus,
      message: "SPF uses a soft fail policy (~all).",
    };
  }

  if (finalMechanism === "?all") {
    return {
      status: "warning" as CheckStatus,
      message: "SPF uses a neutral policy (?all), which provides weak enforcement.",
    };
  }

  return {
    status: "pass" as CheckStatus,
    message: "SPF has a strong -all policy.",
  };
}

function parseTagList(value: string | undefined) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseDmarcRecord(record: string): DmarcParseResult {
  const segments = record
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const tags = new Map<string, string>();

  for (const segment of segments) {
    const equalsIndex = segment.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = segment.slice(0, equalsIndex).trim().toLowerCase();
    const value = segment.slice(equalsIndex + 1).trim();
    tags.set(key, value);
  }

  return {
    p: tags.get("p"),
    rua: parseTagList(tags.get("rua")),
    ruf: parseTagList(tags.get("ruf")),
    pct: tags.get("pct"),
    adkim: tags.get("adkim"),
    aspf: tags.get("aspf"),
  };
}

function summarizeDmarc(
  lookup: TxtLookupResult,
  recordCount: number,
  parsed?: DmarcParseResult,
) {
  if (lookup.status === "timeout") {
    return {
      status: "warning" as CheckStatus,
      message: "DMARC lookup timed out at _dmarc.",
    };
  }

  if (lookup.status === "error") {
    return {
      status: "warning" as CheckStatus,
      message: "DMARC lookup failed during DNS resolution.",
    };
  }

  if (recordCount === 0 || !parsed) {
    return {
      status: "fail" as CheckStatus,
      message: "No DMARC record was found at _dmarc.",
    };
  }

  if (recordCount > 1) {
    return {
      status: "fail" as CheckStatus,
      message:
        "Multiple DMARC TXT records were found. DMARC should be published as a single record.",
    };
  }

  const policy = parsed.p?.toLowerCase();
  const pct = Number(parsed.pct ?? "100");

  if (!policy) {
    return {
      status: "fail" as CheckStatus,
      message: "DMARC exists, but the record is missing a p= policy tag.",
    };
  }

  if (policy === "none") {
    return {
      status: "warning" as CheckStatus,
      message: "DMARC is set to monitoring only (p=none).",
    };
  }

  if (Number.isFinite(pct) && pct > 0 && pct < 100) {
    return {
      status: "warning" as CheckStatus,
      message: `DMARC is enforcing for ${pct}% of mail (pct=${pct}).`,
    };
  }

  if (policy === "quarantine") {
    return {
      status: "pass" as CheckStatus,
      message: "DMARC is enforcing with quarantine.",
    };
  }

  if (policy === "reject") {
    return {
      status: "pass" as CheckStatus,
      message: "DMARC is enforcing with reject.",
    };
  }

  return {
    status: "warning" as CheckStatus,
    message: `DMARC exists with policy ${policy}, but it needs manual review.`,
  };
}

function summarizeDkim(lookup: TxtLookupResult, selector: string): DkimCheck {
  if (lookup.status === "timeout") {
    return {
      checked: true,
      selector,
      found: false,
      record: null,
      message: "DKIM lookup timed out for this selector.",
      status: "warning",
    };
  }

  if (lookup.status === "error") {
    return {
      checked: true,
      selector,
      found: false,
      record: null,
      message: "DKIM lookup failed during DNS resolution.",
      status: "warning",
    };
  }

  const nonEmptyRecords = getNonEmptyRecords(lookup.records);

  if (lookup.records.length > 0 && nonEmptyRecords.length === 0) {
    return {
      checked: true,
      selector,
      found: false,
      record: null,
      message: "A TXT record exists for this selector, but it is empty.",
      status: "warning",
    };
  }

  if (nonEmptyRecords.length === 0) {
    return {
      checked: true,
      selector,
      found: false,
      record: null,
      message:
        "No TXT record was found for this selector. DKIM may still exist under a different selector.",
      status: "warning",
    };
  }

  const preferredRecord =
    nonEmptyRecords.find((record) => /(^|;\s*)v=dkim1\b/i.test(record)) ??
    nonEmptyRecords[0];
  const hasDkimVersion = /(^|;\s*)v=dkim1\b/i.test(preferredRecord);
  const hasPublicKey = /(^|;\s*)p=/i.test(preferredRecord);
  const hasMultipleRecords = nonEmptyRecords.length > 1;

  if (hasMultipleRecords && (hasDkimVersion || hasPublicKey)) {
    return {
      checked: true,
      selector,
      found: true,
      record: preferredRecord,
      parsed: {
        version: hasDkimVersion ? "DKIM1" : undefined,
      },
      message:
        "Multiple TXT records were found for this selector. Showing the most DKIM-like record.",
      status: "warning",
    };
  }

  if (hasDkimVersion || hasPublicKey) {
    return {
      checked: true,
      selector,
      found: true,
      record: preferredRecord,
      parsed: {
        version: hasDkimVersion ? "DKIM1" : undefined,
      },
      message: "A DKIM key record was found for the supplied selector.",
      status: "pass",
    };
  }

  return {
    checked: true,
    selector,
    found: true,
    record: preferredRecord,
    message:
      "A TXT record exists for this selector, but it does not clearly identify itself as a DKIM key.",
    status: "warning",
  };
}

function buildRecommendations({
  spf,
  dmarc,
  dkim,
  spfLookup,
  dmarcLookup,
  dkimLookup,
  spfRecordCount,
  dmarcRecordCount,
}: {
  spf: SpfCheck;
  dmarc: DmarcCheck;
  dkim: DkimCheck;
  spfLookup: TxtLookupResult;
  dmarcLookup: TxtLookupResult;
  dkimLookup: TxtLookupResult | null;
  spfRecordCount: number;
  dmarcRecordCount: number;
}) {
  const recommendations = new Set<string>();

  if (spfLookup.status === "timeout" || spfLookup.status === "error") {
    recommendations.add(
      "Retry the SPF lookup or verify authoritative DNS responses for this domain.",
    );
  }

  if (spfRecordCount > 1) {
    recommendations.add("Consolidate multiple SPF records into a single SPF TXT record.");
  }

  if (!spf.found) {
    recommendations.add(
      "Add a single SPF record that lists only your legitimate sending services.",
    );
  }

  if (spf.parsed?.all?.toLowerCase() === "~all") {
    recommendations.add(
      "Move from SPF soft fail (~all) to hard fail (-all) after confirming every authorized sender.",
    );
  }

  if (spf.parsed?.all?.toLowerCase() === "+all") {
    recommendations.add("Replace SPF +all immediately; it authorizes any sender.");
  }

  if ((spf.parsed?.includes?.length ?? 0) > 3) {
    recommendations.add(
      "Review SPF include mechanisms so the record stays intentional and easy to audit.",
    );
  }

  if (dmarcLookup.status === "timeout" || dmarcLookup.status === "error") {
    recommendations.add(
      "Retry the DMARC lookup or verify authoritative DNS responses for _dmarc.",
    );
  }

  if (dmarcRecordCount > 1) {
    recommendations.add("Publish a single DMARC record at _dmarc.");
  }

  if (!dmarc.found) {
    recommendations.add(
      "Publish a DMARC record so receiving systems can apply an explicit domain policy.",
    );
  }

  if (dmarc.parsed?.p?.toLowerCase() === "none") {
    recommendations.add(
      "Plan a move from DMARC p=none to quarantine or reject once reporting looks healthy.",
    );
  }

  if (dmarc.parsed?.pct && dmarc.parsed.pct !== "100") {
    recommendations.add(
      "Raise DMARC pct toward 100% when you are comfortable with current enforcement results.",
    );
  }

  if (dmarc.found && (dmarc.parsed?.rua?.length ?? 0) === 0) {
    recommendations.add(
      "Add a DMARC rua destination to collect aggregate reports while you tune policy.",
    );
  }

  if (!dkim.checked) {
    recommendations.add(
      "Verify DKIM selectors with your mail provider before assuming DKIM is absent.",
    );
  }

  if (dkimLookup && (dkimLookup.status === "timeout" || dkimLookup.status === "error")) {
    recommendations.add(
      "Retry the DKIM lookup or verify authoritative DNS responses for the selector.",
    );
  }

  if (dkim.checked && !dkim.found) {
    recommendations.add(
      "Confirm the DKIM selector with your mail provider and publish the matching public key.",
    );
  }

  if (recommendations.size === 0) {
    recommendations.add("No immediate issues stood out in this MVP-level review.");
  }

  return [...recommendations];
}

function buildScoreLabel({
  spf,
  dmarc,
  dkim,
  spfLookup,
  dmarcLookup,
}: {
  spf: SpfCheck;
  dmarc: DmarcCheck;
  dkim: DkimCheck;
  spfLookup: TxtLookupResult;
  dmarcLookup: TxtLookupResult;
}) {
  if (
    spfLookup.status === "timeout" ||
    spfLookup.status === "error" ||
    dmarcLookup.status === "timeout" ||
    dmarcLookup.status === "error"
  ) {
    return "Needs attention";
  }

  if (spf.status === "fail" || dmarc.status === "fail") {
    return "Needs attention";
  }

  if (!dkim.checked) {
    return "Moderate";
  }

  if ([spf.status, dmarc.status, dkim.status].includes("warning")) {
    return "Moderate";
  }

  if (dkim.status === "fail") {
    return "Needs attention";
  }

  return "Strong";
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

  const spfRecords = getNonEmptyRecords(domainTxt.records).filter((record) =>
    /^v=spf1\b/i.test(record),
  );
  const spfParsed =
    spfRecords.length === 1 ? parseSpfRecord(spfRecords[0]) : undefined;
  const spfSummary = summarizeSpf(domainTxt, spfRecords.length, spfParsed);
  const spf: SpfCheck = {
    found: spfRecords.length > 0,
    record: spfRecords.length > 0 ? spfRecords.join("\n") : null,
    parsed: spfParsed,
    message: spfSummary.message,
    status: spfSummary.status,
  };

  const dmarcRecords = getNonEmptyRecords(dmarcTxt.records).filter((record) =>
    /^v=dmarc1\b/i.test(record),
  );
  const dmarcParsed =
    dmarcRecords.length === 1 ? parseDmarcRecord(dmarcRecords[0]) : undefined;
  const dmarcSummary = summarizeDmarc(dmarcTxt, dmarcRecords.length, dmarcParsed);
  const dmarc: DmarcCheck = {
    found: dmarcRecords.length > 0,
    record: dmarcRecords.length > 0 ? dmarcRecords.join("\n") : null,
    parsed: dmarcParsed,
    message: dmarcSummary.message,
    status: dmarcSummary.status,
  };

  const dkim: DkimCheck = dkimSelector
    ? summarizeDkim(
        dkimTxt ?? {
          name: `${dkimSelector}._domainkey.${domain}`,
          status: "missing",
          records: [],
        },
        dkimSelector,
      )
    : {
        checked: false,
        record: null,
        message: "No DKIM selector provided.",
        status: "info",
      };

  const recommendations = buildRecommendations({
    spf,
    dmarc,
    dkim,
    spfLookup: domainTxt,
    dmarcLookup: dmarcTxt,
    dkimLookup: dkimTxt,
    spfRecordCount: spfRecords.length,
    dmarcRecordCount: dmarcRecords.length,
  });
  const summary = {
    scoreLabel: buildScoreLabel({
      spf,
      dmarc,
      dkim,
      spfLookup: domainTxt,
      dmarcLookup: dmarcTxt,
    }),
    findings: [spf.message, dmarc.message, dkim.message],
  };

  return {
    domain,
    checks: {
      spf,
      dmarc,
      dkim,
    },
    summary,
    recommendations,
  };
}
