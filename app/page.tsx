import { Suspense } from "react";

import Analyzer from "@/components/analyzer";

import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.productBar}>
        <div className={styles.brandBlock}>
          <p className={styles.brandLabel}>Project EAV</p>
          <div className={styles.brandRow}>
            <span className={styles.brandTitle}>
              Email Authentication Visualizer
            </span>
            <span className={styles.brandBadge}>MVP</span>
          </div>
        </div>

        <div className={styles.productMeta}>
          <span>DNS TXT</span>
          <span>SPF / DMARC / DKIM</span>
        </div>
      </header>

      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Readable domain checks for email authentication</p>
          <h1>Email Authentication Visualizer</h1>
          <p className={styles.lede}>
            Check SPF, DMARC, and selector-based DKIM records through a focused
            interface built for inspection instead of marketing gloss.
          </p>
        </div>

        <aside className={styles.scopePanel}>
          <div className={styles.scopeHeader}>
            <span className={styles.scopeLabel}>What It Checks</span>
            <span className={styles.scopeBadge}>DNS only</span>
          </div>

          <ul className={styles.scopeList}>
            <li>SPF presence, raw record, and shallow parsing</li>
            <li>DMARC lookup with major policy tags and posture notes</li>
            <li>Selector-aware DKIM checks without pretending discovery is easy</li>
          </ul>

          <p className={styles.scopeNote}>
            DKIM is queried only when a selector is supplied, which keeps the
            output technically honest.
          </p>
        </aside>
      </section>

      <Suspense
        fallback={
          <div className={styles.analyzerFallback}>
            <p>Loading analyzer...</p>
          </div>
        }
      >
        <Analyzer />
      </Suspense>

      <footer className={styles.footer}>
        <p>
          Educational note: this tool helps interpret DNS-based email
          authentication records, but it does not guarantee deliverability or
          security on its own.
        </p>
      </footer>
    </main>
  );
}
