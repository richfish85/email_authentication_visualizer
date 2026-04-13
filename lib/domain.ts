type NormalizedValue =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      error: string;
    };

function extractHost(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const requiresUrlParsing =
    trimmed.includes("://") ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    trimmed.includes(":");

  if (requiresUrlParsing) {
    try {
      const directUrl = new URL(trimmed);
      return directUrl.hostname;
    } catch {
      try {
        const assumedUrl = new URL(`https://${trimmed}`);
        return assumedUrl.hostname;
      } catch {
        return trimmed;
      }
    }
  }

  return trimmed;
}

function isIpv4Address(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function isValidDomain(host: string) {
  if (!host || host.length > 253 || host.includes("..")) {
    return false;
  }

  if (host.endsWith(".")) {
    return isValidDomain(host.slice(0, -1));
  }

  if (!host.includes(".") || isIpv4Address(host)) {
    return false;
  }

  const labels = host.split(".");

  return labels.every((label) => {
    if (!label || label.length > 63) {
      return false;
    }

    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  });
}

export function normalizeDomainInput(input: string): NormalizedValue {
  const host = extractHost(input).replace(/\.$/, "");

  if (!host) {
    return {
      ok: false,
      error: "Enter a domain to analyze.",
    };
  }

  if (host.includes("@")) {
    return {
      ok: false,
      error: "Enter a domain only, not an email address.",
    };
  }

  if (!isValidDomain(host)) {
    return {
      ok: false,
      error:
        "Enter a valid bare domain like example.com. URLs and obvious invalid strings are rejected.",
    };
  }

  return {
    ok: true,
    value: host,
  };
}

export function normalizeDkimSelectorInput(input: string): NormalizedValue {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return {
      ok: true,
      value: "",
    };
  }

  if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)*$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Use a DKIM selector made of letters, numbers, hyphens, underscores, or dots.",
    };
  }

  return {
    ok: true,
    value: trimmed,
  };
}
