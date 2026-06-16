import "server-only";

import { cache } from "react";
import { AppError } from "@/lib/errors";

/**
 * Authentication is disabled for the public AI Forum demo.
 * Legacy DB helpers that still call this function fail closed instead of
 * creating or reading user sessions.
 */
export const verifySession = cache(async () => {
  throw new AppError("unauthorized:auth", "Authentication is disabled");
});
