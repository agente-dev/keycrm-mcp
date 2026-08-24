import { z } from 'zod';
import { buildQuery, requireAtLeastOne, requireConfirm } from '../utils/validate.js';

const KEYCRM_PAGE_LIMIT = 50;
const MAX_SEARCH_PAGES = 20;
const configuredDefaultLimit = Number.parseInt(process.env.LIST_DEFAULT_LIMIT || '50', 10);
const DEFAULT_LIMIT = Number.isFinite(configuredDefaultLimit)
  ? Math.min(Math.max(configuredDefaultLimit, 1), KEYCRM_PAGE_LIMIT)
  : KEYCRM_PAGE_LIMIT;

function responseRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function responsePagination(response, fallbackPage) {
  const meta = response?.meta && typeof response.meta === 'object' ? response.meta : {};
  const current = Number(
    response?.current_page ?? response?.currentPage ?? meta.current_page ?? meta.currentPage,
  );
  const last = Number(
    response?.last_page ?? response?.lastPage ?? meta.last_page ?? meta.lastPage,
  );

  return {
    currentPage: Number.isFinite(current) && current >= 1 ? current : fallbackPage,
    lastPage: Number.isFinite(last) && last >= 1 ? last : undefined,
  };
}

function flattenSearchValue(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenSearchValue);
  return [];
}

export function customerSearchValues(customer) {
  return [
    customer?.full_name,
    customer?.name,
    customer?.email,
    customer?.phone,
    customer?.phones,
    customer?.emails,
  ].flatMap(flattenSearchValue);
}

export function customerMatchesQuery(customer, query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;

  const values = customerSearchValues(customer);
  if (values.some((value) => value.toLocaleLowerCase().includes(needle))) return true;

  // Phone searches should work across formatting differences, e.g. `+48 123`
  // matching an API value stored as `48123`.
  const queryDigits = query.replace(/\D/g, '');
  return (
    queryDigits.length > 0 &&
    values.some((value) => value.replace(/\D/g, '').includes(queryDigits))
  );
}

function buildSearchResponse(firstResponse, matches, offset, limit, searchTruncated) {
  const data = matches.slice(offset, offset + limit);
  if (Array.isArray(firstResponse)) return data;

  const result = firstResponse && typeof firstResponse === 'object'
    ? { ...firstResponse }
    : {};
  result.data = data;
  result.total = matches.length;
  result.search_truncated = searchTruncated;
  const currentPage = Math.floor(offset / limit) + 1;
  const lastPage = Math.max(1, Math.ceil(matches.length / limit));
  const pagination = {
    current_page: currentPage,
    currentPage,
    last_page: lastPage,
    lastPage,
    per_page: limit,
    perPage: limit,
  };
  for (const [key, value] of Object.entries(pagination)) {
    if (Object.prototype.hasOwnProperty.call(result, key)) result[key] = value;
  }
  if (result.meta && typeof result.meta === 'object') {
    const meta = { ...result.meta, total: matches.length };
    for (const [key, value] of Object.entries(pagination)) {
      if (Object.prototype.hasOwnProperty.call(meta, key)) meta[key] = value;
    }
    result.meta = meta;
  }
  return result;
}

/**
 * Search customers without using `filter[query]`: the live KeyCRM API rejects
 * that parameter. The API's supported page endpoint is bounded to 50 rows, so
 * search scans at most 20 pages (1,000 customers) and reports truncation.
 */
export async function searchCustomers(client, query, limit, offset) {
  const matches = [];
  let firstResponse;
  let page = 1;
  let searchTruncated = false;

  while (page <= MAX_SEARCH_PAGES) {
    const response = await client.get(`/buyer${buildQuery({ limit: KEYCRM_PAGE_LIMIT, page })}`);
    if (firstResponse === undefined) firstResponse = response;

    const rows = responseRows(response);
    matches.push(...rows.filter((customer) => customerMatchesQuery(customer, query)));

    const { currentPage, lastPage } = responsePagination(response, page);
    if (
      (lastPage !== undefined && currentPage >= lastPage) ||
      (lastPage === undefined && rows.length < KEYCRM_PAGE_LIMIT)
    ) {
      break;
    }
    page = currentPage > page ? currentPage + 1 : page + 1;
  }

  if (page > MAX_SEARCH_PAGES) searchTruncated = true;
  return buildSearchResponse(firstResponse, matches, offset, limit, searchTruncated);
}

export function registerCustomerTools(server, client, wrap) {
  server.tool(
    'list_customers',
    'List customers with optional name, email, or phone search. Search is bounded client-side because KeyCRM does not accept filter[query].',
    {
      query: z.string().optional().describe('Search by name, email, or phone'),
      limit: z.number().int().min(1).max(KEYCRM_PAGE_LIMIT).optional().describe('Number of results to return'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    wrap('list_customers', async (p) => {
      const limit = Math.min(p.limit ?? DEFAULT_LIMIT, KEYCRM_PAGE_LIMIT);
      const offset = p.offset ?? 0;
      const query = p.query?.trim();
      if (query) return searchCustomers(client, query, limit, offset);

      const page = Math.floor(offset / limit) + 1;
      const qs = buildQuery({ limit, page });
      return client.get(`/buyer${qs}`);
    })
  );

  server.tool(
    'get_customer',
    'Get a customer profile including full order history.',
    {
      customer_id: z.number().int().describe('keyCRM customer ID'),
    },
    wrap('get_customer', async (p) =>
      client.get(`/buyer/${p.customer_id}?include=company,loyalty,customFields`)
    )
  );

  server.tool(
    'create_customer',
    'Create a new customer (buyer) record in keyCRM.',
    {
      full_name: z.string().describe('Customer full name'),
      email: z.string().email().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      comment: z.string().optional().describe('Internal note'),
    },
    wrap('create_customer', async (p) => {
      const body = { full_name: p.full_name };
      if (p.email !== undefined) body.email = p.email;
      if (p.phone !== undefined) body.phone = p.phone;
      if (p.comment !== undefined) body.comment = p.comment;
      return client.post('/buyer', body);
    })
  );

  server.tool(
    'update_customer',
    'Update an existing customer record.',
    {
      customer_id: z.number().int().describe('keyCRM customer ID'),
      full_name: z.string().optional().describe('Customer full name'),
      email: z.string().email().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      comment: z.string().optional().describe('Internal note'),
    },
    wrap('update_customer', async (p) => {
      const { customer_id, ...fields } = p;
      requireAtLeastOne(fields, ['full_name', 'email', 'phone', 'comment']);
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) body[k] = v;
      }
      return client.put(`/buyer/${customer_id}`, body);
    })
  );

  server.tool(
    'import_customers',
    'Bulk import a list of customer records into keyCRM. Requires confirm: true.',
    {
      customers: z
        .array(
          z.object({
            full_name: z.string().describe('Customer full name'),
            email: z.string().email().optional(),
            phone: z.string().optional(),
          })
        )
        .min(1)
        .describe('Array of customer objects'),
      confirm: z.boolean().describe('Must be true to execute'),
    },
    wrap('import_customers', async (p) => {
      requireConfirm(p, 'import_customers');
      return client.post('/buyer/import', { buyers: p.customers });
    })
  );
}
