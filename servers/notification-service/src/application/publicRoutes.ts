import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from './prisma'
import { Metrics } from '@prisma/client/runtime/library'
import { StreamsMonitorService } from './services/stream/streamsMonitorService'
import { PingInfo } from './services/stream/syncedStreams'

import asyncHandler from 'express-async-handler'

export const publicRoutes = Router()

type PrismaStatus = {
    status: 'UP' | 'DOWN'
    metrics?: Metrics
    error?: unknown
}

type SyncStatus = {
    status: 'UP' | 'DOWN'
    metrics?: {
        pingSendFailures: number
        pingInfo: PingInfo
    }
    error?: unknown
}

type Status = {
    Prisma: PrismaStatus
    Sync: SyncStatus
}

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

publicRoutes.get(
    '/health',
    asyncHandler(async (req, res) => {
        try {
            const syncMetricsPromise = await healthCheckSync()

            const prismaMetricsPromise = await healthCheckPrisma()

            const [syncMetricsResult, databaseMetricsResult] = await Promise.all([
                syncMetricsPromise,
                prismaMetricsPromise,
            ])

            const status: Status = {
                Prisma: databaseMetricsResult,
                Sync: syncMetricsResult,
            }

            req.logger.info('Health check', status)

            if (status.Prisma.status === 'UP' && status.Sync.status === 'UP') {
                res.status(StatusCodes.OK).json(status)
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(status)
            }
            return
        } catch (error) {
            req.logger.error('Error in health check', error)
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'DOWN',
                error: error,
            })
            return
        }
    }),
)
