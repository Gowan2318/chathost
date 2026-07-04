import Script from "next/script";

export const metadata = {
  title: "Widget Test | VestaChatHost",
  description: "Fake client website for testing the embeddable chatbot widget.",
};

export default function TestWidgetPage() {
  return (
    <main className="min-h-screen bg-white px-8 py-16 text-gray-900">
      <h1 className="text-3xl font-bold">This is a fake client website</h1>
      <p className="mt-4 text-lg text-gray-600">
        The chatbot should appear in the bottom right corner!
      </p>

      <Script
        id="vestachathost-widget"
        src="http://localhost:3000/widget.js?id=1c2e7dae-e44b-4864-8af5-1afe483f61cf"
        strategy="afterInteractive"
      />
    </main>
  );
}
