/* eslint-disable no-console */
import { makeTownsBot } from '@towns-protocol/bot'

type State = {
    messageToSurvey: {
        [messageId: string]: {
            question: string // 'Should we implement a poll command?'
            emoji: {
                [emoji: string]: string // emoji -> answer
                // '1️⃣': 'yes'
                // '2️⃣': 'no'
            }
            answers: {
                [reactionEventId: string]: [string, string] // [userId, emoji]
                // 'refEventId': [userId1, 1️⃣]
                // 'refEventId2': [userId2, 2️⃣]
            }
        }
    }
    reactionEventIdToMessageId: {
        [reactionEventId: string]: string
    }
}

const state: State = {
    messageToSurvey: {},
    reactionEventIdToMessageId: {},
}
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

export const makeSurveyBot = async (...args: Parameters<typeof makeTownsBot>) => {
    const bot = await makeTownsBot(...args)

    // @survey should we buy more eth | yes | no
    bot.onMessage(async (handler, { message, channelId }) => {
        if (!message.startsWith('@survey')) return
        const [question, ...answers] = message.split('|')
        const { eventId: messageId } = await handler.sendMessage(
            channelId,
            buildMessage(question, Object.fromEntries(answers.map((a, i) => [emojis[i], a]))),
        )
        for (const i of answers.sort().map((_, i) => i)) {
            await handler.sendReaction(channelId, messageId, emojis[i])
        }
        state.messageToSurvey[messageId] = {
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
        const survey = state.messageToSurvey[messageId]
        if (!survey) return
        const answer = survey.emoji[reaction]
        if (!answer) return
        survey.answers[answer] = survey.answers[answer] || []
        survey.answers[answer].push(userId)
        const { eventId: newMessageId } = await handler.editMessage(
            channelId,
            messageId,
            `${buildMessage(survey.question, survey.emoji)}\n\nPoll results: ${Object.entries(
                countAnswers(messageId) || {},
            )
                .map(([answer, count]) => `${answer} - ${count}`)
                .join('\n')}`,
        )
        // change the messageId to the new eventId
        state.messageToSurvey[newMessageId] = state.messageToSurvey[messageId]
        delete state.messageToSurvey[messageId]
        state.reactionEventIdToMessageId[eventId] = newMessageId
    })

    // I'll need to rethink this. Having trouble wrapping my mind around refEventId -> eventId mapping.
    // i.e mapping a reaction redact to the original reaction event to remove it from the poll.
    bot.onRedaction(async (handler, { channelId, refEventId }) => {
        console.log('someone redacted a message', refEventId)
        const messageId = state.reactionEventIdToMessageId[refEventId]
        if (!messageId) return
        const survey = state.messageToSurvey[messageId]
        if (!survey) return
        delete survey.answers[refEventId]
        delete state.reactionEventIdToMessageId[refEventId]
        await handler.editMessage(
            channelId,
            messageId,
            `${buildMessage(survey.question, survey.emoji)}\n\nPoll results: ${Object.entries(
                countAnswers(messageId) || {},
            )
                .map(([answer, count]) => `${answer} - ${count}`)
                .join('\n')}`,
        )
    })

    const countAnswers = (messageId: string) => {
        const survey = state.messageToSurvey[messageId]
        if (!survey) return undefined
        const answerCounts = Object.fromEntries(
            Object.values(survey.emoji).map((answer) => [answer, 0]),
        )
        Object.entries(survey.answers).forEach(([answer]) => {
            answerCounts[answer] += 1
        })
        return answerCounts
    }

    return bot
}
