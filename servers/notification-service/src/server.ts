import gracefulShutdown from 'http-graceful-shutdown'
import { initializeApp } from './application/app'
import { env } from './application/utils/environment'
import { StreamsMonitorService } from './application/services/stream/streamsMonitorService'

const port = env.PORT

try {
    const app = await initializeApp()
    const streamMonitorService = new StreamsMonitorService()

    const server = app.listen(port, () => {
        console.log(`notification service is running at http://localhost:${port}`)
    })

    // start syncing streams
    try {
        await streamMonitorService.startMonitoringStreams()
    } catch (error) {
        console.error('Failed to start monitoring streams', error)
    }

    gracefulShutdown(server, {
        onShutdown: async () => {
            await streamMonitorService.stopMonitoringStreams()
        },
        finally: () => {
            console.log('Notification service is shutting down')
        },
    })
} catch (error) {
    console.error('Failed to start notification service', error)
}
