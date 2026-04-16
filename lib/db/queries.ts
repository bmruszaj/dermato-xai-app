import "server-only";

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { verifySession } from "@/lib/auth/session";
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

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/**
 * Public user data — never includes password, emailVerified, or internal timestamps.
 */
export type UserDTO = Pick<User, "id" | "email" | "name" | "image">;

/**
 * Public annotation session data.
 */
export type AnnotationSessionDTO = Omit<AnnotationSession, "updatedAt">;

function toAnnotationSessionDTO(s: AnnotationSession): AnnotationSessionDTO {
  const { updatedAt: _updatedAt, ...rest } = s;
  return rest;
}

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * Internal — used only by NextAuth authorize() and signIn callbacks.
 * Returns the full User row (including password) intentionally.
 */
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

/**
 * Upserts a Google OAuth user:
 * - If no user with this email exists → creates a new user row (no password)
 * - If a user with this email already exists → updates name/image/emailVerified
 *   without touching the password (account linking)
 * Returns the final user row (internal — used only by NextAuth signIn callback).
 */
export async function upsertGoogleUser({
  email,
  name,
  image,
}: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<User> {
  try {
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (existing) {
      const [updated] = await db
        .update(user)
        .set({
          name: name ?? existing.name,
          image: image ?? existing.image,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.email, email))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(user)
      .values({ email, name, image, emailVerified: true })
      .returning();
    return created;
  } catch (_error) {
    throw new AppError("bad_request:database", "Failed to upsert Google user");
  }
}

// ─── Annotation Sessions ──────────────────────────────────────────────────────

export async function createAnnotationSession(): Promise<AnnotationSessionDTO> {
  const { userId } = await verifySession();

  try {
    const [session] = await db
      .insert(annotationSession)
      .values({ id: generateUUID(), userId })
      .returning();
    return toAnnotationSessionDTO(session);
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
}): Promise<AnnotationSessionDTO> {
  const { userId } = await verifySession();

  // Ownership check — prevent IDOR
  const [existing] = await db
    .select({ userId: annotationSession.userId })
    .from(annotationSession)
    .where(eq(annotationSession.id, id));

  if (!existing) {
    throw new AppError("not_found:annotate", "Annotation session not found");
  }

  if (existing.userId !== userId) {
    throw new AppError("forbidden:auth", "Access denied");
  }

  try {
    const [session] = await db
      .update(annotationSession)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(annotationSession.id, id))
      .returning();
    return toAnnotationSessionDTO(session);
  } catch (_error) {
    throw new AppError(
      "bad_request:database",
      "Failed to update annotation session"
    );
  }
}

export async function getAnnotationSessionsByUserId(): Promise<
  AnnotationSessionDTO[]
> {
  const { userId } = await verifySession();

  try {
    const rows = await db
      .select()
      .from(annotationSession)
      .where(eq(annotationSession.userId, userId))
      .orderBy(desc(annotationSession.createdAt));
    return rows.map(toAnnotationSessionDTO);
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
}): Promise<AnnotationSessionDTO | null> {
  const { userId } = await verifySession();

  try {
    const [session] = await db
      .select()
      .from(annotationSession)
      .where(eq(annotationSession.id, id));

    if (!session) {
      return null;
    }

    // Ownership check — prevent IDOR
    if (session.userId !== userId) {
      throw new AppError("forbidden:auth", "Access denied");
    }

    return toAnnotationSessionDTO(session);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "bad_request:database",
      "Failed to get annotation session"
    );
  }
}
