import OpenAI from 'openai'
import { makeTownsBot } from '@towns-protocol/bot'
import { serve } from '@hono/node-server'
import { createServer } from 'node:http2'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

type Context = {
    initialPrompt: string
    userId: string
    conversation: { userId: string; message: string }[]
}

type state = {
    [threadId: string]: Context
}
const state = {} as state

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const bot = await makeTownsBot(
    process.env.APP_PRIVATE_DATA_BASE64!,
    process.env.JWT_SECRET!,
    process.env.RIVER_ENV,
)

bot.onMessage(async (h, { message, userId, eventId, channelId }) => {
    console.log(`🧵 new thread: user ${shortId(userId)} sent message:`, message)
    const newThreadId = eventId
    const context = newThread(newThreadId, userId, message)
    const a = await ai(context)
    updateContext(newThreadId, bot.botId, a)
    await h.sendMessage(channelId, a, { threadId: newThreadId })
})

bot.onThreadMessage(async (h, { channelId, threadId, userId, message }) => {
    console.log(`🧵 thread message: user ${shortId(userId)} sent message:`, message)
    const context = updateContext(threadId, userId, message)
    const a = await ai(context)
    updateContext(threadId, bot.botId, a)
    await h.sendMessage(channelId, a, { threadId })
})

const newThread = (messageId: string, userId: string, initialPrompt: string) => {
    const data = { initialPrompt, conversation: [], userId }
    state[messageId] = data
    return data
}

const updateContext = (threadId: string, userId: string, message: string) => {
    const curr = state[threadId]
    curr.conversation.push({ userId, message })
    return curr
}

const buildContextMessage = (
    context: Context,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: `You are a helpful assistant.
             You are currently in a thread with the user.
             Explain the user's message in a way that is easy to understand.
             Try to not send very long messages.
             You are given the following context: ${context.initialPrompt}`,
        },
    ]
    for (const turn of context.conversation) {
        messages.push({
            role: turn.userId === context.userId ? 'user' : 'assistant',
            content: turn.message,
        })
    }
    return messages
}

const ai = async (context: Context) => {
    const messages = buildContextMessage(context)
    const chatCompletion = await openai.chat.completions.create({
        messages: messages,
        model: 'gpt-4.1-nano',
    })

    return chatCompletion.choices[0].message.content ?? ''
}
const shortId = (id: string) => id.slice(0, 4) + '..' + id.slice(-4)

const { jwtMiddleware, handler } = await bot.start()

const app = new Hono()
app.use(logger())
app.post('/webhook', jwtMiddleware, handler)

serve({
    fetch: app.fetch,
    port: parseInt(process.env.PORT!),
    createServer,
})
console.log(`✅ Thread AI Bot is running on https://localhost:${process.env.PORT}`)
