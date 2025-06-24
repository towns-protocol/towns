/* eslint-disable no-console */
import { serve } from '@hono/node-server'
import { makeTownsBot } from '@towns-protocol/bot'
import { createServer } from 'node:http2'

type State = {
    messageToPoll: {
        [messageId: string]: {
            question: string
            emoji: {
                [emoji: string]: string
            }
            answers: {
                [reactionEventId: string]: [string, string]
            }
        }
    }
    reactionEventIdToMessageId: {
        [reactionEventId: string]: string
    }
}

const state: State = {
    messageToPoll: {},
    reactionEventIdToMessageId: {},
}
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

export const makePollBot = async (...args: Parameters<typeof makeTownsBot>) => {
    const bot = await makeTownsBot(...args)

    bot.onMessage(async (handler, { message, channelId }) => {
        if (!message.startsWith('@poll')) return
        const [question, ...answers] = message.split('|')
        const { eventId: messageId } = await handler.sendMessage(
            channelId,
            buildMessage(question, Object.fromEntries(answers.map((a, i) => [emojis[i], a]))),
        )
        for (const i of answers.sort().map((_, i) => i)) {
            await handler.sendReaction(channelId, messageId, emojis[i])
        }
        console.log(`📊 Started a new poll: ${question}`)
        state.messageToPoll[messageId] = {
            question,
            emoji: Object.fromEntries(answers.map((a, i) => [emojis[i], a.trim()])),
            answers: {},
        }
    })

    const buildMessage = (question: string, emojiToAnswer: Record<string, string>) => {
        return `Poll created: **${question}**\n${Object.entries(emojiToAnswer)
            .map(([emoji, answer]) => `${emoji} - ${answer}`)
            .join('\n')}`
    }

    bot.onReaction(async (handler, { reaction, eventId, channelId, messageId, userId }) => {
        console.log('someone sent a reaction', reaction, messageId)
        if (userId === bot.botId) return
        const poll = state.messageToPoll[messageId]
        if (!poll) return
        const answer = poll.emoji[reaction]
        if (!answer) return
        poll.answers[answer] = poll.answers[answer] || []
        poll.answers[answer].push(userId)
        const { eventId: newMessageId } = await handler.editMessage(
            channelId,
            messageId,
            `${buildMessage(poll.question, poll.emoji)}\n\nPoll results: ${Object.entries(
                countAnswers(messageId) || {},
            )
                .map(([answer, count]) => `${answer} - ${count}`)
                .join('\n')}`,
        )
        console.log(`📊 User ${userId} voted ${answer} in the poll: ${poll.question}`)
        state.messageToPoll[newMessageId] = state.messageToPoll[messageId]
        delete state.messageToPoll[messageId]
        state.reactionEventIdToMessageId[eventId] = newMessageId
    })

    bot.onRedaction(async (handler, { channelId, refEventId, userId }) => {
        console.log('someone redacted a message', refEventId)
        const messageId = state.reactionEventIdToMessageId[refEventId]
        if (!messageId) return
        const poll = state.messageToPoll[messageId]
        if (!poll) return
        delete poll.answers[refEventId]
        delete state.reactionEventIdToMessageId[refEventId]
        console.log(`📊 User ${userId} removed their vote in the poll: ${poll.question}`)
        await handler.editMessage(
            channelId,
            messageId,
            `${buildMessage(poll.question, poll.emoji)}\n\nPoll results: ${Object.entries(
                countAnswers(messageId) || {},
            )
                .map(([answer, count]) => `${answer} - ${count}`)
                .join('\n')}`,
        )
    })

    const countAnswers = (messageId: string) => {
        const poll = state.messageToPoll[messageId]
        if (!poll) return undefined
        const answerCounts = Object.fromEntries(
            Object.values(poll.emoji).map((answer) => [answer, 0]),
        )
        Object.entries(poll.answers).forEach(([answer]) => {
            answerCounts[answer] += 1
        })
        return answerCounts
    }

    return bot
}

async function main() {
    const bot = await makePollBot(
        process.env.APP_PRIVATE_DATA_BASE64!,
        process.env.JWT_SECRET!,
        process.env.RIVER_ENV,
    )
    const { fetch } = await bot.start()
    serve({ fetch, port: parseInt(process.env.PORT!), createServer })
    console.log(`✅ Poll Bot is running on https://localhost:${process.env.PORT}`)
}

void main()
