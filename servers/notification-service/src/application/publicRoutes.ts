import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from './prisma'
import { Metrics } from '@prisma/client/runtime/library'
import { StreamsMonitorService } from './services/stream/streamsMonitorService'
import { NonceStats } from './services/stream/syncedStreams'

export const publicRoutes = Router()

type PrismaStatus = {
    status: 'UP' | 'DOWN'
    metrics?: Metrics
    error?: unknown
}

type SyncStatus = {
    status: 'UP' | 'DOWN'
    metrics?: NonceStats
    error?: unknown
}

type Status = {
    Prisma: PrismaStatus
    Sync: SyncStatus
}

const createTimeoutPromise = <
    T extends {
        status: 'UP' | 'DOWN'
        error: string
    },
>(
    ms: number,
): Promise<T> =>
    new Promise<T>((resolve) =>
        setTimeout(() => resolve({ status: 'DOWN' as const, error: 'Timeout' } as T), ms),
    )

const healthCheckSync = async () => {
    try {
        const metrics = await StreamsMonitorService.instance.healthCheck()
        return metrics
    } catch (error) {
        return { status: 'DOWN' as const, error }
    }
}

const healthCheckPrisma = async () => {
    try {
        const metrics = await database.$metrics.json()
        return { status: 'UP' as const, metrics }
    } catch (error) {
        return { status: 'DOWN' as const, error }
    }
}

publicRoutes.get('/health', async (_req, res) => {
    try {
        const syncMetricsPromise = Promise.race([healthCheckSync(), createTimeoutPromise(5000)])

        const prismaMetricsPromise = Promise.race([healthCheckPrisma(), createTimeoutPromise(5000)])

        const [syncMetricsResult, databaseMetricsResult] = await Promise.all([
            syncMetricsPromise,
            prismaMetricsPromise,
        ])

        const status: Status = {
            Prisma: databaseMetricsResult,
            Sync: syncMetricsResult,
        }

        console.log('Health check', status)

        return res.status(StatusCodes.OK).json(status)
    } catch (error) {
        console.error('Error in health check', error)
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'DOWN',
            error: error,
        })
    }
})
