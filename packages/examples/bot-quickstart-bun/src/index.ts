import { makeTownsBot } from '@towns-protocol/bot'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import commands from './commands'

const bot = await makeTownsBot(process.env.APP_PRIVATE_DATA!, process.env.JWT_SECRET!, {
    commands,
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

bot.onMentioned(async (handler, { message, channelId, userId, eventId }) => {
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

export default app
