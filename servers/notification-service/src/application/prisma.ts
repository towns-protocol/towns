import { PrismaClient } from '@prisma/client'

export const database = new PrismaClient({
    // TODO: make this configurable via env vars
    log: ['query', 'info', 'warn', 'error'],
})
