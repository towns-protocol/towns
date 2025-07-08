import { DurableObject } from 'cloudflare:workers'

export interface ThreadContext {
    initialPrompt: string
    threadId: string
    userId: string
    conversation: { userId: string; message: string }[]
}

const makeKey = (threadId: string) => `thread:${threadId}`

export class ThreadState extends DurableObject {
    constructor(ctx: DurableObjectState, env: unknown) {
        super(ctx, env)
    }

    async startThread(threadId: string, userId: string, initialPrompt: string) {
        return this.ctx.storage.put<ThreadContext>(makeKey(threadId), {
            threadId,
            userId,
            initialPrompt,
            conversation: [],
        })
    }

    async addMessage(threadId: string, userId: string, message: string) {
        const key = makeKey(threadId)
        const context = await this.ctx.storage.get<ThreadContext>(key)
        if (!context) {
            throw new Error('Thread not found')
        }
        const newContext = {
            ...context,
            conversation: [...context.conversation, { userId, message }],
        }
        return this.ctx.storage.put<ThreadContext>(key, newContext)
    }

    async getContext(threadId: string) {
        return this.ctx.storage.get<ThreadContext>(makeKey(threadId))
    }
}
