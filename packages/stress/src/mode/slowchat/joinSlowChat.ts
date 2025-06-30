import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { getRandomEmoji } from '../../utils/emoji'
import { channelMessagePostWhere } from '../../utils/timeline'
import { RiverTimelineEvent } from '@towns-protocol/sdk'

export async function joinSlowChat(client: StressClient, cfg: ChatConfig) {
    const logger = client.logger.child({ name: 'joinSlowChat' })
    // is user a member of all the channels?
    // is user a member of the space?
    // does user exist on the stream node?

    logger.info('start joinSlowChat')

    // wait for the user to have a membership nft
    await client.waitFor(
        async () =>
            (
                await client.spaceDapp.getMembershipStatus(cfg.spaceId, [
                    client.baseProvider.wallet.address,
                ])
            ).isMember,
        {
            interval: 1000 + Math.random() * 1000,
            timeoutMs: cfg.waitForSpaceMembershipTimeoutMs,
        },
    )

    logger.info('start client')

    const announceChannelId = cfg.announceChannelId
    // start up the client
    await startFollowerClient(client, cfg.spaceId, announceChannelId)

    const announceChannel = await client.streamsClient.waitForStream(
        announceChannelId,
        {
            timeoutMs: 1000 * 60,
            logId: 'joinChatWaitForAnnounceChannel',
        },
    )
    let count = 0
    const message = await client.waitFor(
        () => {
            if (count % 3 === 0) {
                const cms = announceChannel.view.timeline.filter(
                    (v) =>
                        v.content?.kind === RiverTimelineEvent.ChannelMessage ||
                        v.content?.kind ===
                            RiverTimelineEvent.ChannelMessageEncrypted ||
                        v.content?.kind ===
                            RiverTimelineEvent.ChannelMessageEncryptedWithRef,
                )
                const decryptedCount = cms.filter(
                    (v) =>
                        v.content?.kind === RiverTimelineEvent.ChannelMessage,
                )
                logger.info(
                    { decryptedCount, total: cms.length },
                    'waiting for root message',
                )
            }
            count++
            return announceChannel.view.timeline.find(
                channelMessagePostWhere((value) =>
                    value.body.includes(cfg.sessionId),
                ),
            )
        },
        { interval: 1000, timeoutMs: cfg.waitForChannelDecryptionTimeoutMs },
    )

    if (!cfg.kickoffMessageEventId) {
        cfg.kickoffMessageEventId = message.eventId
    }

    logger.info('emoji it')

    // emoji it
    await client.sendReaction(
        announceChannelId,
        message.eventId,
        getRandomEmoji(),
    )

    logger.info('joined')
}

// cruft we need to do for process leader
async function startFollowerClient(
    client: StressClient,
    spaceId: string,
    announceChannelId: string,
) {
    const userExists = client.userExists()
    if (!userExists) {
        await client.joinSpace(spaceId, { skipMintMembership: true })
    } else {
        const isMember = await client.isMemberOf(spaceId)
        if (!isMember) {
            await client.joinSpace(spaceId, { skipMintMembership: true })
        }
    }

    const isChannelMember = await client.isMemberOf(announceChannelId)
    if (!isChannelMember) {
        await client.streamsClient.joinStream(announceChannelId)
    }
    return announceChannelId
}
