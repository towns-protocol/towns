import { serve } from '@hono/node-server'
import { makeTownsBot } from '@towns-protocol/bot'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import commands from './commands'

async function main() {
    const bot = await makeTownsBot(process.env.APP_PRIVATE_DATA!, process.env.JWT_SECRET!, {
        commands,
    })

    bot.onSlashCommand('time', async (handler, { channelId }) => {
        const currentTime = new Date().toLocaleString()
        await handler.sendMessage(channelId, `Current time: ${currentTime} ⏰`)
    })

    bot.onMessage(async (handler, { message, channelId, eventId, createdAt }) => {
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
            const now = new Date()
            await handler.sendMessage(
                channelId,
                `Pong! 🏓 ${now.getTime() - createdAt.getTime()}ms`,
            )
        }

        if (message.toLowerCase().includes('react')) {
            await handler.sendReaction(channelId, eventId, '👍')
        }
    })

    bot.onReaction(async (handler, { reaction, channelId }) => {
        if (reaction === '👋') {
            await handler.sendMessage(channelId, 'Thanks for the wave! 👋')
        }
    })

    bot.onMessage(async (handler, { channelId, isMentioned }) => {
        if (isMentioned) {
            await handler.sendMessage(channelId, 'You mentioned me! 🤖')
        }
    })

    const { jwtMiddleware, handler } = bot.start()

    const app = new Hono()
    app.use(logger())
    app.post('/webhook', jwtMiddleware, handler)

    serve({ fetch: app.fetch, port: parseInt(process.env.PORT!) })
    console.log(`✅ Quickstart Bot is running on https://localhost:${process.env.PORT}`)
}

main().catch((error) => {
    console.error('Failed to start bot:', error)
    process.exit(1)
})
