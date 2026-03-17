import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { profiles } from '../../database/schema';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private jwksClient: jwksRsa.JwksClient;
  // In-memory profile cache — avoids a DB query per request for the same user
  // TTL: 60 seconds. Entries: { profile, expiresAt }
  private profileCache = new Map<string, { profile: Record<string, unknown>; expiresAt: number }>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reflector: Reflector,
  ) {
    const supabaseUrl =
      process.env.SUPABASE_URL || 'https://lchxtkiceeyqjksganwr.supabase.co';
    this.jwksClient = jwksRsa({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = await this.verifyToken(token);
      const userId = decoded.sub as string;

      // Check profile cache first to avoid DB round-trip on every request
      const now = Date.now();
      const cached = this.profileCache.get(userId);
      let profile: Record<string, unknown> | undefined;

      if (cached && cached.expiresAt > now) {
        profile = cached.profile;
      } else {
        const [row] = await this.db
          .select()
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1);
        profile = row as Record<string, unknown> | undefined;
        if (profile) {
          this.profileCache.set(userId, { profile, expiresAt: now + 60_000 });
        }
      }

      if (!profile) {
        throw new UnauthorizedException('User profile not found');
      }

      request.user = profile;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('Auth guard error:', error instanceof Error ? error.message : error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private verifyToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err);
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
          });
        },
        { algorithms: ['ES256', 'RS256'] },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as jwt.JwtPayload);
        },
      );
    });
  }
}
