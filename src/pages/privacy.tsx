import Head from "next/head";

export default function Privacy() {
  return (
    <>
      <Head>
        <title>HobbyIt Privacy Policy</title>
        <meta
          name="description"
          content="How HobbyIt handles your data, including Apple Health information."
        />
      </Head>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>Overview</h2>
        <p>
          HobbyIt helps you build healthy routines. We respect your privacy and
          collect only what’s necessary.
        </p>

        <h2>Data We Handle</h2>
        <ul>
          <li>
            <strong>App data you enter</strong> (logs, goals, preferences) is
            stored on your device (SwiftData).
          </li>
          <li>
            <strong>HealthKit</strong>: With permission, we read sleep,
            workouts, body weight, water; we write your chosen logs back to the
            Health app.
          </li>
          <li>
            <strong>Notifications</strong>: Local device notifications if you
            enable reminders.
          </li>
        </ul>

        <h2>HealthKit</h2>
        <ul>
          <li>Only the Health types you grant are accessed.</li>
          <li>Data is used on-device for insights and progress.</li>
          <li>No advertising/data brokerage. No third-party sharing.</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>
          We do not sell your data. We do not share personal or Health data with
          third parties.
        </p>

        <h2>Apple Intelligence / On-Device AI</h2>
        <p>
          When available, HobbyIt uses Apple’s on-device models to generate
          coaching tips. Your data is not sent off device for this purpose.
        </p>

        <h2>Your Choices</h2>
        <ul>
          <li>Manage Health permissions in Health app → Apps → HobbyIt.</li>
          <li>Disable notifications in iOS Settings → Notifications → HobbyIt.</li>
          <li>Delete data by removing the app.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Email <a href="mailto:support@thehobbyit.com">support@thehobbyit.com</a>.
        </p>
      </main>
    </>
  );
}
