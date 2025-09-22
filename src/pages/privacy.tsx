import Head from "next/head";

export default function PrivacyPage() {
  const updated = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <>
      <Head>
        <title>Privacy Policy · HobbyIt</title>
        <meta name="description" content="HobbyIt privacy policy and Health data practices." />
      </Head>

      <main className="wrap">
        <header className="hero">
          <div className="badge">Privacy</div>
          <h1>Your data. Your choice.</h1>
          <p className="lead">
            HobbyIt is designed to respect your privacy. You control what’s shared, and you can
            revoke access at any time.
          </p>
          <p className="muted">Last updated: {updated}</p>
        </header>

        <article className="card prose">
          <h2>Health data (Apple Health)</h2>
          <p>
            HobbyIt can read workouts, sleep, weight, water, and nutrition, and can write the entries
            you log in the app back to Health—<strong>only</strong> after you grant permission.
          </p>
          <ul>
            <li>Permissions are granular and optional.</li>
            <li>You can change permissions in iOS Settings → Privacy &amp; Security → Health.</li>
            <li>We never sell or share your Health data.</li>
          </ul>

          <h2>On-device intelligence</h2>
          <p>
            When available on your device, Apple Intelligence and on-device models may help summarize
            weekly stats or suggest meals. These features run locally when possible.
          </p>

          <h2>Analytics &amp; logging</h2>
          <p>
            We may collect basic, non-identifying diagnostics (e.g., crashes, anonymized performance)
            to improve app stability. No advertising SDKs.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions or data requests, email{" "}
            <a href="mailto:privacy@thehobbyit.com">privacy@thehobbyit.com</a>.
          </p>
        </article>

        <footer className="foot">
          <p>© {new Date().getFullYear()} HobbyIt. All rights reserved.</p>
          <nav>
            <a href="/support">Support</a>
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
          color: #c7f0ff;
          margin-bottom: 10px;
        }
        h1 {
          margin: 8px 0 8px;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
        }
        .lead {
          max-width: 760px;
          margin: 0 auto;
          color: #b6c2ce;
        }
        .muted { color: #9fb0bd; margin-top: 8px; }
        .card {
          max-width: 920px;
          margin: 16px auto;
          padding: 22px 24px;
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .prose h2 { margin: 8px 0 8px; font-size: 18px; }
        .prose p { color: #cbd5e1; }
        .prose ul { margin: 8px 0 0 18px; color: #cbd5e1; }
        a { color: #86c5ff; }
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
