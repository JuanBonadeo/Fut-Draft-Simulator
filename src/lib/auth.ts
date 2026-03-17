import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ??
  "replace-this-secret-before-production-use-123456";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "Hackathon Template",
  baseURL: betterAuthUrl,
  secret: betterAuthSecret,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
          },
        }
      : {},
});