import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { getRandomEmoji } from '../../utils/emoji'
import { getSystemInfo } from '../../utils/systemInfo'
import { channelMessagePostWhere } from '../../utils/timeline'
import { makeSillyMessage } from '../../utils/messages'

export async function joinChat(client: StressClient, cfg: ChatConfig) {
    const logger = client.logger.child({ name: 'joinChat' })

    // is user a member of all the channels?
    // is user a member of the space?
    // does user exist on the stream node?

    logger.info('start joinChat')

    // wait for the user to have a membership nft
    await client.waitFor(
        () => client.spaceDapp.hasSpaceMembership(cfg.spaceId, client.baseProvider.wallet.address),
        {
            interval: 1000 + Math.random() * 1000,
            timeoutMs: cfg.waitForSpaceMembershipTimeoutMs,
        },
    )

    logger.info('start client')

    const announceChannelId = cfg.announceChannelId
    // start up the client
    await startFollowerClient(client, cfg.spaceId, announceChannelId)

    const announceChannel = await client.streamsClient.waitForStream(announceChannelId, {
        timeoutMs: 1000 * 60,
        logId: 'joinChatWaitForAnnounceChannel',
    })
    let count = 0
    const message = await client.waitFor(
        () => {
            if (count % 3 === 0) {
                const cms = announceChannel.view.timeline.filter(
                    (v) =>
                        v.remoteEvent?.event.payload.case === 'channelPayload' &&
                        v.remoteEvent?.event.payload.value?.content.case === 'message',
                )
                const decryptedCount = cms.filter((v) => v.decryptedContent).length
                logger.info({ decryptedCount, totalCount: cms.length }, 'waiting for root message')
            }
            count++
            return announceChannel.view.timeline.find(
                channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
            )
        },
        { interval: 1000, timeoutMs: cfg.waitForChannelDecryptionTimeoutMs },
    )

    if (client.clientIndex === cfg.localClients.startIndex) {
        logger.info('sharing keys')
        await client.streamsClient.cryptoBackend?.ensureOutboundSession(announceChannelId, {
            awaitInitialShareSession: true,
        })
        logger.info('check in with root client')
        await client.sendMessage(
            announceChannelId,
            `c${cfg.containerIndex}p${cfg.processIndex} Starting up! freeMemory: ${
                getSystemInfo().FreeMemory
            } clientStart:${cfg.localClients.startIndex} ${cfg.localClients.endIndex}`,
            { threadId: message.hashStr },
        )
    }

    logger.info('emoji it')

    // emoji it
    await client.sendReaction(announceChannelId, message.hashStr, getRandomEmoji())

    logger.info('join channels')
    for (const channelId of cfg.channelIds) {
        if (
            !client.streamsClient.streams
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .get(client.streamsClient.userStreamId!)
                ?.view.userContent.isJoined(channelId)
        ) {
            await client.streamsClient.joinStream(channelId)
            await client.streamsClient.waitForStream(channelId)
        }
        await client.streamsClient.cryptoBackend?.ensureOutboundSession(channelId, {
            awaitInitialShareSession: true,
        })
        await client.sendMessage(
            channelId,
            `${makeSillyMessage({ maxWords: 2 })}! ${cfg.sessionId}`,
        )
    }

    logger.info('done')
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
