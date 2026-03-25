import { z } from 'zod';
import { buildQuery } from '../utils/validate.js';

const DEFAULT_LIMIT = parseInt(process.env.LIST_DEFAULT_LIMIT || '50', 10);

export function registerOfferTools(server, client, wrap) {
  server.tool(
    'list_offers',
    'List product variants (offers) with optional filters.',
    {
      product_id: z.number().int().optional().describe('Filter by parent product ID'),
      sku: z.string().optional().describe('Filter by SKU (partial match)'),
      limit: z.number().int().min(1).max(200).optional().describe('Number of results to return'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    wrap('list_offers', async (p) => {
      const limit = p.limit ?? DEFAULT_LIMIT;
      const page = p.offset ? Math.floor(p.offset / limit) + 1 : 1;
      const qs = buildQuery({
        'filter[product_id]': p.product_id,
        'filter[sku]': p.sku,
        limit,
        page,
      });
      return client.get(`/offers${qs}`);
    })
  );

  server.tool(
    'create_offer',
    'Create one or more new variants for an existing product.',
    {
      product_id: z.number().int().describe('Parent product ID'),
      offers: z.array(
        z.object({
          sku: z.string().optional().describe('Variant SKU'),
          price: z.number().optional().describe('Variant price'),
          properties: z
            .array(z.object({ name: z.string(), value: z.string() }))
            .optional()
            .describe('Array of {name, value} property pairs'),
        })
      ).min(1).describe('Array of offer objects to create'),
    },
    wrap('create_offer', async (p) => {
      return client.post('/offers', { product_id: p.product_id, offers: p.offers });
    })
  );

  server.tool(
    'update_offer',
    'Update fields on one or more existing product variants.',
    {
      offers: z.array(
        z.object({
          id: z.number().int().describe('Offer ID'),
          sku: z.string().optional().describe('New SKU'),
          price: z.number().optional().describe('New price'),
          properties: z
            .array(z.object({ name: z.string(), value: z.string() }))
            .optional()
            .describe('Updated properties'),
        })
      ).min(1).describe('Array of offer update objects'),
    },
    wrap('update_offer', async (p) => {
      const results = await Promise.all(
        p.offers.map(({ id, ...fields }) => {
          const body = {};
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined) body[k] = v;
          }
          return client
            .put(`/offers/${id}`, body)
            .then((r) => ({ id, ok: true, result: r }))
            .catch((e) => ({ id, ok: false, error: e.message }));
        })
      );
      return results;
    })
  );
}
