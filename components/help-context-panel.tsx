"use client";

import { useEffect, useRef } from "react";

import { HELP_ITEMS } from "@/lib/help-content";

import { useHelpContext } from "./help-context";
import styles from "./help-context-panel.module.css";

export default function HelpContextPanel() {
  const { activeKey, isOpen, togglePanel } = useHelpContext();
  const item = HELP_ITEMS[activeKey];
  const panelRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!isOpen || typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 920px)").matches) {
      return;
    }

    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeKey, isOpen]);

  return (
    <section ref={panelRef} className={styles.panel} data-open={isOpen}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Context Panel</p>
          <h3>Understanding the results</h3>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={togglePanel}
          aria-expanded={isOpen}
          aria-controls="help-context-body"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen ? (
        <div id="help-context-body" className={styles.body}>
          <div className={styles.selected}>
            <span className={styles.selectedLabel}>Selected item</span>
            <h4>{item.title}</h4>
            <p>{item.tooltip}</p>
          </div>

          <div className={styles.explanationList}>
            <section className={styles.explanationBlock}>
              <h5>What it is</h5>
              <p>{item.what}</p>
            </section>

            <section className={styles.explanationBlock}>
              <h5>Why it matters</h5>
              <p>{item.why}</p>
            </section>

            <section className={styles.explanationBlock}>
              <h5>How it fits email security</h5>
              <p>{item.how}</p>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
