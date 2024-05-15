import { dlogger } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'

export async function sumarizeChat(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger('stress:sumarizeChat')

    logger.log('sumarizeChat', client.connection.userId)
    const announceChannelId = cfg.announceChannelId
    const defaultChannel = await client.streamsClient.waitForStream(announceChannelId)
    // find the message in the default channel that contains the session id, emoji it
    const message = await client.waitFor(
        () =>
            defaultChannel.view.timeline.find(
                (event) =>
                    (event.decryptedContent?.kind === 'channelMessage' &&
                        event.decryptedContent?.content.payload.case === 'post' &&
                        event.decryptedContent?.content.payload.value.content.case === 'text' &&
                        event.decryptedContent?.content.payload.value.content.value.body.includes(
                            cfg.sessionId,
                        )) ||
                    (event.localEvent?.channelMessage?.payload.case === 'post' &&
                        event.localEvent?.channelMessage?.payload.value.content.case === 'text' &&
                        event.localEvent?.channelMessage?.payload.value.content.value.body.includes(
                            cfg.sessionId,
                        )),
            ),
        { interval: 1000, timeoutMs: cfg.waitForChannelDecryptionTimeoutMs },
    )

    await client.sendMessage(
        announceChannelId,
        `Ending stress test containerIndex: ${cfg.containerIndex} processIndex: ${cfg.processIndex}`,
        { threadId: message.hashStr },
    )
}
