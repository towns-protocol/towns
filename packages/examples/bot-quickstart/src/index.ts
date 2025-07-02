import { serve } from '@hono/node-server'
import { makeTownsBot } from '@towns-protocol/bot'
import { createServer } from 'node:http2'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

async function main() {
    const bot = await makeTownsBot(
        process.env.APP_PRIVATE_DATA_BASE64!,
        process.env.JWT_SECRET!,
        process.env.RIVER_ENV,
    )

    bot.onChannelJoin(async (handler, { channelId, userId }) => {
        if (userId === bot.botId) {
            await handler.setUsername(channelId, 'quickstart-bot')
            await handler.setDisplayName(channelId, 'Quickstart Bot')
        }
    })

    bot.onMessage(async (handler, { message, channelId, userId, eventId }) => {
        if (userId === bot.botId) return

        if (message.toLowerCase().includes('hello')) {
            await handler.sendMessage(channelId, 'Hello there! 👋')
        }

        if (message.toLowerCase().includes('help')) {
            await handler.sendMessage(
                channelId,
                'I can respond to:\n• "hello" - I\'ll greet you back\n• "ping" - I\'ll respond with pong\n• "time" - I\'ll tell you the current time',
            )
        }

        if (message.toLowerCase().includes('ping')) {
            await handler.sendMessage(channelId, 'Pong! 🏓')
        }

        if (message.toLowerCase().includes('time')) {
            const currentTime = new Date().toLocaleString()
            await handler.sendMessage(channelId, `Current time: ${currentTime} ⏰`)
        }

        if (message.toLowerCase().includes('react')) {
            await handler.sendReaction(channelId, eventId, '👍')
        }
    })

    bot.onReaction(async (handler, { reaction, channelId, userId }) => {
        if (userId === bot.botId) return

        if (reaction === '👋') {
            await handler.sendMessage(channelId, 'Thanks for the wave! 👋')
        }
    })

    const { jwtMiddleware, handler } = await bot.start()

    const app = new Hono()
    app.use(logger())
    app.post('/webhook', jwtMiddleware, handler)

    serve({
        fetch: app.fetch,
        port: parseInt(process.env.PORT!),
        createServer,
    })
    console.log(`✅ Quickstart Bot is running on https://localhost:${process.env.PORT}`)
}

main().catch((error) => {
    console.error('Failed to start bot:', error)
    process.exit(1)
})
