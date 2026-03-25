import { z } from 'zod';
import { buildQuery } from '../utils/validate.js';

const DEFAULT_LIMIT = parseInt(process.env.LIST_DEFAULT_LIMIT || '50', 10);

export function registerStorageTools(server, client, wrap) {
  server.tool(
    'upload_file',
    'Upload a file to keyCRM Storage from a publicly accessible URL. Returns a file_id.',
    {
      url: z.string().url().describe('Publicly accessible URL of the file to upload'),
      filename: z.string().optional().describe('Optional filename override'),
    },
    wrap('upload_file', async (p) => {
      const body = { url: p.url };
      if (p.filename !== undefined) body.filename = p.filename;
      return client.post('/storage/upload', body);
    })
  );

  server.tool(
    'list_files',
    'List files stored in keyCRM Storage, optionally filtered by attached entity.',
    {
      entity_type: z
        .enum(['order', 'pipelines_card', 'product'])
        .optional()
        .describe('Filter by entity type'),
      entity_id: z.number().int().optional().describe('Filter by entity ID (requires entity_type)'),
      limit: z.number().int().min(1).max(200).optional().describe('Number of results to return'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    wrap('list_files', async (p) => {
      const limit = p.limit ?? DEFAULT_LIMIT;
      const page = p.offset ? Math.floor(p.offset / limit) + 1 : 1;
      const qs = buildQuery({
        'filter[entity_type]': p.entity_type,
        'filter[entity_id]': p.entity_id,
        limit,
        page,
      });
      return client.get(`/storage${qs}`);
    })
  );
}
