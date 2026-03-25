import { z } from 'zod';

export function registerWarehouseTools(server, client, wrap) {
  server.tool(
    'list_warehouses',
    'List all warehouses configured in keyCRM with their IDs, names, and addresses.',
    {},
    wrap('list_warehouses', () => client.get('/warehouses'))
  );
}
