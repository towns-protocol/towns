import { PrismaClient } from '@prisma/client'
import { notificationServiceLogger } from './logger'

const logger = notificationServiceLogger.child({ label: 'prisma' })
const newDatabase = () => {
    const db = new PrismaClient({
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

    db.$on('info', (e) => {
        logger.info('PRISMA info', e)
    })

    db.$on('query', (e) => {
        logger.debug('PRISMA query', e)
    })

    db.$on('warn', (e) => {
        logger.warn('PRISMA warn', e)
    })

    db.$on('error', (e) => {
        logger.error('PRISMA error', e)
    })

    return db
}

export const database = newDatabase()
