import Head from "next/head";

export default function SupportPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <Head>
        <title>Support · HobbyIt</title>
        <meta name="description" content="Get help with HobbyIt. FAQs, contact, and troubleshooting." />
      </Head>

      <main className="wrap">
        <header className="hero">
          <div className="badge">Support</div>
          <h1>We’re here to help</h1>
          <p className="lead">
            Questions about tracking, Health data, or tips? Find answers below or reach us directly.
          </p>
        </header>

        <section className="card">
          <h2>Quick answers</h2>
          <ul className="faq">
            <li>
              <h3>Does HobbyIt use my Health data?</h3>
              <p>
                Only with your permission. You choose what to share. Data stays on your device unless
                you explicitly share it via the Health app.
              </p>
            </li>
            <li>
              <h3>Why don’t I see my workouts/sleep?</h3>
              <p>
                Open iOS Settings → Privacy &amp; Security → Health → Data Access &amp; Devices →
                <strong> HobbyIt</strong>. Ensure the categories you want are enabled. Then reopen the app.
              </p>
            </li>
            <li>
              <h3>How do reminders work?</h3>
              <p>
                Reminders are local notifications. You can enable/disable them per hobby and adjust timing
                in app. If you’re not receiving alerts, check iOS Settings → Notifications → HobbyIt.
              </p>
            </li>
            <li>
              <h3>Meal suggestions seem off—what can I do?</h3>
              <p>
                Try adding preferred ingredients, setting your dietary style, and adjusting targets.
                Suggestions adapt to your inputs over time.
              </p>
            </li>
          </ul>
        </section>

        <section className="grid">
          <div className="card">
            <h2>Contact</h2>
            <p>
              Email us anytime:{" "}
              <a href="mailto:support@thehobbyit.com">support@thehobbyit.com</a>
            </p>
            <p>
              We typically reply within 1–2 business days. Please include device model and iOS version if
              reporting a bug.
            </p>
          </div>

          <div className="card">
            <h2>Status &amp; Updates</h2>
            <p>
              Follow release notes and tips on X:{" "}
              <a href="https://x.com/thehobbyit" target="_blank" rel="noreferrer">
                @thehobbyit
              </a>
            </p>
            <p>
              Feature requests or feedback? We’d love to hear from you.
            </p>
          </div>
        </section>

        <footer className="foot">
          <p>© {year} HobbyIt. All rights reserved.</p>
          <nav>
            <a href="/privacy">Privacy</a>
          </nav>
        </footer>
      </main>

      <style jsx>{`
        :global(html, body) { margin: 0; padding: 0; }
        .wrap {
          min-height: 100vh;
          background:
            radial-gradient(1200px 600px at 100% -10%, rgba(56, 189, 248, 0.08), transparent 60%),
            radial-gradient(1000px 500px at -10% 120%, rgba(99, 102, 241, 0.08), transparent 60%),
            #0b0c10;
          color: #e8eef6;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji;
          padding: 48px 16px 32px;
        }
        .hero {
          max-width: 920px;
          margin: 0 auto 24px;
          text-align: center;
        }
        .badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.2);
          font-size: 12px;
          letter-spacing: 0.04em;
          color: #c7d2fe;
          margin-bottom: 10px;
        }
        h1 {
          margin: 8px 0 8px;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
        }
        .lead {
          max-width: 680px;
          margin: 0 auto;
          color: #b6c2ce;
        }
        .card {
          max-width: 920px;
          margin: 16px auto;
          padding: 20px 22px;
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .grid {
          max-width: 920px;
          margin: 16px auto;
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 840px) {
          .grid { grid-template-columns: 1fr 1fr; }
        }
        h2 { margin: 4px 0 12px; font-size: 18px; }
        .faq { list-style: none; padding: 0; margin: 0; }
        .faq li { padding: 12px 0; border-top: 1px dashed rgba(148, 163, 184, 0.25); }
        .faq li:first-child { border-top: none; }
        h3 { margin: 0 0 6px; font-size: 16px; }
        p { margin: 0; color: #cbd5e1; }
        a { color: #86c5ff; text-decoration: underline; }
        .foot {
          max-width: 920px;
          margin: 24px auto 0;
          padding-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          color: #97a6b3;
          font-size: 14px;
        }
        .foot a { color: #a5b4fc; text-decoration: none; }
        .foot a:hover { text-decoration: underline; }
      `}</style>
    </>
  );
}
