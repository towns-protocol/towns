import gracefulShutdown from 'http-graceful-shutdown'
import { initializeApp } from './application/app'
import { env } from './application/utils/environment'
import { StreamsMonitorService } from './application/services/stream/streamsMonitorService'
import { logger } from './application/logger'

const port = env.PORT

logger.info('Starting notification service', process.env.NOTIFICATION_DATABASE_URL)

const run = async () => {
    try {
        const app = await initializeApp()

        const server = app.listen(port, () => {
            logger.info(`notification service is running at http://localhost:${port}`)
        })

        // start syncing streams
        try {
            await StreamsMonitorService.instance.startMonitoringStreams()
        } catch (error) {
            logger.error('Failed to start monitoring streams', error)
        }

        gracefulShutdown(server, {
            onShutdown: async () => {
                await StreamsMonitorService.instance.stopMonitoringStreams()
            },
            finally: () => {
                logger.info('Notification service is shutting down')
            },
        })
    } catch (error) {
        logger.error('Failed to start notification service', error)
    }
}

run().catch((error) => {
    logger.error('Failed to start notification service', error)
    process.exit(1)
})
