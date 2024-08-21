import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from './prisma'
import { Metrics } from '@prisma/client/runtime/library'
import { StreamsMonitorService, SyncStatus } from './services/stream/streamsMonitorService'
import asyncHandler from 'express-async-handler'

export const publicRoutes = Router()

type PrismaStatus = {
    status: 'UP' | 'DOWN'
    metrics?: Metrics
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

// we resolve the /health endpoint with the complete status object to help with live debugging
// but we log a simplified version of the status object do not pollute the logs
const getLogOutputFromHealthCheckStatus = (status: Status) => {
    const { Prisma, Sync } = status
    return {
        Prisma: Prisma,
        Sync: {
            status: Sync.status,
            metrics: {
                callHistogram: {
                    AddStreamToSync: {
                        total: Sync.metrics?.callHistogram.AddStreamToSync.total,
                    },
                },
            },
        },
    }
}

publicRoutes.get(
    '/health',
    asyncHandler(async (req, res) => {
        try {
            const [syncMetricsResult, databaseMetricsResult] = await Promise.all([
                healthCheckSync(),
                healthCheckPrisma(),
            ])

            const status: Status = {
                Prisma: databaseMetricsResult,
                Sync: { status: syncMetricsResult.status, metrics: syncMetricsResult.metrics },
            }
            const statusLogOutput = getLogOutputFromHealthCheckStatus(status)

            req.logger.info('Health check', statusLogOutput)

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
