import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { getUser, upsertGoogleUser } from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    /** DB UUID — set after Google upsert so JWT can use it */
    dbId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      checks: ["pkce", "state"],
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "");
        const password = String(credentials.password ?? "");
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return { ...user, type: "regular" };
      },
    }),
  ],
  callbacks: {
    async signIn({ user: authUser, account, profile }) {
      // Only handle Google provider here
      if (account?.provider !== "google") {
        return true;
      }

      const email = profile?.email ?? authUser.email;
      if (!email) {
        return false;
      }

      try {
        const dbUser = await upsertGoogleUser({
          email,
          name: profile?.name ?? authUser.name,
          image:
            (profile as { picture?: string } | undefined)?.picture ??
            authUser.image,
        });
        // Stash the real DB UUID so the jwt callback can pick it up
        authUser.dbId = dbUser.id;
        return true;
      } catch {
        return false;
      }
    },
    jwt({ token, user }) {
      if (user) {
        // For Google users, prefer the DB UUID stored in dbId
        token.id = ((user as { dbId?: string }).dbId ??
          user.id ??
          token.sub) as string;
        token.type = (user.type ?? "regular") as UserType;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});
