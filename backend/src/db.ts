import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('error', (e) => {
  logger.error('Prisma error', { error: e.message });
});

export default prisma;
