import type { Express } from 'express';
import type { Role } from '@dinhduong/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { testPrisma } from './test-prisma';

/**
 * Creates a User directly in the test DB and logs in via /api/auth/login,
 * returning a supertest agent that keeps the auth cookie for subsequent
 * requests. Use this in any integration test hitting a now-protected route.
 */
export async function loginAsRole(app: Express, role: Role = 'admin') {
  const email = `test-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const password = 'Test1234!';
  const passwordHash = await bcrypt.hash(password, 10);
  await testPrisma.user.create({
    data: { name: `Test ${role}`, email, passwordHash, role, isActive: true },
  });

  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}
