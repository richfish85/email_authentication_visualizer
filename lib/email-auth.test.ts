import { describe, expect, it } from "vitest";

import {
  buildScoreLabel,
  parseDmarcRecord,
  parseSpfRecord,
  summarizeDmarc,
  summarizeSpf,
} from "./email-auth-core";
import type { DkimCheck, DmarcCheck, SpfCheck } from "./types";

const okTxtLookup = {
  name: "example.com",
  status: "ok" as const,
  records: [],
};

describe("parseSpfRecord", () => {
  it("extracts common SPF mechanisms for inspection", () => {
    expect(
      parseSpfRecord("v=spf1 include:_spf.example.com ip4:192.0.2.0/24 ip6:2001:db8::/32 -all"),
    ).toEqual({
      version: "v=spf1",
      includes: ["_spf.example.com"],
      ip4: ["192.0.2.0/24"],
      ip6: ["2001:db8::/32"],
      all: "-all",
    });
  });
});

describe("summarizeSpf", () => {
  it("passes a single SPF record with hard fail", () => {
    const parsed = parseSpfRecord("v=spf1 include:_spf.example.com -all");

    expect(summarizeSpf(okTxtLookup, 1, parsed)).toEqual({
      status: "pass",
      message: "SPF has a strong -all policy.",
    });
  });

  it("flags multiple SPF records as a configuration error", () => {
    expect(summarizeSpf(okTxtLookup, 2)).toEqual({
      status: "fail",
      message:
        "Multiple SPF TXT records were found. SPF should be published as a single record.",
    });
  });

  it("flags +all because it authorizes any sender", () => {
    const parsed = parseSpfRecord("v=spf1 +all");

    expect(summarizeSpf(okTxtLookup, 1, parsed)).toEqual({
      status: "fail",
      message: "SPF exists, but +all allows any sender and should not be used.",
    });
  });
});

describe("parseDmarcRecord", () => {
  it("extracts policy, reporting, rollout, and alignment tags", () => {
    expect(
      parseDmarcRecord(
        "v=DMARC1; p=reject; rua=mailto:aggregate@example.com; ruf=mailto:forensic@example.com; pct=50; adkim=s; aspf=r",
      ),
    ).toEqual({
      p: "reject",
      rua: ["mailto:aggregate@example.com"],
      ruf: ["mailto:forensic@example.com"],
      pct: "50",
      adkim: "s",
      aspf: "r",
    });
  });
});

describe("summarizeDmarc", () => {
  it("passes reject policy when pct is fully enforced", () => {
    const parsed = parseDmarcRecord("v=DMARC1; p=reject; pct=100");

    expect(summarizeDmarc(okTxtLookup, 1, parsed)).toEqual({
      status: "pass",
      message: "DMARC is enforcing with reject.",
    });
  });

  it("warns on monitoring-only policy", () => {
    const parsed = parseDmarcRecord("v=DMARC1; p=none; rua=mailto:reports@example.com");

    expect(summarizeDmarc(okTxtLookup, 1, parsed)).toEqual({
      status: "warning",
      message: "DMARC is set to monitoring only (p=none).",
    });
  });
});

describe("buildScoreLabel", () => {
  const dkimPass: DkimCheck = {
    checked: true,
    found: true,
    record: "v=DKIM1; p=test",
    message: "A DKIM key record was found for the supplied selector.",
    status: "pass",
  };

  it("returns Strong when all checked mechanisms pass", () => {
    const spf: SpfCheck = {
      found: true,
      record: "v=spf1 -all",
      parsed: parseSpfRecord("v=spf1 -all"),
      message: "SPF has a strong -all policy.",
      status: "pass",
    };
    const dmarc: DmarcCheck = {
      found: true,
      record: "v=DMARC1; p=reject",
      parsed: parseDmarcRecord("v=DMARC1; p=reject"),
      message: "DMARC is enforcing with reject.",
      status: "pass",
    };

    expect(
      buildScoreLabel({
        spf,
        dmarc,
        dkim: dkimPass,
        spfLookup: okTxtLookup,
        dmarcLookup: okTxtLookup,
      }),
    ).toBe("Strong");
  });

  it("returns Needs attention when SPF or DMARC fails", () => {
    const spf: SpfCheck = {
      found: false,
      record: null,
      message: "No SPF TXT record was found for this domain.",
      status: "fail",
    };
    const dmarc: DmarcCheck = {
      found: true,
      record: "v=DMARC1; p=reject",
      parsed: parseDmarcRecord("v=DMARC1; p=reject"),
      message: "DMARC is enforcing with reject.",
      status: "pass",
    };

    expect(
      buildScoreLabel({
        spf,
        dmarc,
        dkim: dkimPass,
        spfLookup: okTxtLookup,
        dmarcLookup: okTxtLookup,
      }),
    ).toBe("Needs attention");
  });
});
