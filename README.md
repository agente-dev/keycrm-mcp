# keycrm-mcp

> A Model Context Protocol (MCP) server for [keyCRM](https://keycrm.app) — lets Claude manage your keyCRM catalogue, stock, orders, customers, pipelines, and more via natural language.

**Original author:** Ivan Klymenko
**Maintainer:** agente.dev
**License:** Owner decision required (see [License status](#license-status))
**Node.js:** 23.6+
**MCP SDK:** `@modelcontextprotocol/sdk`

This repository is the maintained `agente-dev/keycrm-mcp` fork of the source
project at [`IvanKlymenko/keycrm-mcp`](https://github.com/IvanKlymenko/keycrm-mcp).
The package name and MCP server identity remain `keycrm-mcp`.

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [Configuration](#4-configuration)
5. [MCP Client Setup](#5-mcp-client-setup)
6. [Tool Reference](#6-tool-reference)
   - 6.1 [Products](#61-products)
   - 6.2 [Product Variants (Offers)](#62-product-variants-offers)
   - 6.3 [Product Categories](#63-product-categories)
   - 6.4 [Stock](#64-stock)
   - 6.5 [Orders](#65-orders)
   - 6.6 [Order Reference Data](#66-order-reference-data)
   - 6.7 [Payments](#67-payments)
   - 6.8 [Customers](#68-customers)
   - 6.9 [Pipelines](#69-pipelines)
   - 6.10 [Storage](#610-storage)
   - 6.11 [Custom Fields](#611-custom-fields)
7. [Error Handling](#7-error-handling)
8. [Logging](#8-logging)
9. [Project Structure](#9-project-structure)
10. [Implementation Notes](#10-implementation-notes)
11. [Contributing](#11-contributing)

---

## 1. What This Is

`keycrm-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that wraps the [keyCRM REST API](https://docs.keycrm.app). It exposes Claude-callable tools for managing products, variants, stock, orders, customers, pipelines, payments, files, and more in keyCRM.

Once configured, you can ask Claude things like:

- *"Show me all draft products in the Shirts category"*
- *"Update the price of SKU MNL-SRT-WHT-L to 890"*
- *"What is the current stock level for SKU ABC-123?"*
- *"List all orders placed today that are still pending"*
- *"Publish all draft products in the Jackets category"* (with preview + confirmation)
- *"Replace the photo on product ID 42 with this image URL"*
- *"Create a new order for buyer 99 with two items"*
- *"Show me all cards in the Sales pipeline"*

The server runs as a local Node.js process and communicates with your MCP client (Claude Desktop or Claude Code) over stdio.

---

## 2. Requirements

| Requirement | Version |
|---|---|
| Node.js | 23.6+ |
| npm | 10+ |
| keyCRM account | Any plan |
| keyCRM API key | Required |

---

## 3. Installation

### 3.1 Clone the repository

```bash
git clone https://github.com/agente-dev/keycrm-mcp.git
cd keycrm-mcp
```

### 3.2 Install dependencies

```bash
npm install
```

### 3.3 Create environment file

```bash
cp .env.example .env
```

Edit `.env` with your values — see [Section 4](#4-configuration).

### 3.4 Verify the server starts

```bash
node index.js
```

The server starts in stdio mode and waits for MCP client input. No output means it is working correctly — it only speaks when addressed by a client.

---

## 4. Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and fill in the values.

### .env.example

```env
# ─── Required ────────────────────────────────────────────────
# Your keyCRM API key
# Found at: Налаштування → Інтеграції → API
KEYCRM_API_KEY=your_api_key_here

# ─── Optional ────────────────────────────────────────────────
# keyCRM API base URL — only change if keyCRM updates their API endpoint
KEYCRM_API_URL=https://openapi.keycrm.app/v1

# Maximum number of results returned by list tools (default: 50)
LIST_DEFAULT_LIMIT=50

# Log level: error | warn | info | debug (default: info)
LOG_LEVEL=info

# Path to the log file (default: ./logs/keycrm-mcp.log)
LOG_FILE=./logs/keycrm-mcp.log
```

### Configuration reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `KEYCRM_API_KEY` | ✅ | — | keyCRM API key |
| `KEYCRM_API_URL` | ❌ | `https://openapi.keycrm.app/v1` | keyCRM API base URL |
| `LIST_DEFAULT_LIMIT` | ❌ | `50` | Default page size for list tools |
| `LOG_LEVEL` | ❌ | `info` | Log verbosity |
| `LOG_FILE` | ❌ | `./logs/keycrm-mcp.log` | Log file path |

---

## 5. MCP Client Setup

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "keycrm": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/keycrm-mcp/index.js"],
      "env": {
        "KEYCRM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving the config. The keyCRM tools will appear in the tool list automatically.

### Claude Code

```bash
claude mcp add keycrm node /absolute/path/to/keycrm-mcp/index.js
```

Then set the environment variable:

```bash
claude mcp env set keycrm KEYCRM_API_KEY your_api_key_here
```

### Running with PM2 (server / VPS)

If you are running the MCP server on a VPS and connecting remotely:

```bash
npm install -g pm2
pm2 start index.js --name keycrm-mcp
pm2 save
pm2 startup
```

---

## 6. Tool Reference

### 6.1 Products

---

#### `list_products`

List products from the keyCRM catalogue with optional filters.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category_id` | number | ❌ | Filter by category ID |
| `status` | string | ❌ | Filter by status: `draft`, `published`, `archived` |
| `query` | string | ❌ | Search by product name |
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `get_product`

Get full details for a single product including all variants and stock levels per warehouse.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |

---

#### `create_product`

Create a new product in the keyCRM catalogue.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Product name |
| `category_id` | number | ❌ | Category ID |
| `description` | string | ❌ | Product description |
| `price` | number | ❌ | Base price |
| `sku` | string | ❌ | Product SKU |
| `status` | string | ❌ | Initial status: `draft` (default) or `published` |

---

#### `update_product`

Update one or more fields on an existing product. Does not change product status — use `publish_product`, `unpublish_product`, or `archive_product` for status changes.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |
| `name` | string | ❌ | Product name |
| `description` | string | ❌ | Product description |
| `price` | number | ❌ | Product price |
| `category_id` | number | ❌ | Category ID |
| `sku` | string | ❌ | Product SKU |

At least one optional field must be provided.

---

#### `publish_product`

Change a product's status from `draft` to `published`. Makes the product visible on the storefront.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |

---

#### `unpublish_product`

Change a product's status from `published` back to `draft`. Hides the product from the storefront without deleting it.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |

---

#### `archive_product`

Archive a product. Archived products are hidden from the storefront but fully preserved in keyCRM and can be unarchived at any time. No confirmation required — this operation is reversible.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |

---

#### `update_product_photo`

Replace or add a photo on an existing product. Accepts a publicly accessible image URL. Internally, the file is uploaded to keyCRM Storage first (`POST /storage/upload`), then attached to the product — this is handled automatically by the server.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | keyCRM product ID |
| `photo_url` | string | ✅ | Publicly accessible URL of the new photo |
| `replace_existing` | boolean | ❌ | If `true`, replaces all existing photos. If `false`, adds alongside existing ones (default: `false`) |

---

#### `bulk_update_products`

Apply a field update to multiple products matching a filter. Always call with `dry_run: true` first to preview affected products, then call again with `dry_run: false` and `confirm: true` to execute.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filter` | object | ✅ | Filter defining which products to update |
| `filter.category_id` | number | ❌ | Match products in this category |
| `filter.status` | string | ❌ | Match products with this status |
| `filter.query` | string | ❌ | Match products whose name contains this string |
| `update` | object | ✅ | Fields to update and their new values (same fields as `update_product`) |
| `dry_run` | boolean | ✅ | If `true`, returns preview without making changes |
| `confirm` | boolean | ❌ | Must be `true` to execute when `dry_run` is `false` |

**Two-step flow:**
1. Call with `dry_run: true` → returns list of affected products
2. Review the list, then call again with `dry_run: false, confirm: true` → executes the update

---

### 6.2 Product Variants (Offers)

In keyCRM, product variants (combinations of size, color, etc.) are called **offers**. Each offer has its own SKU, price, and stock level.

---

#### `list_offers`

List product variants with optional filters.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ❌ | Filter offers by parent product ID |
| `sku` | string | ❌ | Filter by SKU (partial match) |
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `create_offer`

Create one or more new variants for an existing product.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | ✅ | Parent product ID |
| `offers` | array | ✅ | Array of offer objects to create |
| `offers[].sku` | string | ❌ | Variant SKU |
| `offers[].price` | number | ❌ | Variant price |
| `offers[].properties` | array | ❌ | Array of `{name, value}` pairs (e.g. `{name: "Розмір", value: "M"}`) |

---

#### `update_offer`

Update fields on one or more existing product variants.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `offers` | array | ✅ | Array of offer update objects |
| `offers[].id` | number | ✅ | Offer ID |
| `offers[].sku` | string | ❌ | New SKU |
| `offers[].price` | number | ❌ | New price |
| `offers[].properties` | array | ❌ | Updated properties |

---

### 6.3 Product Categories

---

#### `list_categories`

List all product categories.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `create_category`

Create a new product category.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Category name |
| `parent_id` | number | ❌ | Parent category ID for nested categories |

---

### 6.4 Stock

---

#### `get_stock`

Get stock levels for a specific SKU across all warehouses, or for a single warehouse.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sku` | string | ✅ | Product variant SKU |
| `warehouse_id` | number | ❌ | If provided, returns stock for this warehouse only |

---

#### `adjust_stock`

Manually adjust the stock level for a SKU in a specific warehouse. Sets an absolute quantity — not a delta.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sku` | string | ✅ | Product variant SKU |
| `warehouse_id` | number | ✅ | Warehouse to adjust stock in |
| `quantity` | number | ✅ | New absolute stock quantity |
| `reason` | string | ❌ | Optional note explaining the adjustment |

---

### 6.5 Orders

---

#### `list_orders`

List orders with optional filters.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status_id` | number | ❌ | Filter by order status ID (use `list_order_statuses` to get IDs) |
| `date_from` | string | ❌ | Filter orders created from this date (ISO 8601: `YYYY-MM-DD`) |
| `date_to` | string | ❌ | Filter orders created up to this date (ISO 8601: `YYYY-MM-DD`) |
| `source_id` | number | ❌ | Filter by source ID (use `list_sources` to get IDs) |
| `warehouse_id` | number | ❌ | Filter by fulfillment warehouse |
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `get_order`

Get full details for a single order including line items, customer, payments, tags, and status history.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |

---

#### `create_order`

Create a new order in keyCRM. Requires explicit confirmation.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `buyer_id` | number | ❌ | Existing buyer ID |
| `buyer_comment` | string | ❌ | Comment from the buyer |
| `manager_comment` | string | ❌ | Internal manager comment |
| `source_id` | number | ❌ | Source ID (use `list_sources` to get IDs) |
| `status_id` | number | ❌ | Initial status ID (use `list_order_statuses` to get IDs) |
| `payment_method_id` | number | ❌ | Payment method ID (use `list_payment_methods` to get IDs) |
| `warehouse_id` | number | ❌ | Fulfillment warehouse ID |
| `products` | array | ✅ | Array of line item objects |
| `products[].offer_id` | number | ✅ | Offer (variant) ID |
| `products[].quantity` | number | ✅ | Quantity |
| `products[].price` | number | ❌ | Sale price (overrides catalogue price) |
| `shipping` | object | ❌ | Shipping details (delivery service, address, TTN, etc.) |
| `confirm` | boolean | ✅ | Must be `true` to execute |

---

#### `update_order`

Update fields on an existing order.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |
| `manager_comment` | string | ❌ | Internal manager comment |
| `buyer_comment` | string | ❌ | Buyer comment |
| `shipping` | object | ❌ | Updated shipping details |
| `payment_method_id` | number | ❌ | Payment method ID |

At least one optional field must be provided.

---

#### `update_order_status`

Update the status of an order.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |
| `status_id` | number | ✅ | New status ID (use `list_order_statuses` to get IDs) |
| `note` | string | ❌ | Optional internal note |

---

#### `add_order_payment`

Record a payment against an existing order.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |
| `amount` | number | ✅ | Payment amount |
| `payment_method_id` | number | ❌ | Payment method ID (use `list_payment_methods` to get IDs) |
| `description` | string | ❌ | Optional payment note |

---

#### `add_order_tag`

Attach a tag to an existing order.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |
| `tag_id` | number | ✅ | Tag ID (use `list_tags` to get IDs) |

---

#### `remove_order_tag`

Remove a tag from an existing order.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `order_id` | number | ✅ | keyCRM order ID |
| `tag_id` | number | ✅ | Tag ID |

---

### 6.6 Order Reference Data

These tools return the lookup data needed to build valid order requests. Call them to get correct IDs before creating or updating orders.

---

#### `list_order_statuses`

List all available order statuses with their IDs and names.

**Input parameters:** None

---

#### `list_payment_methods`

List all available payment methods with their IDs and names.

**Input parameters:** None

---

#### `list_sources`

List all available order sources (e.g. WooCommerce, POS, Telegram) with their IDs and names.

**Input parameters:** None

---

#### `list_tags`

List all available order tags with their IDs and names.

**Input parameters:** None

---

#### `list_delivery_services`

List all available delivery services with their IDs and names.

**Input parameters:** None

---

### 6.7 Payments

---

#### `list_external_transactions`

List external payment transactions recorded in keyCRM (e.g. from Monobank or other payment providers).

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `attach_external_transaction`

Attach an external transaction to an existing payment record in keyCRM. Used to link a bank transaction to a keyCRM order payment.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `payment_id` | number | ✅ | keyCRM payment ID |
| `transaction_id` | string | ✅ | External transaction identifier (e.g. from Monobank) |
| `amount` | number | ✅ | Transaction amount |
| `description` | string | ❌ | Optional description |

---

### 6.8 Customers

---

#### `list_customers`

List customers with optional name, email, or phone search. KeyCRM does not accept
the `filter[query]` parameter, so searches scan supported `/buyer` pages
client-side, up to 20 pages of 50 rows. A bounded search returns
`search_truncated: true` when the API does not provide enough pagination
metadata to prove that all customers were scanned.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | ❌ | Search by name, email, or phone |
| `limit` | number | ❌ | Number of results to return (maximum 50; default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `get_customer`

Get a customer profile including full order history.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `customer_id` | number | ✅ | keyCRM customer ID |

---

#### `create_customer`

Create a new customer (buyer) record in keyCRM.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `full_name` | string | ✅ | Customer full name |
| `email` | string | ❌ | Email address |
| `phone` | string | ❌ | Phone number |
| `comment` | string | ❌ | Internal note |

---

#### `update_customer`

Update an existing customer record.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `customer_id` | number | ✅ | keyCRM customer ID |
| `full_name` | string | ❌ | Customer full name |
| `email` | string | ❌ | Email address |
| `phone` | string | ❌ | Phone number |
| `comment` | string | ❌ | Internal note |

At least one optional field must be provided.

---

#### `import_customers`

Bulk import a list of customer records into keyCRM. Requires explicit confirmation.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `customers` | array | ✅ | Array of customer objects |
| `customers[].full_name` | string | ✅ | Customer full name |
| `customers[].email` | string | ❌ | Email address |
| `customers[].phone` | string | ❌ | Phone number |
| `confirm` | boolean | ✅ | Must be `true` to execute |

---

### 6.9 Pipelines

Pipelines are keyCRM's sales funnel and lead management feature. Each pipeline contains cards (leads or deals) that move through defined stages.

---

#### `list_pipelines`

List all pipelines with their IDs and names.

**Input parameters:** None

---

#### `list_pipeline_statuses`

List all stages for a specific pipeline with their IDs and names.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pipeline_id` | number | ✅ | Pipeline ID |

---

#### `list_pipeline_cards`

List cards across pipelines with optional filters.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pipeline_id` | number | ❌ | Filter by pipeline ID |
| `status_id` | number | ❌ | Filter by pipeline stage ID |
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

#### `get_pipeline_card`

Get full details for a single pipeline card including contact, products, payments, and status.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `card_id` | number | ✅ | Pipeline card ID |

---

#### `create_pipeline_card`

Create a new card in a pipeline.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pipeline_id` | number | ✅ | Pipeline ID |
| `status_id` | number | ✅ | Initial stage ID (use `list_pipeline_statuses` to get IDs) |
| `title` | string | ❌ | Card title |
| `contact` | object | ❌ | Contact details (`full_name`, `email`, `phone`) |
| `products` | array | ❌ | Array of product line items |
| `manager_comment` | string | ❌ | Internal note |

---

#### `update_pipeline_card`

Update an existing pipeline card (move stage, update contact, add notes, etc.).

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `card_id` | number | ✅ | Pipeline card ID |
| `status_id` | number | ❌ | New stage ID |
| `title` | string | ❌ | Updated title |
| `manager_comment` | string | ❌ | Updated internal note |
| `contact` | object | ❌ | Updated contact details (`full_name`, `email`, `phone`) |

At least one optional field must be provided.

---

### 6.10 Storage

---

#### `upload_file`

Upload a file to keyCRM Storage from a publicly accessible URL. Returns a `file_id` that can be used to attach the file to orders, pipeline cards, or products.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✅ | Publicly accessible URL of the file to upload |
| `filename` | string | ❌ | Optional filename override |

---

#### `list_files`

List files stored in keyCRM Storage, optionally filtered by the entity they are attached to.

**Input parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_type` | string | ❌ | Filter by entity type: `order`, `pipelines_card`, `product` |
| `entity_id` | number | ❌ | Filter by entity ID (requires `entity_type`) |
| `limit` | number | ❌ | Number of results to return (default: `LIST_DEFAULT_LIMIT`) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

---

### 6.11 Custom Fields

---

#### `list_custom_fields`

List all custom fields configured in keyCRM with their IDs, names, types, and allowed values.

**Input parameters:** None

---

## 7. Error Handling

All keyCRM API errors are caught and returned to Claude as structured error messages — they are never thrown as unhandled exceptions.

### Error response shape

```json
{
  "error": true,
  "code": "KEYCRM_API_ERROR",
  "status": 404,
  "message": "Product not found",
  "detail": "No product with ID 9999 exists in keyCRM"
}
```

### Error codes

| Code | Description |
|---|---|
| `KEYCRM_API_ERROR` | keyCRM returned a non-2xx response |
| `KEYCRM_AUTH_ERROR` | API key is invalid or missing |
| `KEYCRM_RATE_LIMIT` | Rate limit hit — request will be retried |
| `KEYCRM_TIMEOUT` | Request timed out |
| `VALIDATION_ERROR` | Tool input failed validation before the API was called |
| `INTERNAL_ERROR` | Unexpected server error |

### Rate limiting

The keyCRM API enforces a limit of **60 requests per minute per IP address per API key**. The server handles HTTP 429 responses automatically with exponential backoff:

- First retry: 1 second
- Second retry: 2 seconds
- Third retry: 4 seconds
- After 3 retries: returns a `KEYCRM_RATE_LIMIT` error to Claude

### Timezone

All timestamps in the keyCRM API use **UTC (GMT+0)** — for reads, filters, and writes. The server does not perform timezone conversion. Pass and expect UTC values in all date/time fields.

---

## 8. Logging

Tool calls and API interactions are logged to a local file for debugging. Input
parameters are intentionally omitted so customer names, email addresses, phone
numbers, and other request data do not enter the log.

### Log format

```
[2026-03-25T14:32:01.123Z] [INFO]  tool_call: list_products | duration: 312ms | status: ok
[2026-03-25T14:32:05.456Z] [ERROR] tool_call: get_product | duration: 201ms | status: error | code: KEYCRM_API_ERROR | message: Product not found
```

### Log location

Default: `./logs/keycrm-mcp.log`

Override with the `LOG_FILE` environment variable.

Logs are appended — no automatic rotation is implemented. Use `logrotate` on Linux/VPS deployments or clear manually as needed.

---

## 9. Project Structure

```
keycrm-mcp/
├── index.js                  # Entry point — starts the MCP server
├── .env.example              # Environment variable template
├── .env                      # Your local config (not committed)
├── package.json
├── src/
│   ├── server.js             # MCP server setup and tool registration
│   ├── tools/
│   │   ├── products.js       # list_products, get_product, create_product,
│   │   │                     # update_product, publish_product, unpublish_product,
│   │   │                     # archive_product, update_product_photo,
│   │   │                     # bulk_update_products
│   │   ├── offers.js         # list_offers, create_offer, update_offer
│   │   ├── categories.js     # list_categories, create_category
│   │   ├── stock.js          # get_stock, adjust_stock
│   │   ├── orders.js         # list_orders, get_order, create_order,
│   │   │                     # update_order, update_order_status,
│   │   │                     # add_order_payment, add_order_tag,
│   │   │                     # remove_order_tag
│   │   ├── order-reference.js # list_order_statuses, list_payment_methods,
│   │   │                     # list_sources, list_tags, list_delivery_services
│   │   ├── payments.js       # list_external_transactions,
│   │   │                     # attach_external_transaction
│   │   ├── customers.js      # list_customers, get_customer, create_customer,
│   │   │                     # update_customer, import_customers
│   │   ├── pipelines.js      # list_pipelines, list_pipeline_statuses,
│   │   │                     # list_pipeline_cards, get_pipeline_card,
│   │   │                     # create_pipeline_card, update_pipeline_card
│   │   ├── storage.js        # upload_file, list_files
│   │   ├── custom-fields.js  # list_custom_fields
│   ├── keycrm/
│   │   ├── client.js         # keyCRM REST API client (fetch wrapper, auth, retry)
│   │   └── errors.js         # Error normalisation
│   └── utils/
│       ├── logger.js         # File logger
│       └── validate.js       # Input validation helpers
└── logs/                    # Runtime logs (ignored by git)
```

---

## 10. Implementation Notes

### MCP SDK

This server is built with the official Anthropic MCP SDK:

```bash
npm install @modelcontextprotocol/sdk
```

Tools are registered using the SDK's `server.tool()` method. Input schemas are defined using [Zod](https://zod.dev) for runtime validation.

### Transport

The server uses `StdioServerTransport` from the MCP SDK:

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'keycrm-mcp', version: '1.0.0' });
const transport = new StdioServerTransport();
await server.connect(transport);
```

### keyCRM API client

All keyCRM API calls go through a single client module (`src/keycrm/client.js`) that handles:

- Base URL and API key injection from environment variables
- Bearer token authentication (`Authorization: Bearer YOUR_KEY`)
- JSON request/response serialisation
- HTTP error normalisation
- Rate limit retry with exponential backoff (max 3 retries)
- Request timeout (default: 10 seconds)

### `update_product_photo` — Storage API flow

This tool performs two sequential API calls internally:

1. `POST /storage/upload` — uploads the image from the provided URL to keyCRM Storage, returns a `file_id`
2. `PUT /products/{productId}` — attaches the `file_id` to the product, optionally replacing existing photos

If the upload succeeds but the attach fails, the error is returned with the `file_id` included so the attach can be retried manually if needed.

### `bulk_update_products` dry-run flow

Two-phase call on the same tool:

1. **Phase 1** (`dry_run: true`): Fetches matching products using the provided filter, returns the list without modifying anything
2. **Phase 2** (`dry_run: false, confirm: true`): Executes the update on all matching products

If `dry_run: false` is passed without `confirm: true`, the tool returns a `VALIDATION_ERROR` — it will not execute without explicit confirmation.

### ESM

The project uses ES modules (`"type": "module"` in `package.json`). All imports use ESM syntax.

---

## 11. Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the public contribution and
maintenance workflow. Before proposing a connector change, verify the live
KeyCRM endpoint and add a focused test at the affected tool boundary.

## License status

The package manifest currently declares `ISC`, while historical README text
claimed `MIT`; this repository has no `LICENSE` file. That conflict is an
explicit owner decision, not a conclusion this repository can make. Until an
owner selects one authoritative license and adds the matching license file,
the public-maintenance readiness gate remains open and this README makes no
license grant.

---

*keycrm-mcp · maintained by agente.dev; original project by Ivan Klymenko*
