CREATE TYPE "public"."customer_order_status" AS ENUM('pending', 'procuring', 'ready', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."vendor_po_status" AS ENUM('draft', 'sent', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."vendor_po_type" AS ENUM('customer_derived', 'restock');--> statement-breakpoint
CREATE TABLE "customer_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "customer_order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_po_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_po_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_pos" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_order_id" integer NOT NULL,
	"override_used" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"item_no" text,
	"quantity" integer NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_code" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"part_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_po_version_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_po_version_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_po_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_po_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_pos" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_order_id" integer,
	"vendor_id" integer NOT NULL,
	"type" "vendor_po_type" NOT NULL,
	"status" "vendor_po_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_order_lines" ADD CONSTRAINT "customer_order_lines_customer_order_id_customer_orders_id_fk" FOREIGN KEY ("customer_order_id") REFERENCES "public"."customer_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order_lines" ADD CONSTRAINT "customer_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_po_lines" ADD CONSTRAINT "customer_po_lines_customer_po_id_customer_pos_id_fk" FOREIGN KEY ("customer_po_id") REFERENCES "public"."customer_pos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_po_lines" ADD CONSTRAINT "customer_po_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_pos" ADD CONSTRAINT "customer_pos_customer_order_id_customer_orders_id_fk" FOREIGN KEY ("customer_order_id") REFERENCES "public"."customer_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_parts" ADD CONSTRAINT "vendor_parts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_parts" ADD CONSTRAINT "vendor_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_po_version_lines" ADD CONSTRAINT "vendor_po_version_lines_vendor_po_version_id_vendor_po_versions_id_fk" FOREIGN KEY ("vendor_po_version_id") REFERENCES "public"."vendor_po_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_po_version_lines" ADD CONSTRAINT "vendor_po_version_lines_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_po_versions" ADD CONSTRAINT "vendor_po_versions_vendor_po_id_vendor_pos_id_fk" FOREIGN KEY ("vendor_po_id") REFERENCES "public"."vendor_pos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_pos" ADD CONSTRAINT "vendor_pos_customer_order_id_customer_orders_id_fk" FOREIGN KEY ("customer_order_id") REFERENCES "public"."customer_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_pos" ADD CONSTRAINT "vendor_pos_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_part_id_idx" ON "inventory" USING btree ("part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_normalized_name_idx" ON "parts" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "products_model_code_idx" ON "products" USING btree ("model_code");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_parts_vendor_part_idx" ON "vendor_parts" USING btree ("vendor_id","part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_po_versions_po_version_idx" ON "vendor_po_versions" USING btree ("vendor_po_id","version_number");