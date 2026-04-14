"use client";

import Analyzer from "@/components/analyzer";

import { HelpContextProvider } from "./help-context";
import HelpContextPanel from "./help-context-panel";
import styles from "./analyzer-workspace.module.css";

export default function AnalyzerWorkspace() {
  return (
    <HelpContextProvider>
      <section className={styles.workspace}>
        <div className={styles.main}>
          <Analyzer />
        </div>
        <aside className={styles.rail}>
          <HelpContextPanel />
        </aside>
      </section>
    </HelpContextProvider>
  );
}
