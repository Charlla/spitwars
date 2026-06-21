// Renders a JSON-LD <script> in server-rendered HTML so both Google rich
// results and LLM fetchers can read structured facts without executing JS.
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, build-time content — not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
