import session from "express-session";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { PrismaSessionStore } from "../lib/prisma-session-store.js";

export const sessionMiddleware = session({
  secret: env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "lax"
  },
  store: new PrismaSessionStore(prisma, {
    checkPeriodMs: 1000 * 60 * 2
  })
});
