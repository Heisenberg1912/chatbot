import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { connectDB } from './mongodb';
import { User } from './models';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  // Try cookie first, then Authorization header (for cross-origin iframe contexts)
  const cookieStore = await cookies();
  let token = cookieStore.get('auth-token')?.value;

  if (!token) {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  await connectDB();
  const user = await User.findById(decoded.userId).select('-password');
  return user;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}
