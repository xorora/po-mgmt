import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const customerOrderStatusEnum = pgEnum("customer_order_status", [
  "pending",
  "procuring",
  "ready",
  "fulfilled",
]);

export const vendorPoTypeEnum = pgEnum("vendor_po_type", [
  "customer_derived",
  "restock",
]);

export const vendorPoStatusEnum = pgEnum("vendor_po_status", [
  "draft",
  "sent",
  "delivered",
]);

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const parts = pgTable(
  "parts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("parts_normalized_name_idx").on(table.normalizedName),
  ],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    modelCode: text("model_code").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("products_model_code_idx").on(table.modelCode)],
);

export const productParts = pgTable("product_parts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  partId: integer("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  itemNo: text("item_no"),
  quantity: integer("quantity").notNull(),
  remarks: text("remarks"),
  imageSideUrl: text("image_side_url"),
  imageFrontUrl: text("image_front_url"),
  imageBottomUrl: text("image_bottom_url"),
});

export const vendorParts = pgTable(
  "vendor_parts",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    partId: integer("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("vendor_parts_vendor_part_idx").on(
      table.vendorId,
      table.partId,
    ),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    partId: integer("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("inventory_part_id_idx").on(table.partId)],
);

export const customerOrders = pgTable("customer_orders", {
  id: serial("id").primaryKey(),
  status: customerOrderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customerOrderLines = pgTable("customer_order_lines", {
  id: serial("id").primaryKey(),
  customerOrderId: integer("customer_order_id")
    .notNull()
    .references(() => customerOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
});

export const vendorPos = pgTable("vendor_pos", {
  id: serial("id").primaryKey(),
  customerOrderId: integer("customer_order_id").references(
    () => customerOrders.id,
    { onDelete: "set null" },
  ),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id),
  type: vendorPoTypeEnum("type").notNull(),
  status: vendorPoStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vendorPoVersions = pgTable(
  "vendor_po_versions",
  {
    id: serial("id").primaryKey(),
    vendorPoId: integer("vendor_po_id")
      .notNull()
      .references(() => vendorPos.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    pdfUrl: text("pdf_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("vendor_po_versions_po_version_idx").on(
      table.vendorPoId,
      table.versionNumber,
    ),
  ],
);

export const vendorPoVersionLines = pgTable("vendor_po_version_lines", {
  id: serial("id").primaryKey(),
  vendorPoVersionId: integer("vendor_po_version_id")
    .notNull()
    .references(() => vendorPoVersions.id, { onDelete: "cascade" }),
  partId: integer("part_id")
    .notNull()
    .references(() => parts.id),
  quantity: integer("quantity").notNull(),
});

export const customerPos = pgTable(
  "customer_pos",
  {
    id: serial("id").primaryKey(),
    customerOrderId: integer("customer_order_id")
      .notNull()
      .references(() => customerOrders.id),
    overrideUsed: boolean("override_used").notNull().default(false),
    overrideReason: text("override_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_pos_customer_order_id_idx").on(table.customerOrderId),
  ],
);

export const customerPoLines = pgTable("customer_po_lines", {
  id: serial("id").primaryKey(),
  customerPoId: integer("customer_po_id")
    .notNull()
    .references(() => customerPos.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
});

export const vendorsRelations = relations(vendors, ({ many }) => ({
  vendorParts: many(vendorParts),
  vendorPos: many(vendorPos),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  inventory: one(inventory),
  productParts: many(productParts),
  vendorParts: many(vendorParts),
  vendorPoVersionLines: many(vendorPoVersionLines),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productParts: many(productParts),
  customerOrderLines: many(customerOrderLines),
  customerPoLines: many(customerPoLines),
}));

export const productPartsRelations = relations(productParts, ({ one }) => ({
  product: one(products, {
    fields: [productParts.productId],
    references: [products.id],
  }),
  part: one(parts, {
    fields: [productParts.partId],
    references: [parts.id],
  }),
}));

export const vendorPartsRelations = relations(vendorParts, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorParts.vendorId],
    references: [vendors.id],
  }),
  part: one(parts, {
    fields: [vendorParts.partId],
    references: [parts.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  part: one(parts, {
    fields: [inventory.partId],
    references: [parts.id],
  }),
}));

export const customerOrdersRelations = relations(
  customerOrders,
  ({ many, one }) => ({
    lines: many(customerOrderLines),
    vendorPos: many(vendorPos),
    customerPo: one(customerPos),
  }),
);

export const customerOrderLinesRelations = relations(
  customerOrderLines,
  ({ one }) => ({
    customerOrder: one(customerOrders, {
      fields: [customerOrderLines.customerOrderId],
      references: [customerOrders.id],
    }),
    product: one(products, {
      fields: [customerOrderLines.productId],
      references: [products.id],
    }),
  }),
);

export const vendorPosRelations = relations(vendorPos, ({ one, many }) => ({
  customerOrder: one(customerOrders, {
    fields: [vendorPos.customerOrderId],
    references: [customerOrders.id],
  }),
  vendor: one(vendors, {
    fields: [vendorPos.vendorId],
    references: [vendors.id],
  }),
  versions: many(vendorPoVersions),
}));

export const vendorPoVersionsRelations = relations(
  vendorPoVersions,
  ({ one, many }) => ({
    vendorPo: one(vendorPos, {
      fields: [vendorPoVersions.vendorPoId],
      references: [vendorPos.id],
    }),
    lines: many(vendorPoVersionLines),
  }),
);

export const vendorPoVersionLinesRelations = relations(
  vendorPoVersionLines,
  ({ one }) => ({
    vendorPoVersion: one(vendorPoVersions, {
      fields: [vendorPoVersionLines.vendorPoVersionId],
      references: [vendorPoVersions.id],
    }),
    part: one(parts, {
      fields: [vendorPoVersionLines.partId],
      references: [parts.id],
    }),
  }),
);

export const customerPosRelations = relations(customerPos, ({ one, many }) => ({
  customerOrder: one(customerOrders, {
    fields: [customerPos.customerOrderId],
    references: [customerOrders.id],
  }),
  lines: many(customerPoLines),
}));

export const customerPoLinesRelations = relations(
  customerPoLines,
  ({ one }) => ({
    customerPo: one(customerPos, {
      fields: [customerPoLines.customerPoId],
      references: [customerPos.id],
    }),
    product: one(products, {
      fields: [customerPoLines.productId],
      references: [products.id],
    }),
  }),
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

export type Part = typeof parts.$inferSelect;
export type NewPart = typeof parts.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductPart = typeof productParts.$inferSelect;
export type NewProductPart = typeof productParts.$inferInsert;

export type VendorPart = typeof vendorParts.$inferSelect;
export type NewVendorPart = typeof vendorParts.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;

export type CustomerOrder = typeof customerOrders.$inferSelect;
export type NewCustomerOrder = typeof customerOrders.$inferInsert;

export type CustomerOrderLine = typeof customerOrderLines.$inferSelect;
export type NewCustomerOrderLine = typeof customerOrderLines.$inferInsert;

export type VendorPo = typeof vendorPos.$inferSelect;
export type NewVendorPo = typeof vendorPos.$inferInsert;

export type VendorPoVersion = typeof vendorPoVersions.$inferSelect;
export type NewVendorPoVersion = typeof vendorPoVersions.$inferInsert;

export type VendorPoVersionLine = typeof vendorPoVersionLines.$inferSelect;
export type NewVendorPoVersionLine = typeof vendorPoVersionLines.$inferInsert;

export type CustomerPo = typeof customerPos.$inferSelect;
export type NewCustomerPo = typeof customerPos.$inferInsert;

export type CustomerPoLine = typeof customerPoLines.$inferSelect;
export type NewCustomerPoLine = typeof customerPoLines.$inferInsert;

export type CustomerOrderStatus =
  (typeof customerOrderStatusEnum.enumValues)[number];
export type VendorPoType = (typeof vendorPoTypeEnum.enumValues)[number];
export type VendorPoStatus = (typeof vendorPoStatusEnum.enumValues)[number];
