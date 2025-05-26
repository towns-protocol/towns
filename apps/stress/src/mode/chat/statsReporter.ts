import type { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'

export function statsReporter(chatConfig: ChatConfig) {
    return {
        logStep: (
            client: StressClient,
            step: string,
            isSuccess: boolean,
            metadata?: Record<string, unknown>,
        ) => {
            client.logger.info(
                {
                    sequence: 'STRESS_RESULT',
                    step,
                    result: isSuccess ? 'PASS' : 'FAIL',
                    metadata,
                },
                'stress step result',
            )
        },
        reactionCounter: (rootClient: StressClient) => {
            let canceled = false
            let lastReactionCount = 0
            const interval = setInterval(() => {
                if (canceled) {
                    return
                }
                void (async () => {
                    if (chatConfig.kickoffMessageEventId && chatConfig.countClientsMessageEventId) {
                        const reactionCount = countReactions(
                            rootClient,
                            chatConfig.announceChannelId,
                            chatConfig.kickoffMessageEventId,
                        )
                        if (canceled) {
                            return
                        }
                        if (lastReactionCount === reactionCount) {
                            return
                        }
                        lastReactionCount = reactionCount
                        await updateCountClients(
                            rootClient,
                            chatConfig.announceChannelId,
                            chatConfig.countClientsMessageEventId,
                            chatConfig.clientsCount,
                            reactionCount,
                        )
                    }
                })()
            }, 5000)
            return () => {
                rootClient.logger.debug('canceled')
                clearInterval(interval)
                canceled = true
            }
        },
    }
}

export const updateCountClients = async (
    rootClient: StressClient,
    announceChannelId: string,
    countClientsMessageEventId: string,
    totalClients: number,
    reactionCounts: number,
) => {
    rootClient.logger.info(`Clients: ${reactionCounts}/${totalClients} 🤖`)
    return await rootClient.streamsClient.sendChannelMessage_Edit_Text(
        announceChannelId,
        countClientsMessageEventId,
        {
            content: {
                body: `Clients: ${reactionCounts}/${totalClients} 🤖`,
                mentions: [],
                attachments: [],
            },
        },
    )
}

export const countReactions = (
    rootClient: StressClient,
    announceChannelId: string,
    rootMessageId: string,
) => {
    const channel = rootClient.streamsClient.stream(announceChannelId)
    if (!channel) {
        return 0
    }
    const message = channel.view.events.get(rootMessageId)
    if (!message) {
        return 0
    }

    const reactions = channel.view.timeline.filter((event) => {
        if (event.localEvent?.channelMessage.payload.case === 'reaction') {
            return event.localEvent?.channelMessage.payload.value.refEventId === rootMessageId
        }
        if (
            event.decryptedContent?.kind === 'channelMessage' &&
            event.decryptedContent?.content.payload.case === 'reaction'
        ) {
            return event.decryptedContent?.content.payload.value.refEventId === rootMessageId
        }
        return
    })

    return reactions.length
}
