export type CheckStatus = "pass" | "warning" | "fail" | "info";

export type SpfCheck = {
  found: boolean;
  record: string | null;
  parsed?: {
    version?: string;
    includes?: string[];
    ip4?: string[];
    ip6?: string[];
    all?: string | null;
  };
  message: string;
  status: CheckStatus;
};

export type DmarcCheck = {
  found: boolean;
  record: string | null;
  parsed?: {
    p?: string;
    rua?: string[];
    ruf?: string[];
    pct?: string;
    adkim?: string;
    aspf?: string;
  };
  message: string;
  status: CheckStatus;
};

export type DkimCheck = {
  checked: boolean;
  selector?: string;
  found?: boolean;
  record?: string | null;
  parsed?: {
    version?: string;
  };
  message: string;
  status: CheckStatus;
};

export type AnalysisResponse = {
  domain: string;
  checks: {
    spf: SpfCheck;
    dmarc: DmarcCheck;
    dkim: DkimCheck;
  };
  summary: {
    scoreLabel: string;
    findings: string[];
  };
  recommendations: string[];
};
