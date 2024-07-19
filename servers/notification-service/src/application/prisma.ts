import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'

const logger = createLogger('prisma')

export const database = new PrismaClient({
    log: [
        {
            level: 'info',
            emit: 'event',
        },
        {
            level: 'query',
            emit: 'event',
        },
        {
            level: 'warn',
            emit: 'event',
        },
        {
            level: 'error',
            emit: 'event',
        },
    ],
})

database.$on('info', (e) => {
    logger.info('info', e)
})

database.$on('query', (e) => {
    logger.debug('query', e)
})

database.$on('warn', (e) => {
    logger.warn('warn', e)
})

database.$on('error', (e) => {
    logger.error('error', e)
})
