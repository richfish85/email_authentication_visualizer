"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { normalizeDkimSelectorInput, normalizeDomainInput } from "@/lib/domain";
import type {
  AnalysisResponse,
  CheckStatus,
  DkimCheck,
  DmarcCheck,
  SpfCheck,
} from "@/lib/types";

import styles from "./analyzer.module.css";

type FormState = {
  domain: string;
  dkimSelector: string;
};

type RecommendationMeta = {
  topic: string;
  tone: "recommended" | "review" | "healthy" | "action";
  toneLabel: string;
};

type RunAnalysisOptions = {
  syncUrl?: boolean;
  smoothScroll?: boolean;
};

type NormalizedInputs =
  | {
      ok: true;
      value: FormState;
    }
  | {
      ok: false;
      error: string;
    };

const initialFormState: FormState = {
  domain: "",
  dkimSelector: "",
};

function normalizeInputs(domainInput: string, dkimSelectorInput: string): NormalizedInputs {
  const normalizedDomain = normalizeDomainInput(domainInput);
  if (!normalizedDomain.ok) {
    return {
      ok: false,
      error: normalizedDomain.error,
    };
  }

  const normalizedSelector = normalizeDkimSelectorInput(dkimSelectorInput);
  if (!normalizedSelector.ok) {
    return {
      ok: false,
      error: normalizedSelector.error,
    };
  }

  return {
    ok: true,
    value: {
      domain: normalizedDomain.value,
      dkimSelector: normalizedSelector.value,
    },
  };
}

function getRequestKey(domainInput: string, selectorInput: string) {
  const normalized = normalizeInputs(domainInput, selectorInput);

  if (!normalized.ok) {
    return `${domainInput.trim().toLowerCase()}::${selectorInput.trim().toLowerCase()}`;
  }

  return `${normalized.value.domain}::${normalized.value.dkimSelector}`;
}

function buildSharePath(domain: string, selector: string, basePath = "/analyze") {
  const params = new URLSearchParams();
  params.set("domain", domain);

  if (selector) {
    params.set("selector", selector);
  }

  return `${basePath}?${params.toString()}`;
}

function statusLabel(status: CheckStatus) {
  switch (status) {
    case "pass":
      return "Pass";
    case "warning":
      return "Warning";
    case "fail":
      return "Needs attention";
    case "info":
      return "Info";
  }
}

function scoreTone(scoreLabel: string): CheckStatus {
  switch (scoreLabel) {
    case "Strong":
      return "pass";
    case "Moderate":
      return "warning";
    case "Needs attention":
      return "fail";
    default:
      return "info";
  }
}

function summaryValue(check: SpfCheck | DmarcCheck | DkimCheck) {
  if ("checked" in check) {
    if (!check.checked) {
      return "No DKIM selector provided";
    }

    return check.found ? "Record found" : "No record found";
  }

  return check.found ? "Record found" : "No record found";
}

function recommendationMeta(recommendation: string): RecommendationMeta {
  const lower = recommendation.toLowerCase();

  const topic = lower.includes("spf")
    ? "SPF"
    : lower.includes("dmarc")
      ? "DMARC"
      : lower.includes("dkim") || lower.includes("selector")
        ? "DKIM"
        : "General";

  if (lower.includes("no immediate issues")) {
    return {
      topic,
      tone: "healthy",
      toneLabel: "Healthy",
    };
  }

  if (
    lower.startsWith("add ") ||
    lower.startsWith("publish ") ||
    lower.startsWith("replace ") ||
    lower.includes("immediately")
  ) {
    return {
      topic,
      tone: "recommended",
      toneLabel: "Recommended",
    };
  }

  if (
    lower.includes("review") ||
    lower.includes("verify") ||
    lower.includes("confirm") ||
    lower.includes("plan") ||
    lower.includes("raise") ||
    lower.includes("move") ||
    lower.includes("retry")
  ) {
    return {
      topic,
      tone: "review",
      toneLabel: "Review",
    };
  }

  return {
    topic,
    tone: "action",
    toneLabel: "Action",
  };
}

function StatusPill({ status }: { status: CheckStatus }) {
  return (
    <span className={`${styles.statusPill} ${styles[`status${status}`]}`}>
      {statusLabel(status)}
    </span>
  );
}

function SummaryChip({
  label,
  check,
}: {
  label: string;
  check: SpfCheck | DmarcCheck | DkimCheck;
}) {
  return (
    <div className={`${styles.summaryChip} ${styles[`status${check.status}`]}`}>
      <span>{label}</span>
      <strong>{summaryValue(check)}</strong>
    </div>
  );
}

function CopyButton({
  copyKey,
  copiedKey,
  onCopy,
  value,
}: {
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, copyKey: string) => void;
  value: string;
}) {
  return (
    <button
      type="button"
      className={styles.copyButton}
      onClick={() => onCopy(value, copyKey)}
    >
      {copiedKey === copyKey ? "Copied" : "Copy"}
    </button>
  );
}

function RecordBlock({
  label,
  value,
  emptyMessage = "No record found.",
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string | null | undefined;
  emptyMessage?: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, copyKey: string) => void;
}) {
  const canCopy = typeof value === "string" && value.length > 0;

  return (
    <div className={`${styles.sectionBlock} ${styles.recordBlock}`}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionLabel}>{label}</span>
        {canCopy ? (
          <CopyButton
            copyKey={copyKey}
            copiedKey={copiedKey}
            onCopy={onCopy}
            value={value}
          />
        ) : null}
      </div>
      {canCopy ? (
        <pre>{value}</pre>
      ) : (
        <p className={styles.emptyText}>{emptyMessage}</p>
      )}
    </div>
  );
}

function ParsedList({
  entries,
  copiedKey,
  onCopy,
  copyPrefix,
}: {
  entries: Array<{ label: string; value: string | string[] | null | undefined }>;
  copiedKey: string | null;
  onCopy: (value: string, copyKey: string) => void;
  copyPrefix: string;
}) {
  const visibleEntries = entries.filter(({ value }) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.sectionBlock} ${styles.parsedList}`}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionLabel}>Parsed</span>
      </div>
      <dl>
        {visibleEntries.map(({ label, value }) => {
          const normalizedValue = Array.isArray(value) ? value.join(", ") : value ?? "";

          return (
            <div key={label} className={styles.parsedRow}>
              <dt>{label}</dt>
              <dd>{normalizedValue}</dd>
              <div className={styles.parsedCopy}>
                <CopyButton
                  copyKey={`${copyPrefix}:${label}`}
                  copiedKey={copiedKey}
                  onCopy={onCopy}
                  value={normalizedValue}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function CheckCard({
  title,
  subtitle,
  check,
  parsedEntries,
  emptyRecordMessage,
  copiedKey,
  onCopy,
}: {
  title: string;
  subtitle: string;
  check: SpfCheck | DmarcCheck | DkimCheck;
  parsedEntries?: Array<{ label: string; value: string | string[] | null | undefined }>;
  emptyRecordMessage?: string;
  copiedKey: string | null;
  onCopy: (value: string, copyKey: string) => void;
}) {
  const cardKey = title.toLowerCase();

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleBlock}>
          <h3>{title}</h3>
          <p className={styles.cardSubtitle}>{subtitle}</p>
        </div>
        <StatusPill status={check.status} />
      </div>

      <div className={styles.sectionBlock}>
        <span className={styles.sectionLabel}>Interpretation</span>
        <p className={styles.message}>{check.message}</p>
      </div>

      <RecordBlock
        label="Raw record"
        value={check.record ?? null}
        emptyMessage={emptyRecordMessage}
        copyKey={`${cardKey}:raw`}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      {parsedEntries ? (
        <ParsedList
          entries={parsedEntries}
          copiedKey={copiedKey}
          onCopy={onCopy}
          copyPrefix={`${cardKey}:parsed`}
        />
      ) : null}
    </article>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState} aria-hidden="true">
      <section className={styles.loadingPanel}>
        <div className={styles.loadingLineWide} />
        <div className={styles.loadingLineMedium} />
        <div className={styles.loadingChipRow}>
          <span className={styles.loadingChip} />
          <span className={styles.loadingChip} />
          <span className={styles.loadingChip} />
        </div>
      </section>

      <div className={styles.loadingCards}>
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
      </div>
    </div>
  );
}

export default function Analyzer() {
  const errorId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainQuery = searchParams.get("domain") ?? "";
  const selectorQuery = searchParams.get("selector") ?? "";

  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestedKeyRef = useRef<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const runAnalysisFromUrl = useEffectEvent((domainValue: string, selectorValue: string) => {
    void runAnalysis(domainValue, selectorValue, {
      syncUrl: false,
      smoothScroll: false,
    });
  });

  useEffect(() => {
    if (!domainQuery) {
      return;
    }

    const requestKey = getRequestKey(domainQuery, selectorQuery);
    if (lastRequestedKeyRef.current === requestKey) {
      return;
    }

    setForm({
      domain: domainQuery,
      dkimSelector: selectorQuery,
    });

    runAnalysisFromUrl(domainQuery, selectorQuery);
  }, [domainQuery, selectorQuery]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  function handleCopy(value: string, copyKey: string) {
    if (!navigator.clipboard) {
      setError("Copy to clipboard is not available in this browser.");
      return;
    }

    void navigator.clipboard.writeText(value).then(
      () => {
        setCopiedKey(copyKey);

        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }

        copyTimerRef.current = setTimeout(() => {
          setCopiedKey(null);
        }, 1600);
      },
      () => {
        setError("Copy to clipboard failed.");
      },
    );
  }

  async function runAnalysis(
    domainInput: string,
    selectorInput: string,
    options: RunAnalysisOptions = {},
  ) {
    const normalized = normalizeInputs(domainInput, selectorInput);

    if (!normalized.ok) {
      setError(normalized.error);
      return;
    }

    const normalizedForm = normalized.value;
    const requestKey = getRequestKey(
      normalizedForm.domain,
      normalizedForm.dkimSelector,
    );

    lastRequestedKeyRef.current = requestKey;
    setForm(normalizedForm);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/analyze-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: normalizedForm.domain,
          dkimSelector: normalizedForm.dkimSelector,
        }),
      });

      const payload = (await response.json()) as AnalysisResponse | { error: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "Unable to analyze the domain right now.",
        );
      }

      if ("error" in payload) {
        throw new Error(payload.error);
      }

      startTransition(() => {
        setResult(payload);
        setForm({
          domain: payload.domain,
          dkimSelector: payload.checks.dkim.selector ?? "",
        });
      });

      if (options.syncUrl !== false) {
        const nextSelector = payload.checks.dkim.selector ?? "";
        const nextKey = getRequestKey(payload.domain, nextSelector);
        const targetPath = pathname === "/analyze" ? "/analyze" : "/";

        if (pathname !== targetPath || nextKey !== getRequestKey(domainQuery, selectorQuery)) {
          router.replace(buildSharePath(payload.domain, nextSelector, targetPath), {
            scroll: false,
          });
        }
      }

      if (options.smoothScroll !== false) {
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to analyze the domain right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAnalysis(form.domain, form.dkimSelector);
  }

  function handleDomainBlur() {
    const normalized = normalizeDomainInput(form.domain);

    if (!normalized.ok) {
      return;
    }

    setForm((current) => ({
      ...current,
      domain: normalized.value,
    }));
  }

  function handleSelectorBlur() {
    const normalized = normalizeDkimSelectorInput(form.dkimSelector);

    if (!normalized.ok) {
      return;
    }

    setForm((current) => ({
      ...current,
      dkimSelector: normalized.value,
    }));
  }

  return (
    <section className={styles.section}>
      <div className={styles.formShell}>
        <div className={styles.formHeader}>
          <div className={styles.formIntro}>
            <p className={styles.sectionEyebrow}>Analyzer</p>
            <h2>Run a domain check</h2>
            <p>
              Enter a domain and optionally a DKIM selector. URLs are trimmed
              down to bare domains when possible.
            </p>
          </div>

          <div className={styles.formMeta}>
            <span className={styles.metaChip}>POST /api/analyze-domain</span>
            <span className={styles.metaChip}>TXT lookups only</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={`${styles.field} ${styles.domainField}`}>
            <span>Domain</span>
            <input
              type="text"
              name="domain"
              placeholder="example.com"
              autoComplete="off"
              value={form.domain}
              disabled={loading}
              onBlur={handleDomainBlur}
              onChange={(event) =>
                setForm((current) => ({ ...current, domain: event.target.value }))
              }
            />
          </label>

          <label className={styles.field}>
            <span>DKIM selector (optional)</span>
            <input
              type="text"
              name="dkimSelector"
              placeholder="google"
              autoComplete="off"
              value={form.dkimSelector}
              disabled={loading}
              onBlur={handleSelectorBlur}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dkimSelector: event.target.value,
                }))
              }
            />
          </label>

          <button className={styles.submitButton} type="submit" disabled={loading}>
            <span
              className={`${styles.buttonSpinner} ${loading ? styles.buttonSpinnerActive : ""}`}
              aria-hidden="true"
            />
            <span>{loading ? "Analyzing..." : "Run analysis"}</span>
          </button>

          <div className={styles.formStatus} aria-live="polite">
            {error ? (
              <p id={errorId} className={styles.errorText}>
                {error}
              </p>
            ) : (
              <p className={styles.helper}>
                SPF and DMARC are checked directly. DKIM runs only when you
                provide a selector. Example: <code>example.com</code> with{" "}
                <code>google</code>.
              </p>
            )}
          </div>
        </form>
      </div>

      {loading && !result ? <LoadingState /> : null}

      {result ? (
        <div
          ref={resultsRef}
          className={`${styles.results} ${loading ? styles.resultsRefreshing : ""}`}
        >
          {loading ? <p className={styles.refreshingNotice}>Refreshing results...</p> : null}

          <section className={styles.summaryBanner}>
            <div className={styles.summaryTop}>
              <div>
                <p className={styles.sectionEyebrow}>Results workspace</p>
                <div className={styles.summaryTitleRow}>
                  <h2>{result.domain}</h2>
                  <span
                    className={`${styles.scoreLabel} ${
                      styles[`score${scoreTone(result.summary.scoreLabel)}`]
                    }`}
                  >
                    Overall posture: {result.summary.scoreLabel}
                  </span>
                </div>
              </div>

              <p className={styles.summaryText}>Posture from current DNS TXT records.</p>
            </div>

            <div className={styles.protocolStrip}>
              <SummaryChip label="SPF" check={result.checks.spf} />
              <SummaryChip label="DMARC" check={result.checks.dmarc} />
              <SummaryChip label="DKIM" check={result.checks.dkim} />
            </div>

            <ul className={styles.findingsList}>
              {result.summary.findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </section>

          <div className={styles.cards}>
            <CheckCard
              title="SPF"
              subtitle="Sender Policy Framework"
              check={result.checks.spf}
              copiedKey={copiedKey}
              onCopy={handleCopy}
              parsedEntries={[
                { label: "Version", value: result.checks.spf.parsed?.version },
                { label: "Includes", value: result.checks.spf.parsed?.includes },
                { label: "IPv4", value: result.checks.spf.parsed?.ip4 },
                { label: "IPv6", value: result.checks.spf.parsed?.ip6 },
                { label: "Final all", value: result.checks.spf.parsed?.all },
              ]}
            />

            <CheckCard
              title="DMARC"
              subtitle="Domain-based Message Authentication"
              check={result.checks.dmarc}
              copiedKey={copiedKey}
              onCopy={handleCopy}
              parsedEntries={[
                { label: "Policy", value: result.checks.dmarc.parsed?.p },
                { label: "Aggregate reports", value: result.checks.dmarc.parsed?.rua },
                { label: "Forensic reports", value: result.checks.dmarc.parsed?.ruf },
                { label: "Percent", value: result.checks.dmarc.parsed?.pct },
                { label: "DKIM alignment", value: result.checks.dmarc.parsed?.adkim },
                { label: "SPF alignment", value: result.checks.dmarc.parsed?.aspf },
              ]}
            />

            <CheckCard
              title="DKIM"
              subtitle="DomainKeys Identified Mail"
              check={result.checks.dkim}
              copiedKey={copiedKey}
              onCopy={handleCopy}
              emptyRecordMessage={
                result.checks.dkim.checked
                  ? "No selector-specific TXT record was found."
                  : "No DKIM selector provided."
              }
              parsedEntries={
                result.checks.dkim.checked
                  ? [
                      { label: "Selector", value: result.checks.dkim.selector },
                      { label: "Version", value: result.checks.dkim.parsed?.version },
                    ]
                  : undefined
              }
            />
          </div>

          <section className={styles.recommendations}>
            <div className={styles.recommendationsHeader}>
              <p className={styles.sectionEyebrow}>Recommendations</p>
              <h3>Practical next steps</h3>
            </div>
            <ul className={styles.recommendationList}>
              {result.recommendations.map((recommendation) => {
                const meta = recommendationMeta(recommendation);

                return (
                  <li key={recommendation} className={styles.recommendationItem}>
                    <div className={styles.recommendationTags}>
                      <span className={styles.recommendationTopic}>{meta.topic}</span>
                      <span
                        className={`${styles.recommendationTone} ${
                          styles[`recommendation${meta.tone}`]
                        }`}
                      >
                        {meta.toneLabel}
                      </span>
                    </div>
                    <p>{recommendation}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
