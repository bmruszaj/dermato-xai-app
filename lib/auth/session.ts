import "server-only";

import { cache } from "react";
import { auth } from "@/app/(auth)/auth";
import { AppError } from "@/lib/errors";

/**
 * Returns the current session's user or throws an AppError.
 *
 * Wrapped in React.cache() so that multiple calls within a single render pass
 * (e.g. across Server Components, Server Actions, Route Handlers) only invoke
 * auth() once — no duplicate cookie reads or session decryptions.
 *
 * Middleware alone is not sufficient: it is optimistic and does not re-run on
 * every data access. Always call verifySession() at the top of every DAL
 * function, Server Action, and Route Handler that touches protected data.
 */
export const verifySession = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AppError("unauthorized:auth", "Not authenticated");
  }

  return { userId: session.user.id, userType: session.user.type };
});
