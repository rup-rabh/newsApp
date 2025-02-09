// src/db/schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  real,
  date
} from 'drizzle-orm/pg-core';

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 15 }),
  category: varchar('category', { length: 50 }),
  imageUrl: text('image_url'),
  isApproved: boolean('is_approved').default(false),
  isDuplicate: boolean('is_duplicate').default(false),
  similarityScore: real('similarity_score'),
  createdAt: timestamp('created_at').defaultNow(),
  eventDate: date('event_date'),
});
