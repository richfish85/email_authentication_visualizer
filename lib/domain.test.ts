import { describe, expect, it } from "vitest";

import { normalizeDkimSelectorInput, normalizeDomainInput } from "./domain";

describe("normalizeDomainInput", () => {
  it("normalizes URLs to a bare lowercase domain", () => {
    expect(normalizeDomainInput("https://Example.COM/path?utm=test")).toEqual({
      ok: true,
      value: "example.com",
    });
  });

  it("rejects email addresses instead of treating them as domains", () => {
    expect(normalizeDomainInput("admin@example.com")).toEqual({
      ok: false,
      error: "Enter a domain only, not an email address.",
    });
  });

  it("rejects obvious non-domain inputs", () => {
    expect(normalizeDomainInput("127.0.0.1")).toMatchObject({ ok: false });
    expect(normalizeDomainInput("localhost")).toMatchObject({ ok: false });
  });
});

describe("normalizeDkimSelectorInput", () => {
  it("allows empty selectors because DKIM checks are optional", () => {
    expect(normalizeDkimSelectorInput("")).toEqual({
      ok: true,
      value: "",
    });
  });

  it("normalizes provider-style selectors", () => {
    expect(normalizeDkimSelectorInput(" Google-2026 ")).toEqual({
      ok: true,
      value: "google-2026",
    });
  });

  it("rejects selectors with unsafe characters", () => {
    expect(normalizeDkimSelectorInput("google/selector")).toMatchObject({
      ok: false,
    });
  });
});
