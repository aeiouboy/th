import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../../database/drizzle.provider';

// Mutable verify mock — tests set this per-test
let jwtVerifyImpl: (token: any, getKey: any, opts: any, callback: any) => void = () => {};

// Mock jsonwebtoken so tests control verify behavior without network calls
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn().mockImplementation((token: any, getKey: any, opts: any, callback: any) => {
    jwtVerifyImpl(token, getKey, opts, callback);
  }),
}));

// Mock jwks-rsa to prevent real network calls
jest.mock('jwks-rsa', () => {
  return jest.fn().mockReturnValue({
    getSigningKey: jest.fn(),
  });
});

function buildMockContext(headers: Record<string, string>, user?: any): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(() => {}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ headers, user }),
    }),
  } as any;
}

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let db: any;
  let reflector: Reflector;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        { provide: DRIZZLE, useValue: db },
        Reflector,
      ],
    }).compile();

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('should allow public routes without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = buildMockContext({});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = buildMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Authorization header does not start with Bearer', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = buildMockContext({ authorization: 'Basic abc123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when JWT verification fails (invalid token)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    // Simulate a failed JWT verification via the module-level mock
    jwtVerifyImpl = (_token, _getKey, _opts, callback) => {
      callback(new Error('jwt malformed'));
    };

    const ctx = buildMockContext({ authorization: 'Bearer invalid.jwt.token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user profile is not found in DB', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const tokenPayload = { sub: 'user-not-in-db', iat: Math.floor(Date.now() / 1000) };

    // Simulate successful JWKS verification but no matching DB profile
    jwtVerifyImpl = (_token, _getKey, _opts, callback) => {
      callback(null, tokenPayload);
    };

    const dbChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]), // no profile found
    };
    dbChain.where.mockReturnValue(dbChain);
    db.select.mockReturnValueOnce(dbChain);

    const ctx = buildMockContext({ authorization: 'Bearer some.valid.token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow request and attach profile when JWT is valid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const tokenPayload = { sub: 'user-1', iat: Math.floor(Date.now() / 1000) };

    // Simulate successful JWKS verification
    jwtVerifyImpl = (_token, _getKey, _opts, callback) => {
      callback(null, tokenPayload);
    };

    const profile = { id: 'user-1', email: 'alice@test.com', role: 'user' };
    const dbChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([profile]),
    };
    dbChain.where.mockReturnValue(dbChain);
    db.select.mockReturnValueOnce(dbChain);

    const request: any = { headers: { authorization: 'Bearer some.valid.token' } };
    const ctx: any = {
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(() => {}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.user).toEqual(profile);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = buildMockContext({}, { role: 'user' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = buildMockContext({}, { role: 'admin' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user does not have the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = buildMockContext({}, { role: 'user' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no user is on the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = buildMockContext({}, undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow access when user role matches one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'manager']);
    const ctx = buildMockContext({}, { role: 'manager' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
