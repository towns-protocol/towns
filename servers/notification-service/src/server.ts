import gracefulShutdown from 'http-graceful-shutdown'
import { initializeApp } from './application/app'
import { env } from './application/utils/environment'
import { StreamsMonitorService } from './application/services/stream/streamsMonitorService'
import { notificationServiceLogger } from './application/logger'

const port = env.PORT

notificationServiceLogger.info('Starting notification service', env.NOTIFICATION_DATABASE_URL)

const run = async () => {
    try {
        const startSync = Date.now()

        await StreamsMonitorService.instance.startMonitoringStreams()

        notificationServiceLogger.info('Streams monitoring started in', {
            duration: Date.now() - startSync,
        })

        const start = Date.now()
        const app = await initializeApp()

        const server = app.listen(port, () => {
            notificationServiceLogger.info(
                `notification service is running at http://localhost:${port}`,
            )
        })
        notificationServiceLogger.info('Server started in', { duration: Date.now() - start })

        gracefulShutdown(server, {
            onShutdown: async () => {
                await StreamsMonitorService.instance.stopMonitoringStreams()
            },
            finally: () => {
                notificationServiceLogger.info('Notification service is shutting down')
            },
        })
    } catch (error) {
        notificationServiceLogger.error('Failed to start notification service', error)
    }
}

run().catch((error) => {
    notificationServiceLogger.error('Failed to start notification service', error)
    process.exit(1)
})
