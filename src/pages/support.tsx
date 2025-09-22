import Head from "next/head";

export default function Support() {
  return (
    <>
      <Head>
        <title>HobbyIt Support</title>
        <meta
          name="description"
          content="Get help with HobbyIt: FAQs, contact support, and troubleshooting."
        />
      </Head>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">HobbyIt Support</h1>
        <p className="mt-3 text-neutral-600">
          If you need help with HobbyIt, we’re here for you.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-medium">Contact</h2>
          <ul className="list-disc pl-6">
            <li>
              Email:{" "}
              <a className="text-blue-600 underline" href="mailto:support@thehobbyit.com">
                support@thehobbyit.com
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-medium">Quick Help</h2>
          <ul className="list-disc pl-6">
            <li>Update to the latest version of HobbyIt.</li>
            <li>
              Health permissions: Health app → Profile → Apps → HobbyIt.
            </li>
            <li>
              Notifications: iOS Settings → Notifications → HobbyIt.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-medium">Useful Links</h2>
          <ul className="list-disc pl-6">
            <li>
              <a className="text-blue-600 underline" href="/privacy">
                Privacy Policy
              </a>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
