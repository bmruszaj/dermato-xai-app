import "server-only";

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AppError } from "../errors";
import { generateUUID } from "../utils";
import {
  type AnnotationSession,
  annotationSession,
  type User,
  user,
} from "./schema";
import { generateHashedPassword } from "./utils";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

// ─── User ────────────────────────────────────────────────────────────────────

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new AppError("bad_request:database", "Failed to get user by email");
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new AppError("bad_request:database", "Failed to create user");
  }
}

// ─── Annotation Sessions ──────────────────────────────────────────────────────

export async function createAnnotationSession({
  userId,
}: {
  userId: string;
}): Promise<AnnotationSession> {
  try {
    const [session] = await db
      .insert(annotationSession)
      .values({ id: generateUUID(), userId })
      .returning();
    return session;
  } catch (_error) {
    throw new AppError(
      "bad_request:database",
      "Failed to create annotation session"
    );
  }
}

export async function updateAnnotationSession({
  id,
  data,
}: {
  id: string;
  data: Partial<
    Pick<
      AnnotationSession,
      | "imageRef"
      | "userBoxes"
      | "mlPredictions"
      | "comparisonResult"
      | "feedback"
      | "phase"
    >
  >;
}): Promise<AnnotationSession> {
  try {
    const [session] = await db
      .update(annotationSession)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(annotationSession.id, id))
      .returning();
    return session;
  } catch (_error) {
    throw new AppError(
      "bad_request:database",
      "Failed to update annotation session"
    );
  }
}

export async function getAnnotationSessionsByUserId({
  userId,
}: {
  userId: string;
}): Promise<AnnotationSession[]> {
  try {
    return await db
      .select()
      .from(annotationSession)
      .where(eq(annotationSession.userId, userId))
      .orderBy(desc(annotationSession.createdAt));
  } catch (_error) {
    throw new AppError(
      "bad_request:database",
      "Failed to get annotation sessions"
    );
  }
}

export async function getAnnotationSessionById({
  id,
}: {
  id: string;
}): Promise<AnnotationSession | null> {
  try {
    const [session] = await db
      .select()
      .from(annotationSession)
      .where(eq(annotationSession.id, id));
    return session ?? null;
  } catch (_error) {
    throw new AppError(
      "bad_request:database",
      "Failed to get annotation session"
    );
  }
}
