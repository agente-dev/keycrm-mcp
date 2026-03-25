import { z } from 'zod';
import { buildQuery } from '../utils/validate.js';

const DEFAULT_LIMIT = parseInt(process.env.LIST_DEFAULT_LIMIT || '50', 10);

export function registerCategoryTools(server, client, wrap) {
  server.tool(
    'list_categories',
    'List all product categories.',
    {
      limit: z.number().int().min(1).max(200).optional().describe('Number of results to return'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    wrap('list_categories', async (p) => {
      const limit = p.limit ?? DEFAULT_LIMIT;
      const page = p.offset ? Math.floor(p.offset / limit) + 1 : 1;
      return client.get(`/products/categories${buildQuery({ limit, page })}`);
    })
  );

  server.tool(
    'create_category',
    'Create a new product category.',
    {
      name: z.string().describe('Category name'),
      parent_id: z.number().int().optional().describe('Parent category ID for nested categories'),
    },
    wrap('create_category', async (p) => {
      const body = { name: p.name };
      if (p.parent_id !== undefined) body.parent_id = p.parent_id;
      return client.post('/products/categories', body);
    })
  );
}
