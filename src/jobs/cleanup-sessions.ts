import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '../generated/prisma/client/index.js';
import { SessionService } from '../services/session-service.js';

container.register(PrismaClient, {
  useValue: new PrismaClient(),
});

export async function cleanupExpiredSessions() {
  const sessionService = new SessionService();
  const count = await sessionService.cleanExpiredSessions();
  console.log(`[CLEANUP] Removed ${count} expired sessions at ${new Date().toISOString()}`);
  return count;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredSessions()
    .then(() => {
      console.log('[CLEANUP] Job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[CLEANUP] Job failed:', error);
      process.exit(1);
    });
}
