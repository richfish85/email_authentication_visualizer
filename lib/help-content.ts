import type { CheckStatus, DkimCheck, SpfCheck } from "@/lib/types";

export type HelpItem = {
  title: string;
  tooltip: string;
  what: string;
  why: string;
  how: string;
};

export const HELP_ITEMS = {
  overview: {
    title: "Understanding the results",
    tooltip:
      "See how SPF, DMARC, and DKIM work together to support trusted email.",
    what:
      "SPF, DMARC, and DKIM work together to verify who is allowed to send email for a domain and whether messages can be trusted.",
    why:
      "Looking at one record in isolation misses how policy, sender authorization, and message authenticity reinforce each other.",
    how:
      "This tool focuses on interpreting those records clearly so you can judge spoofing resistance, deliverability posture, and whether the domain is moving from monitoring toward enforcement.",
  },
  spf: {
    title: "SPF",
    tooltip:
      "Defines which servers are allowed to send email for a domain.",
    what:
      "SPF defines which servers are allowed to send email for a domain.",
    why:
      "It helps receiving servers spot messages sent from unauthorized infrastructure.",
    how:
      "SPF is one part of email trust. On its own it is limited, but together with DKIM and DMARC it helps reduce spoofing and improves confidence in domain-level sending.",
  },
  spfInclude: {
    title: "SPF include",
    tooltip:
      "Allows another domain's mail servers to send email on your behalf.",
    what:
      "An SPF include allows another domain's mail servers to send email on your behalf.",
    why:
      "It is how many mail providers and third-party senders are authorized without listing every IP directly.",
    how:
      "Includes extend your sender list, but each one adds trust assumptions, so they should stay intentional and auditable within the wider SPF and DMARC posture.",
  },
  spfIp4: {
    title: "SPF IPv4",
    tooltip:
      "Lists specific IPv4 addresses that are allowed to send email for this domain.",
    what:
      "SPF IPv4 entries list specific IPv4 addresses that are allowed to send email for this domain.",
    why:
      "Direct IP entries show exactly which sending infrastructure is trusted.",
    how:
      "They make sender authorization more explicit, which helps keep the domain's outbound footprint understandable and easier to verify.",
  },
  spfIp6: {
    title: "SPF IPv6",
    tooltip:
      "Lists specific IPv6 addresses that are allowed to send email for this domain.",
    what:
      "SPF IPv6 entries list specific IPv6 addresses that are allowed to send email for this domain.",
    why:
      "They authorize mail sources that send over IPv6 infrastructure.",
    how:
      "Like IPv4 entries, they contribute to a more explicit and inspectable sender policy that supports stronger domain trust.",
  },
  spfAll: {
    title: "SPF all",
    tooltip:
      "Sets the default rule for senders that were not matched earlier in the record.",
    what:
      "The all mechanism is the default rule for senders that were not matched earlier in the SPF record.",
    why:
      "It decides whether unknown senders are treated as acceptable, suspicious, or unauthorized.",
    how:
      "This is where SPF moves from listing trusted senders to expressing an actual security stance, which matters when DMARC interprets SPF outcomes.",
  },
  spfSoftFail: {
    title: "SPF soft fail",
    tooltip:
      "Messages are allowed but may be flagged as suspicious.",
    what:
      "A soft fail means messages from unmatched senders are still allowed, but they may be flagged as suspicious.",
    why:
      "It is safer than allowing everyone, but it still leaves room for spoofed mail to reach recipients.",
    how:
      "Soft fail is often a transition state. It supports monitoring and gradual tightening, but it is weaker than a fully enforced sender policy.",
  },
  spfHardFail: {
    title: "SPF hard fail",
    tooltip:
      "Messages from unauthorized sources should be rejected.",
    what:
      "A hard fail means messages from unauthorized sources should be rejected.",
    why:
      "It gives receivers a clearer signal that unmatched senders are not trusted.",
    how:
      "Hard fail strengthens sender authorization and gives the overall email security posture a firmer base for anti-spoofing decisions.",
  },
  spfMultipleRecords: {
    title: "Multiple SPF records",
    tooltip:
      "Multiple SPF records were found. This is invalid and may cause delivery issues.",
    what:
      "Multiple SPF records were found for the same domain, which is invalid.",
    why:
      "Receivers may not evaluate SPF consistently when more than one SPF record exists, which can cause delivery issues.",
    how:
      "A broken SPF foundation weakens sender trust and makes it harder for DMARC-aligned policy to behave predictably.",
  },
  dmarc: {
    title: "DMARC",
    tooltip:
      "Defines how email receivers should handle messages that fail authentication.",
    what:
      "DMARC tells receiving servers what to do when SPF or DKIM checks fail.",
    why:
      "It turns authentication results into policy, giving domain owners a way to monitor, quarantine, or reject suspicious mail.",
    how:
      "DMARC connects SPF and DKIM into an enforceable strategy. It is usually the clearest signal of whether a domain is only monitoring problems or actively protecting against spoofing.",
  },
  dmarcPolicy: {
    title: "DMARC policy",
    tooltip:
      "Sets the action to take when authentication fails.",
    what:
      "DMARC policy sets the action to take when authentication fails.",
    why:
      "It determines whether failures are only observed, sent to spam, or blocked outright.",
    how:
      "Policy is where authentication becomes operational. It is the clearest indicator of whether the domain is monitoring problems or enforcing protection.",
  },
  dmarcRua: {
    title: "DMARC aggregate reports",
    tooltip:
      "Shows where summary authentication reports are sent.",
    what:
      "DMARC rua specifies where aggregate reports about authentication results are sent.",
    why:
      "Those reports show how receivers are seeing mail that claims to come from the domain.",
    how:
      "Aggregate reporting gives the visibility needed to tune SPF, DKIM, and DMARC before moving toward stricter enforcement.",
  },
  dmarcRuf: {
    title: "DMARC forensic reports",
    tooltip:
      "Shows where detailed failure reports are sent.",
    what:
      "DMARC ruf specifies where detailed failure reports are sent.",
    why:
      "It can provide more granular failure information, though many providers use it sparingly or not at all.",
    how:
      "Forensic reporting can add extra context during troubleshooting, but it is usually a supporting signal rather than the main control plane.",
  },
  dmarcPct: {
    title: "DMARC percent",
    tooltip:
      "Shows what percentage of messages the policy applies to.",
    what:
      "DMARC pct defines the percentage of messages the policy applies to.",
    why:
      "It lets domain owners roll enforcement out gradually instead of switching everything at once.",
    how:
      "Pct controls the pace of adoption, which helps a domain move from observation to enforcement without losing visibility or breaking legitimate traffic.",
  },
  dmarcAlignment: {
    title: "DMARC alignment",
    tooltip:
      "Controls how strictly domains must match between the message and authentication records.",
    what:
      "Alignment controls how strictly the domain must match between the visible message and the authentication records.",
    why:
      "It prevents a message from passing checks with credentials that do not really line up with the domain users see.",
    how:
      "Alignment is what makes SPF and DKIM meaningful for brand trust, because it ties technical authentication back to the domain identity shown to recipients.",
  },
  dkim: {
    title: "DKIM",
    tooltip:
      "Uses cryptographic signatures to verify that an email has not been altered.",
    what:
      "DKIM uses a cryptographic signature to verify that an email was authorized and not modified in transit.",
    why:
      "It provides stronger message-level trust than SPF alone, especially when forwarding or infrastructure changes are involved.",
    how:
      "DKIM supports domain authenticity at the message level. When aligned with DMARC, it becomes a major part of a stronger anti-spoofing posture.",
  },
  dkimSelector: {
    title: "DKIM selector",
    tooltip:
      "A label used to find the correct DKIM key in DNS.",
    what:
      "A DKIM selector is a label used to find the correct DKIM key in DNS.",
    why:
      "Each sender or provider may use different selectors, so the selector determines which public key a receiver should look up.",
    how:
      "Selectors make DKIM scalable across providers and key rotations, but they also mean DKIM cannot be judged honestly without knowing the right lookup path.",
  },
  dkimSelectorRequired: {
    title: "DKIM selector required",
    tooltip:
      "DKIM records are stored per selector and cannot be reliably discovered without one.",
    what:
      "DKIM records are stored per selector, so there is no reliable generic DNS lookup without one.",
    why:
      "A domain can have valid DKIM but still appear empty if the wrong selector is checked or no selector is provided.",
    how:
      "This is why DKIM analysis has to stay selector-aware. It protects the tool from overstating whether message-level trust is really absent.",
  },
  dkimMissing: {
    title: "DKIM missing for selector",
    tooltip:
      "No record was found for this selector. DKIM may still exist under a different selector.",
    what:
      "No DKIM record was found for the selected lookup path.",
    why:
      "That can mean the selector is wrong, the key is missing, or the sender uses a different selector.",
    how:
      "A missing selector lookup weakens message-level trust for this path, but it does not automatically prove the domain has no DKIM at all.",
  },
  dkimFound: {
    title: "DKIM found",
    tooltip:
      "A valid DKIM record was found for this selector.",
    what:
      "A valid DKIM record was found for the selected lookup path.",
    why:
      "It gives receivers a message-level way to verify that the email was signed by an authorized sender and not altered in transit.",
    how:
      "When aligned with DMARC, a valid DKIM record strengthens anti-spoofing posture and helps maintain trust across more complex mail flows.",
  },
  statusPass: {
    title: "Pass status",
    tooltip:
      "Configuration is present and follows expected best practices.",
    what:
      "Pass means the configuration is present and follows expected best practices.",
    why:
      "It signals that the record is doing useful work instead of only existing on paper.",
    how:
      "A pass contributes to a stronger trust chain across sender authorization, message authenticity, and policy enforcement.",
  },
  statusWarning: {
    title: "Warning status",
    tooltip:
      "Configuration exists but may reduce security or reliability.",
    what:
      "Warning means the configuration exists but may reduce security or reliability.",
    why:
      "These are the cases where mail can still work while spoofing resistance or deliverability posture remains weaker than it should be.",
    how:
      "Warnings often mark transitional states, partial enforcement, or ambiguous DNS behavior that keep the domain from a stronger overall posture.",
  },
  statusFail: {
    title: "Fail status",
    tooltip:
      "Configuration is missing or invalid and may cause delivery issues.",
    what:
      "Fail means the configuration is missing or invalid.",
    why:
      "Missing or broken records leave receivers with weaker trust signals and can cause delivery or spoofing problems.",
    how:
      "Fail states usually indicate that a key layer of sender authorization, message authenticity, or policy enforcement is not working correctly.",
  },
  statusInfo: {
    title: "Info status",
    tooltip:
      "Additional context that does not directly affect pass or fail status.",
    what:
      "Info is contextual guidance that does not directly mean pass or fail.",
    why:
      "Some results are explanatory rather than inherently good or bad, such as DKIM not being checked without a selector.",
    how:
      "Info keeps the analysis honest by separating technical limits and workflow notes from actual configuration defects.",
  },
  overallPosture: {
    title: "Overall posture",
    tooltip:
      "A simplified assessment based on SPF, DMARC, and DKIM results.",
    what:
      "Overall posture is a simplified assessment based on SPF, DMARC, and DKIM results.",
    why:
      "It gives a fast read on whether the domain is mostly missing protection, partially configured, or operating with stronger controls.",
    how:
      "The posture summary helps connect individual record findings into one email security picture, centered on trusted sending and spoofing resistance.",
  },
  postureModerate: {
    title: "Moderate posture",
    tooltip:
      "Basic protections are in place, but there is room for improvement.",
    what:
      "Moderate means basic protections are in place, but there is still room for improvement.",
    why:
      "It usually reflects a domain that has some email authentication configured, but not yet at strong enforcement or clean alignment.",
    how:
      "Moderate posture is common during a transition from baseline authentication toward more complete anti-spoofing controls.",
  },
  postureStrong: {
    title: "Strong posture",
    tooltip:
      "Authentication is configured with enforcement and good alignment.",
    what:
      "Strong means authentication is configured with enforcement and good alignment.",
    why:
      "It suggests the domain is not only publishing records, but using them to actively support trust and reject abuse.",
    how:
      "A strong posture usually reflects sender authorization, message-level authenticity, and policy enforcement working together as a coherent control set.",
  },
  postureNeedsAttention: {
    title: "Needs attention posture",
    tooltip:
      "Key protections are missing or misconfigured.",
    what:
      "Needs attention means key protections are missing, invalid, or unresolved.",
    why:
      "Important trust signals are absent or broken, which increases delivery risk and weakens anti-spoofing controls.",
    how:
      "This posture points to gaps in the domain's overall email security story, not just isolated record problems.",
  },
  recommendations: {
    title: "Recommendations",
    tooltip:
      "Suggested next steps based on the current configuration.",
    what:
      "Recommendations are suggested next steps based on the current configuration.",
    why:
      "They turn raw DNS findings into practical actions that improve trust, enforcement, or clarity.",
    how:
      "Recommendations help move the domain from observation toward a more deliberate and reliable email security posture.",
  },
  recommendationReview: {
    title: "Review tag",
    tooltip:
      "Marks something worth checking but not immediately critical.",
    what:
      "Review marks something worth checking but not immediately critical.",
    why:
      "It highlights improvements or ambiguities that deserve attention without implying an outright failure.",
    how:
      "Review items help tighten the domain's configuration over time and reduce weak spots before they become real delivery or spoofing issues.",
  },
  recommendationRecommended: {
    title: "Recommended tag",
    tooltip:
      "Marks a change that improves security or deliverability.",
    what:
      "Recommended marks a change that improves security or deliverability.",
    why:
      "It points to actions that are likely to make the domain's mail authentication more effective or easier to trust.",
    how:
      "Recommended items are the clearest path toward stronger sender trust, better policy enforcement, and more resilient anti-spoofing posture.",
  },
} satisfies Record<string, HelpItem>;

export type HelpItemKey = keyof typeof HELP_ITEMS;

export const DEFAULT_HELP_ITEM_KEY: HelpItemKey = "overview";

export function getStatusHelpKey(status: CheckStatus): HelpItemKey {
  switch (status) {
    case "pass":
      return "statusPass";
    case "warning":
      return "statusWarning";
    case "fail":
      return "statusFail";
    case "info":
      return "statusInfo";
  }
}

export function getPostureHelpKey(scoreLabel: string): HelpItemKey {
  switch (scoreLabel) {
    case "Strong":
      return "postureStrong";
    case "Moderate":
      return "postureModerate";
    case "Needs attention":
      return "postureNeedsAttention";
    default:
      return "overallPosture";
  }
}

export function getSpfLabelHelpKey(check: SpfCheck): HelpItemKey {
  if (check.message.includes("Multiple SPF TXT records")) {
    return "spfMultipleRecords";
  }

  return "spf";
}

export function getSpfAllHelpKey(
  value?: string | null,
  multipleRecords = false,
): HelpItemKey {
  if (multipleRecords) {
    return "spfMultipleRecords";
  }

  const mechanism = value?.toLowerCase();

  if (mechanism === "~all") {
    return "spfSoftFail";
  }

  if (mechanism === "-all") {
    return "spfHardFail";
  }

  return "spfAll";
}

export function getDkimLabelHelpKey(check: DkimCheck): HelpItemKey {
  if (!check.checked) {
    return "dkimSelectorRequired";
  }

  if (check.found) {
    return "dkimFound";
  }

  return "dkimMissing";
}

export function getRecommendationToneHelpKey(toneLabel: string): HelpItemKey {
  if (toneLabel === "Review") {
    return "recommendationReview";
  }

  if (toneLabel === "Recommended") {
    return "recommendationRecommended";
  }

  return "recommendations";
}
