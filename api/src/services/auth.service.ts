import slugify from "slugify";

import { env } from "@/config/env.js";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/errors.js";
import { signAccessToken, signLoginSelectionToken, verifyLoginSelectionToken } from "@/lib/jwt.js";
import { hashPassword, verifyPasswordTimingSafe } from "@/lib/password.js";
import { prisma } from "@/lib/prisma.js";
import { generateRefreshToken, hashRefreshToken } from "@/lib/tokens.js";
import { Role, type Company, type Session, type User } from "@kontora/db";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

function sanitizeUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

async function generateUniqueSlug(companyName: string): Promise<string> {
  const base = slugify(companyName, { lower: true, strict: true }) || "company";
  let candidate = base;
  let suffix = 1;
  // Small, bounded loop: collisions are rare, and company creation isn't hot-path traffic.
  while (await prisma.company.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

async function createSession(userId: string, companyId: string, meta: RequestMeta) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      companyId,
      refreshTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  return { session, refreshToken };
}

function issueAccessToken(
  session: Pick<Session, "id" | "userId" | "companyId">,
  role: Role,
): string {
  return signAccessToken({
    sub: session.userId,
    companyId: session.companyId,
    role,
    sessionId: session.id,
  });
}

export async function register(
  input: { email: string; password: string; name: string; companyName: string },
  meta: RequestMeta,
): Promise<{ tokens: AuthTokens; user: PublicUser; company: Company; role: Role }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const slug = await generateUniqueSlug(input.companyName);

  const { user, company } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: input.companyName, slug } });
    const user = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
    await tx.teamMembership.create({
      data: { userId: user.id, companyId: company.id, role: Role.OWNER },
    });
    return { user, company };
  });

  const { session, refreshToken } = await createSession(user.id, company.id, meta);
  const accessToken = issueAccessToken(session, Role.OWNER);

  return {
    tokens: { accessToken, refreshToken },
    user: sanitizeUser(user),
    company,
    role: Role.OWNER,
  };
}

export type LoginResult =
  | { status: "authenticated"; tokens: AuthTokens; user: PublicUser; company: Company; role: Role }
  | {
      status: "company_selection_required";
      loginToken: string;
      companies: { id: string; name: string; role: Role }[];
    };

export async function login(
  input: { email: string; password: string },
  meta: RequestMeta,
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always run bcrypt, even for an unknown email, so response timing can't
  // be used to enumerate which addresses have an account.
  const passwordOk = await verifyPasswordTimingSafe(input.password, user?.passwordHash ?? null);
  if (!user || !passwordOk) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id },
    include: { company: true },
  });

  if (memberships.length === 0) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (memberships.length === 1) {
    const membership = memberships[0]!;
    const { session, refreshToken } = await createSession(user.id, membership.companyId, meta);
    const accessToken = issueAccessToken(session, membership.role);
    return {
      status: "authenticated",
      tokens: { accessToken, refreshToken },
      user: sanitizeUser(user),
      company: membership.company,
      role: membership.role,
    };
  }

  const loginToken = signLoginSelectionToken(user.id);
  return {
    status: "company_selection_required",
    loginToken,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role })),
  };
}

export async function selectCompany(
  input: { loginToken: string; companyId: string },
  meta: RequestMeta,
): Promise<{ tokens: AuthTokens; user: PublicUser; company: Company; role: Role }> {
  const payload = verifyLoginSelectionToken(input.loginToken);

  const membership = await prisma.teamMembership.findUnique({
    where: { userId_companyId: { userId: payload.sub, companyId: input.companyId } },
    include: { company: true, user: true },
  });
  if (!membership) {
    throw new ForbiddenError("You are not a member of this company.");
  }

  const { session, refreshToken } = await createSession(
    membership.userId,
    membership.companyId,
    meta,
  );
  const accessToken = issueAccessToken(session, membership.role);

  return {
    tokens: { accessToken, refreshToken },
    user: sanitizeUser(membership.user),
    company: membership.company,
    role: membership.role,
  };
}

export async function refreshSession(
  refreshTokenValue: string,
  meta: RequestMeta,
): Promise<AuthTokens> {
  const refreshTokenHash = hashRefreshToken(refreshTokenValue);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash } });

  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError();
  }

  if (session.revokedAt) {
    // This token was already rotated away (or explicitly logged out) and is
    // being presented again — that only happens if it leaked. Kill every
    // session for this user as a precaution rather than trusting it.
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError();
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { userId_companyId: { userId: session.userId, companyId: session.companyId } },
  });
  if (!membership) {
    // Access to this company was revoked since the session was issued.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    throw new UnauthorizedError();
  }

  // Rotation: the old refresh token is single-use.
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  const { session: newSession, refreshToken } = await createSession(
    session.userId,
    session.companyId,
    meta,
  );
  const accessToken = issueAccessToken(newSession, membership.role);

  return { accessToken, refreshToken };
}

export async function logout(refreshTokenValue: string | undefined): Promise<void> {
  if (!refreshTokenValue) return;
  const refreshTokenHash = hashRefreshToken(refreshTokenValue);
  await prisma.session.updateMany({
    where: { refreshTokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function switchCompany(
  input: { userId: string; currentSessionId: string; targetCompanyId: string },
  meta: RequestMeta,
): Promise<{ tokens: AuthTokens; company: Company; role: Role }> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.targetCompanyId } },
    include: { company: true },
  });
  if (!membership) {
    throw new ForbiddenError("You are not a member of this company.");
  }

  await prisma.session.updateMany({
    where: { id: input.currentSessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const { session, refreshToken } = await createSession(input.userId, input.targetCompanyId, meta);
  const accessToken = issueAccessToken(session, membership.role);

  return {
    tokens: { accessToken, refreshToken },
    company: membership.company,
    role: membership.role,
  };
}

export async function getMe(
  userId: string,
  companyId: string,
): Promise<{
  user: PublicUser;
  company: Company;
  role: Role;
  companies: { id: string; name: string; role: Role }[];
}> {
  const [user, memberships] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.teamMembership.findMany({ where: { userId }, include: { company: true } }),
  ]);

  const current = memberships.find((m) => m.companyId === companyId);
  if (!current) {
    throw new UnauthorizedError();
  }

  return {
    user: sanitizeUser(user),
    company: current.company,
    role: current.role,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role })),
  };
}
