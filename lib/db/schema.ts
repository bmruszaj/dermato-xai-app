import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const annotationSession = pgTable("AnnotationSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  imageRef: text("imageRef"),
  userBoxes: json("userBoxes"),
  mlPredictions: json("mlPredictions"),
  comparisonResult: json("comparisonResult"),
  feedback: text("feedback"),
  phase: varchar("phase", {
    enum: ["upload", "annotating", "submitting", "feedback"],
  })
    .notNull()
    .default("upload"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AnnotationSession = InferSelectModel<typeof annotationSession>;
