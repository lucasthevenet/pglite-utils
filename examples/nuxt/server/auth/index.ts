import type { AuthConfig } from "@auth/core";
import type { H3Event } from "h3";

import GitHub from "@auth/core/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "../db";
import { getSession } from "./lib";

export const authConfig: Omit<AuthConfig, "raw"> = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
};

export async function getServerSession(event: H3Event) {
  return getSession(event, authConfig);
}
