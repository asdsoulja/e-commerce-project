import session from "express-session";
import type { PrismaClient } from "@prisma/client";

type Callback = (err?: any) => void;

interface PrismaSessionStoreOptions {
  checkPeriodMs?: number;
  ttlMs?: number;
}

export class PrismaSessionStore extends session.Store {
  private readonly prisma: PrismaClient;
  private readonly ttlMs: number;
  private readonly cleanupInterval?: NodeJS.Timeout;

  constructor(prisma: PrismaClient, options: PrismaSessionStoreOptions = {}) {
    super();
    this.prisma = prisma;
    this.ttlMs = options.ttlMs ?? 1000 * 60 * 60 * 24 * 7;

    if (options.checkPeriodMs && options.checkPeriodMs > 0) {
      this.cleanupInterval = setInterval(() => {
        void this.prisma.session
          .deleteMany({
            where: {
              expiresAt: {
                lt: new Date()
              }
            }
          })
          .catch(() => undefined);
      }, options.checkPeriodMs);
      this.cleanupInterval.unref();
    }
  }

  override async get(
    sid: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ): Promise<void> {
    try {
      const record = await this.prisma.session.findUnique({
        where: { sid }
      });

      if (!record) {
        callback(null, null);
        return;
      }

      if (record.expiresAt.getTime() <= Date.now()) {
        await this.prisma.session.deleteMany({
          where: { sid }
        });
        callback(null, null);
        return;
      }

      callback(null, JSON.parse(record.data) as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  override async set(sid: string, storeSession: session.SessionData, callback?: Callback): Promise<void> {
    try {
      const data = JSON.stringify(storeSession);
      const expiresAt = this.resolveExpiresAt(storeSession);

      await this.prisma.session.upsert({
        where: { sid },
        create: {
          sid,
          data,
          expiresAt
        },
        update: {
          data,
          expiresAt
        }
      });

      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override async destroy(sid: string, callback?: Callback): Promise<void> {
    try {
      await this.prisma.session.deleteMany({
        where: { sid }
      });
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override async touch(sid: string, storeSession: session.SessionData, callback?: () => void): Promise<void> {
    try {
      const expiresAt = this.resolveExpiresAt(storeSession);
      await this.prisma.session.updateMany({
        where: { sid },
        data: {
          expiresAt
        }
      });
      callback?.();
    } catch {
      callback?.();
    }
  }

  override async clear(callback?: Callback): Promise<void> {
    try {
      await this.prisma.session.deleteMany();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override async length(callback: (err: any, length?: number) => void): Promise<void> {
    try {
      const count = await this.prisma.session.count();
      callback(null, count);
    } catch (err) {
      callback(err);
    }
  }

  private resolveExpiresAt(storeSession: session.SessionData): Date {
    const maybeExpires = storeSession.cookie?.expires;
    if (maybeExpires instanceof Date && !Number.isNaN(maybeExpires.valueOf())) {
      return maybeExpires;
    }

    if (typeof maybeExpires === "string") {
      const parsed = new Date(maybeExpires);
      if (!Number.isNaN(parsed.valueOf())) {
        return parsed;
      }
    }

    return new Date(Date.now() + this.ttlMs);
  }
}
