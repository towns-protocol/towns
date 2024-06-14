import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'
import { dlogger } from '@river-build/dlog'
import { getRandomEmoji } from '../../utils/emoji'
import { getSystemInfo } from '../../utils/systemInfo'
import { channelMessagePostWhere } from '../../utils/timeline'
import { makeSillyMessage } from '../../utils/messages'

export async function joinChat(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger(`stress:joinChat:${client.logId}}`)
    // is user a member of all the channels?
    // is user a member of the space?
    // does user exist on the stream node?

    logger.log('joinChat', client.userId)

    // wait for the user to have a membership nft
    await client.waitFor(
        () => client.spaceDapp.hasSpaceMembership(cfg.spaceId, client.baseProvider.wallet.address),
        {
            interval: 1000 + Math.random() * 1000,
            timeoutMs: cfg.waitForSpaceMembershipTimeoutMs,
        },
    )

    logger.log(`start client #${client.clientIndex}`)

    const announceChannelId = cfg.announceChannelId
    // start up the client
    await startFollowerClient(client, cfg.spaceId, announceChannelId)

    const announceChannel = await client.streamsClient.waitForStream(announceChannelId)
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
                logger.log(
                    `waiting for root message #${client.clientIndex} ${decryptedCount}/${cms.length}`,
                )
            }
            count++
            return announceChannel.view.timeline.find(
                channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
            )
        },
        { interval: 1000, timeoutMs: cfg.waitForChannelDecryptionTimeoutMs },
    )

    if (client.clientIndex === cfg.localClients.startIndex) {
        logger.log('sharing keys')
        await client.streamsClient.cryptoBackend?.ensureOutboundSession(announceChannelId, {
            awaitInitialShareSession: true,
        })
        logger.log('check in with root client')
        await client.sendMessage(
            announceChannelId,
            `c${cfg.containerIndex}p${cfg.processIndex} Starting up! freeMemory: ${
                getSystemInfo().FreeMemory
            } clientStart:${cfg.localClients.startIndex} ${cfg.localClients.endIndex}`,
            { threadId: message.hashStr },
        )
    }

    logger.log('emoji it')

    // emoji it
    await client.sendReaction(announceChannelId, message.hashStr, getRandomEmoji())

    logger.log('join channels')
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
        await client.sendMessage(
            channelId,
            `${makeSillyMessage({ maxWords: 2 })}! ${cfg.sessionId}`,
        )
    }

    logger.log('done')
}

// cruft we need to do for process leader
async function startFollowerClient(
    client: StressClient,
    spaceId: string,
    announceChannelId: string,
) {
    const userExists = await client.userExists()
    if (!userExists) {
        await client.joinSpace(spaceId, { skipMintMembership: true })
    } else {
        const isMember = await client.isMemberOf(spaceId)
        if (!isMember) {
            await client.joinSpace(spaceId, { skipMintMembership: true })
        } else {
            await client.startStreamsClient({ spaceId })
        }
    }

    const isChannelMember = await client.isMemberOf(announceChannelId)
    if (!isChannelMember) {
        await client.streamsClient.joinStream(announceChannelId)
    }
    return announceChannelId
}
