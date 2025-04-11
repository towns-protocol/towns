// /// USAGE
// // user1: @survey_bot should we buy more eth | yes | no
// // survey_bot:
// //    Poll created: **Should we buy more eth?**
// //       - 1️⃣ - yes
// //       - 2️⃣ - no
// // user1: * reacts with 1️⃣
// // user2: * reacts with 1️⃣
// // user3: * reacts with 2️⃣
// // survey_bot updates the same message with the results
// //  Poll created: **Should we buy more eth?**
// //       - 1️⃣ - yes
// //       - 2️⃣ - no
// //       - Poll results:
// //          - yes - 2
// //          - no - 1

// import { makeTownsBot } from './bot'
// const bot = await makeTownsBot(
//     '<private-key>',
//     '<encryption-device-base64>',
//     '<jwt-secret>',
//     'local_multi',
// )

// type State = {
//     messageToSurvey: {
//         [messageId: string]: {
//             question: string // 'Should we implement a poll command?'
//             emoji: {
//                 [emoji: string]: string // emoji -> answer
//                 // '1️⃣': 'yes'
//                 // '2️⃣': 'no'
//             }
//             answers: {
//                 [reactionEventId: string]: [string, string] // [userId, emoji]
//                 // 'refEventId': [userId1, 1️⃣]
//                 // 'refEventId2': [userId2, 2️⃣]
//             }
//         }
//     }
//     reactionEventIdToMessageId: {
//         [reactionEventId: string]: string
//     }
// }

// const state: State = {
//     messageToSurvey: {},
//     reactionEventIdToMessageId: {},
// }

// const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

// // Maybe instead of awaiting promises here, we should enqueue handler actions and process them in the main bot loop?
// // Bad part is that we can't Promise.all every handler action, since it could be a dependency of another one?
// // but I mean, you could use a .then() chain and solve this.

// // @survey should we buy more eth | yes | no
// bot.onMessage(async (handler, { message, channelId }) => {
//     if (!message.startsWith('@survey')) return
//     const [question, ...answers] = message.split('|')
//     // Would it be possible to batch sendMessage + sendReaction?
//     const { eventId: messageId } = await handler.sendMessage(
//         channelId,
//         buildMessage(question, Object.fromEntries(answers.map((a, i) => [emojis[i], a]))),
//     )
//     await Promise.all(
//         answers.map((_, i) => {
//             handler.sendReaction(channelId, messageId, emojis[i])
//         }),
//     )
//     state.messageToSurvey[messageId] = {
//         question,
//         emoji: Object.fromEntries(answers.map((a, i) => [emojis[i], a])),
//         answers: {},
//     }
// })

// const buildMessage = (question: string, emojiToAnswer: Record<string, string>) => {
//     return `Poll created: **${question}**\n${Object.entries(emojiToAnswer)
//         .map(([emoji, answer]) => `${emoji} - ${answer}`)
//         .join('\n')}`
// }

// bot.onReaction(async (handler, { reaction, channelId, messageId, userId }) => {
//     if (userId === bot.botId) return
//     const survey = state.messageToSurvey[messageId]
//     if (!survey) return
//     const answer = survey.emoji[reaction]
//     if (!answer) return
//     survey.answers[answer] = survey.answers[answer] || []
//     survey.answers[answer].push(userId)
//     await handler.editMessage(
//         channelId,
//         messageId,
//         `${buildMessage(survey.question, survey.emoji)}\n\nPoll results: ${countAnswers(
//             messageId,
//         )}`,
//     )
// })

// bot.onRedact(async (handler, { channelId, refEventId }) => {
//     const messageId = state.reactionEventIdToMessageId[refEventId]
//     if (!messageId) return
//     const survey = state.messageToSurvey[messageId]
//     if (!survey) return
//     delete survey.answers[refEventId]
//     delete state.reactionEventIdToMessageId[refEventId]
//     await handler.editMessage(
//         channelId,
//         messageId,
//         `${buildMessage(survey.question, survey.emoji)}\n\nPoll results: ${Object.entries(
//             countAnswers(messageId) || {},
//         )
//             .map(([answer, count]) => `${answer} - ${count}`)
//             .join('\n')}`,
//     )
// })

// const countAnswers = (messageId: string) => {
//     const survey = state.messageToSurvey[messageId]
//     if (!survey) return
//     const answerCounts: Record<string, number> = {}
//     Object.values(survey.emoji).forEach((answer) => {
//         answerCounts[answer] = 0
//     })
//     Object.values(survey.answers).forEach(([_, emoji]) => {
//         const answer = survey.emoji[emoji]
//         answerCounts[answer]++
//     })
//     return answerCounts
// }
