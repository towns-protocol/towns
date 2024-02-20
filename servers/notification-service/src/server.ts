import { initializeApp } from './application/app'
import gracefulShutdown from 'http-graceful-shutdown'

const port = process.env.PORT || 80

try {
    const app = await initializeApp()

    const server = app.listen(port, () => {
        console.log(`notification service is running at http://localhost:${port}`)
    })

    gracefulShutdown(server)
} catch (error) {
    console.error('Failed to start notification service', error)
}
