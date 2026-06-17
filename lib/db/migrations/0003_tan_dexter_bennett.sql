ALTER TABLE "customer_order_lines" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_po_lines" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_pos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "customer_order_lines" CASCADE;--> statement-breakpoint
DROP TABLE "customer_orders" CASCADE;--> statement-breakpoint
DROP TABLE "customer_po_lines" CASCADE;--> statement-breakpoint
DROP TABLE "customer_pos" CASCADE;--> statement-breakpoint
DROP TABLE "inventory" CASCADE;--> statement-breakpoint
ALTER TABLE "vendor_pos" DROP CONSTRAINT IF EXISTS "vendor_pos_customer_order_id_customer_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_pos" DROP COLUMN "customer_order_id";--> statement-breakpoint
ALTER TABLE "vendor_pos" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "vendor_pos" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."customer_order_status";--> statement-breakpoint
DROP TYPE "public"."vendor_po_status";--> statement-breakpoint
DROP TYPE "public"."vendor_po_type";