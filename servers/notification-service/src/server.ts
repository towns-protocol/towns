import gracefulShutdown from 'http-graceful-shutdown'
import { initializeApp } from './application/app'
import { env } from './application/utils/environment'
import { streamMonitorService } from './application/services/stream/streamsMonitorService'
import { logger } from './application/logger'

const port = env.PORT

try {
    const app = await initializeApp()

    const server = app.listen(port, () => {
        logger.info(`notification service is running at http://localhost:${port}`)
    })

    // start syncing streams
    try {
        await streamMonitorService.startMonitoringStreams()
    } catch (error) {
        logger.error('Failed to start monitoring streams', error)
    }

    gracefulShutdown(server, {
        onShutdown: async () => {
            await streamMonitorService.stopMonitoringStreams()
        },
        finally: () => {
            logger.info('Notification service is shutting down')
        },
    })
} catch (error) {
    logger.error('Failed to start notification service', error)
}
