ALTER TABLE "parts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "specs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_parts" ADD COLUMN "image_side_url" text;--> statement-breakpoint
ALTER TABLE "product_parts" ADD COLUMN "image_front_url" text;--> statement-breakpoint
ALTER TABLE "product_parts" ADD COLUMN "image_bottom_url" text;