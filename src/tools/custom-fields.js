import { z } from 'zod';

export function registerCustomFieldTools(server, client, wrap) {
  server.tool(
    'list_custom_fields',
    'List all custom fields configured in keyCRM with their IDs, names, types, and allowed values.',
    {},
    wrap('list_custom_fields', () => client.get('/custom-fields'))
  );
}
