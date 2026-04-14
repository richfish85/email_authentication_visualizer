"use client";

import { HELP_ITEMS, type HelpItemKey } from "@/lib/help-content";

import { useHelpContext } from "./help-context";
import styles from "./help-tooltip.module.css";

type HelpTooltipProps = {
  itemKey: HelpItemKey;
  label: string;
  align?: "start" | "end";
  side?: "top" | "bottom";
};

export default function HelpTooltip({
  itemKey,
  label,
  align = "start",
  side = "top",
}: HelpTooltipProps) {
  const { preview, clearPreview, pin } = useHelpContext();
  const item = HELP_ITEMS[itemKey];

  return (
    <span className={styles.anchor} data-align={align} data-side={side}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`More information about ${label}`}
        onMouseEnter={() => preview(itemKey)}
        onMouseLeave={clearPreview}
        onFocus={() => preview(itemKey)}
        onBlur={clearPreview}
        onClick={() => pin(itemKey)}
      >
        i
      </button>
      <span role="tooltip" className={styles.tooltip}>
        {item.tooltip}
      </span>
    </span>
  );
}
