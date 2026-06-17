# Vendor Purchase Order Management

A system for managing vendors, parts, products (with BOMs), and versioned vendor purchase orders with PDF export.

## Overview

```
Vendors → supply → Parts → referenced by → Products (BOM)
                    ↓
              Vendor POs (versioned PDFs)
```

Master data (vendors, parts, products) supports manual entry or Excel import. Product BOMs are reference-only — they help identify which parts belong to a product but do not auto-generate POs.

## Adding products and parts

There are two ways to populate the catalog:

### 1. Excel import (recommended for bulk setup)

Upload a product BOM spreadsheet (`.xlsx`) from the **Products** page or on a product detail page. The parser expects this layout:

| Cell / row | Content |
|------------|---------|
| B2 | Display name (e.g. `LED Flood Light 200 W`) |
| B3 | Model code (e.g. `CR-NC-200W-FL-200W`) |
| Row 6+ | BOM lines: item no. (A), part name (B), description (D), quantity (G), remarks (K) |
| Columns H–J | Optional part images (side, front, bottom) |

Each file creates or updates a product, upserts all BOM parts (with parsed specs), replaces the product BOM, and extracts embedded images to Vercel Blob (or local storage in dev).

CLI import:

```bash
bun run import:skus path/to/file.xlsx
bun run import:skus path/to/folder/with/xlsx/files
```

### 2. Manual entry

1. **Parts** — Add parts individually with name, category, and structured specs.
2. **Products** — Create a product with model code and display name.
3. **BOM** — On the product detail page, add BOM lines by selecting existing parts.

## Flow

1. **Master data** — Import products from Excel or create parts and products manually. Assign parts to vendors and build product BOMs.
2. **Create PO** — Pick a vendor, add part lines with quantities. Version 1 is created and a PDF is generated.
3. **Edit PO** — Add or remove parts, change quantities, then save. Each save that changes lines creates a new version with its own PDF.
4. **Version history** — Every version remains downloadable from the PO detail page.

## Features

- **CRUD** for vendors, parts, and products
- **Excel BOM import** — Upload `.xlsx` files to create products, parts, and BOM lines in one step
- **Vendor–part assignment** — Scope part pickers when creating POs for a vendor
- **Manual product BOM** — Add, edit, and remove BOM lines on product detail pages
- **Editable vendor POs** — POs are always editable (no delivery lock)
- **PO versioning** — Track changes with downloadable PDF per version

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy environment variables and configure:

   ```bash
   cp .env.example .env
   ```

   Required variables:

   - `DATABASE_URL` — Neon PostgreSQL connection string
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob token for vendor PO PDFs and BOM images (optional; local fallback in dev)

   If the project is linked to Vercel, pull the Blob token with `bunx vercel env pull .env.vercel.tmp --environment=development --yes` and copy `BLOB_READ_WRITE_TOKEN` into `.env`.

3. Push the database schema:

   ```bash
   bun run db:push
   ```

4. Start the development server:

   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Quality checks

```bash
bun run lint && bun run typecheck && bun run build
```

Smoke-test vendor PO creation, versioning, and PDF generation (creates temporary data if none exists, then cleans up):

```bash
bun run smoke:vendor-po
```
