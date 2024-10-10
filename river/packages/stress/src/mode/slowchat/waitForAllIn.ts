import { check } from '@river-build/dlog'
import type { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { isDefined } from '@river-build/sdk'
import { getLogger } from '../../utils/logger'

export async function waitForAllIn(rootClient: StressClient, chatConfig: ChatConfig) {
    check(isDefined(chatConfig.kickoffMessageEventId), 'kickoffMessageEventId')
    const logger = getLogger('stress:waitForAllIn', { logId: rootClient.logId })
    const lastReactionCount = 0
    const timeout = 600000 // 10 minutes
    const startTime = Date.now()

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for all clients to react')
        }
        const reactionCount = countReactions(
            rootClient,
            chatConfig.announceChannelId,
            chatConfig.kickoffMessageEventId,
        )
        if (lastReactionCount !== reactionCount) {
            logger.info(
                { reactionCount, clientsCount: chatConfig.clientsCount },
                'waiting for allin',
            )
        }
        if (reactionCount >= chatConfig.clientsCount) {
            break
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
    }
}

const countReactions = (client: StressClient, announceChannelId: string, rootMessageId: string) => {
    const channel = client.streamsClient.stream(announceChannelId)
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
