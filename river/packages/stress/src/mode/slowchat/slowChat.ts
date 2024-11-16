import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { RiverTimelineEvent, type TimelineEvent } from '@river-build/sdk'
import { getLogger } from '../../utils/logger'

export async function slowChat(client: StressClient, chatConfig: ChatConfig) {
    const logger = getLogger('stress:slowChat', { logId: client.logId })
    const channelId = chatConfig.announceChannelId
    const start = Date.now()
    const end = start + chatConfig.duration * 1000
    // process leaders:
    const processLeaders = Array.from(
        { length: chatConfig.processesPerContainer * chatConfig.containerCount },
        (_, i) => i,
    ).map((i) => i * chatConfig.clientsPerProcess)
    if (client.clientIndex === 0) {
        logger.info({ processLeaders }, 'processLeaders')
    }
    // if we have more process leaders than intervals we need to adjust logic
    if (processLeaders.length > 12) {
        throw new Error('too many process leaders')
    }
    const isProcessLeader = processLeaders.includes(client.clientIndex)
    // create a frequency - if duration is less than 1 hour, run every minute with 5 seconds delay, if greater than 1 hour, run every hour with 5 minute delay
    const period = chatConfig.duration <= 3600 ? 1000 * 60 : 1000 * 60 * 60
    const frequency = chatConfig.duration <= 3600 ? 1000 * 5 : 1000 * 60 * 5
    // expected messages:
    let sendAt = 0
    let count = 0
    const expectedMessages = []
    while (sendAt < chatConfig.duration * 1000) {
        const byClient = processLeaders[count % processLeaders.length]
        expectedMessages.push({
            sendAt,
            byClient,
            message: `message ${chatConfig.sessionId}:${count}`,
        })
        count++
        if (byClient === processLeaders[processLeaders.length - 1]) {
            sendAt += period - frequency * processLeaders.length
        } else {
            sendAt += frequency
        }
    }

    if (client.clientIndex === 0) {
        logger.info({ expectedMessages }, 'expected messages')
    }

    const sentMessages: string[] = []
    const seenMessages: string[] = []

    while (Date.now() < end) {
        const messages = client.agent.spaces
            .getSpace(chatConfig.spaceId)
            .getChannel(channelId)
            .timeline.events.value.filter((event) =>
                checkTextInMessageEvent(event, `${chatConfig.sessionId}:`),
            )
        for (const message of messages) {
            const messageBody =
                message.content?.kind === RiverTimelineEvent.RoomMessage
                    ? message.content?.body
                    : ''
            if (!seenMessages.includes(messageBody)) {
                seenMessages.push(messageBody)
            }
        }

        if (isProcessLeader) {
            // do the stupid thing
            for (const toSend of expectedMessages) {
                if (
                    toSend.byClient === client.clientIndex &&
                    start + toSend.sendAt < Date.now() &&
                    !sentMessages.includes(toSend.message)
                ) {
                    logger.info({ message: toSend.message }, 'sending message')
                    sentMessages.push(toSend.message)
                    await client.sendMessage(channelId, toSend.message)
                }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    logger.info({ clientIndex: client.clientIndex, sentMessages, seenMessages }, 'result')
}

const checkTextInMessageEvent = (event: TimelineEvent, message: string) =>
    event.content?.kind === RiverTimelineEvent.RoomMessage && event.content?.body.includes(message)
