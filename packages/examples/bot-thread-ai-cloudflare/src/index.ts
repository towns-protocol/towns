import { makeTownsBot } from '@towns-protocol/bot'
import OpenAI from 'openai'
import { ThreadState, type ThreadContext } from './durable-object'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

const shortId = (id: string) => id.slice(0, 4) + '..' + id.slice(-4)

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cloudflare {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface Env extends Bindings {}
    }
}

type Bindings = {
    APP_PRIVATE_DATA_BASE64: string
    JWT_SECRET: string
    OPENAI_API_KEY: string
    RIVER_ENV?: string
    THREAD_STATE: DurableObjectNamespace<ThreadState>
}

type Env = {
    Bindings: Bindings
}

function buildContextMessages(context: ThreadContext): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
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

async function generateAIResponse(openai: OpenAI, context: ThreadContext): Promise<string> {
    const messages = buildContextMessages(context)
    const chatCompletion = await openai.chat.completions.create({
        messages: messages,
        model: 'gpt-4o-mini',
    })
    return chatCompletion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'
}

async function getThreadDurableObject(
    env: Bindings,
    threadId: string,
): Promise<DurableObjectStub<ThreadState>> {
    const id = env.THREAD_STATE.idFromString(threadId)
    return env.THREAD_STATE.get(id)
}

const app = new Hono<Env>()
app.post('/webhook', async (c) => {
    const env = c.env
    const bot = await makeTownsBot<Env>(env.APP_PRIVATE_DATA_BASE64, env.JWT_SECRET, env.RIVER_ENV)
    try {
        const { handler, jwtMiddleware } = await bot.start()
        app.use(jwtMiddleware)
        app.use(logger())
        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        })
        console.log('got here')

        bot.onChannelJoin(async (h, { channelId, userId }) => {
            console.log(`🧵 user ${shortId(userId)} joined channel ${shortId(channelId)}`)
            if (userId === bot.botId) {
                await h.setUsername(channelId, 'thread-ai-bot')
                await h.setDisplayName(channelId, 'Thread AI Bot')
            }
        })

        bot.onMessage(async (h, { message, userId, eventId, channelId }) => {
            console.log(`🧵 new thread: user ${shortId(userId)} sent message:`, message)

            const threadId = eventId
            try {
                const stub = await getThreadDurableObject(env, threadId)

                await stub.startThread(threadId, userId, message)

                const context = await stub.getContext(threadId)
                if (!context) {
                    throw new Error('Failed to create thread context')
                }

                const aiResponse = await generateAIResponse(openai, context)

                await stub.addMessage(threadId, bot.botId, aiResponse)
                await h.sendMessage(channelId, aiResponse, { threadId })
            } catch (error) {
                console.error('Error handling message:', error)
                await h.sendMessage(
                    channelId,
                    'Sorry, I encountered an error processing your message.',
                    { threadId },
                )
            }
        })

        bot.onThreadMessage(async (h, { channelId, threadId, userId, message }) => {
            console.log(`🧵 thread message: user ${shortId(userId)} sent message:`, message)

            try {
                const stub = await getThreadDurableObject(env, threadId)

                await stub.addMessage(threadId, userId, message)

                const context = await stub.getContext(threadId)
                if (!context) {
                    throw new Error('Thread context not found')
                }
                const aiResponse = await generateAIResponse(openai, context)

                await stub.addMessage(threadId, bot.botId, aiResponse)
                await h.sendMessage(channelId, aiResponse, { threadId })
            } catch (error) {
                console.error('Error handling thread message:', error)
                await h.sendMessage(
                    channelId,
                    'Sorry, I encountered an error processing your message.',
                    { threadId },
                )
            }
        })

        return await handler(c)
    } catch (error) {
        console.error('Webhook error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default app
export { ThreadState }
