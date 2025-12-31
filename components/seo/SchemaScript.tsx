/**
 * Schema.org JSON-LD Script Component
 *
 * Usage:
 * <SchemaScript schema={generateArticleSchema({...})} />
 */

import { renderSchemaScript } from '@/lib/seo/schema-generator';

interface SchemaScriptProps {
  schema: Parameters<typeof renderSchemaScript>[0];
}

export function SchemaScript({ schema }: SchemaScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: renderSchemaScript(schema),
      }}
    />
  );
}

export default SchemaScript;
