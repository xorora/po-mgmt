# Purchase Order Management

A system for managing purchase orders from customer orders through vendor procurement, assembly, and fulfillment.

## Overview

We receive product orders from customers. Each order lists products and required quantities. Because we manufacture and assemble these products, we must first procure the parts needed to build them from various vendors.

```
Vendors → supply → Parts → make → Products → create → Purchase Order
```

## Flow

1. **Customer order** — A customer order is created in the system with the requested products and quantities.
2. **Vendor POs** — Based on the customer order, purchase orders are generated for the vendors that supply the parts required to make those products.
3. **Inventory check** — Part stock is tracked so POs are not created unnecessarily when inventory is sufficient.
4. **Vendor PO editing** — Vendor POs can be edited to add or remove parts as needed.
5. **Versioning** — Each vendor PO is version-controlled. The first version is auto-created from the customer order; subsequent changes create a new version. Each version is a separate PDF that can be viewed and downloaded.
6. **Delivery** — Once a vendor PO is marked as delivered and part requirements are satisfied, the customer PO is created.
7. **Customer PO** — The customer PO is created with validation checks when the order is ready. If required parts are unavailable, creation is blocked unless the user overrides the check.

## Features

- **CRUD** for vendors, parts, and products
- **Editable vendor POs** — Add or remove parts from vendor orders
- **Restocking** — Add parts to vendor POs that are not tied to a customer order but are needed to restock inventory
- **PO versioning** — Track changes to vendor POs with downloadable PDF versions per version
- **Validation with override** — Block customer PO creation when parts are missing, with optional user override

## Product SKU Import

Product definitions live in the [`/skus`](./skus) directory. Each Excel file represents a single product and lists the parts that make up that product. The application must:

1. Ingest these Excel files
2. Extract the necessary product and part information
3. Persist that data to the database
4. Extract embedded BOM images and upload them to imgbb (when `IMGBB_API_KEY` is set)

Import via CLI or from the Products page in the app.

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy environment variables and configure:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   - `DATABASE_URL` — Neon PostgreSQL connection string
   - `IMGBB_API_KEY` — imgbb API key for BOM image uploads (optional; text import works without it)
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob token for vendor PO PDFs (optional; local fallback in dev)

3. Push the database schema:

   ```bash
   bun run db:push
   ```

4. Import SKU Excel files:

   ```bash
   bun run import:skus
   ```

   Or use **Import all SKUs** on the Products page after starting the app.

5. Start the development server:

   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Quality checks

```bash
bun run lint && bun run typecheck
```
