/**
 * Server-renders a JSON-LD structured-data block. Use one per schema object to
 * avoid duplicate structured data on a page.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
