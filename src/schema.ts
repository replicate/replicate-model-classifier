import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const modelClassifications = sqliteTable('model_classifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  modelKey: text('model_key').notNull().unique(),
  classification: text('classification').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}); 