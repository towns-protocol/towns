import { StressClient } from '../../utils/stressClient'
import { getSystemInfo } from '../../utils/systemInfo'
import { BigNumber } from 'ethers'
import { ChatConfig } from './types'
import { check, dlogger } from '@river-build/dlog'

const logger = dlogger('stress:kickoffChat')

export async function kickoffChat(rootClient: StressClient, cfg: ChatConfig) {
    logger.log('kickoffChat', rootClient.connection.userId)
    check(rootClient.clientIndex === 0, 'rootClient.clientIndex === 0')
    const { spaceId, sessionId } = cfg
    const balance = await rootClient.connection.baseProvider.wallet.getBalance()
    const announceChannelId = cfg.announceChannelId
    logger.log('start client')
    await startRootClient(rootClient, balance, spaceId, announceChannelId)

    await rootClient.streamsClient.waitForStream(announceChannelId)

    logger.log('share keys')
    const shareKeysStart = Date.now()
    await rootClient.streamsClient.cryptoBackend?.ensureOutboundSession(announceChannelId, {
        awaitInitialShareSession: true,
    })
    const shareKeysDuration = Date.now() - shareKeysStart

    logger.log('send message')
    const eventId = await rootClient.sendMessage(
        announceChannelId,
        `hello, we're starting the stress test now!, containers: ${cfg.containerCount} ppc: ${cfg.processesPerContainer} clients: ${cfg.clientsCount} sessionId: ${sessionId}`,
    )

    const initialStats = JSON.stringify(
        {
            timeToShareKeys: shareKeysDuration + 'ms',
            walletBalance: balance.toString(),
            testDuration: cfg.duration,
            clientsCount: cfg.clientsCount,
        },
        null,
        2,
    )

    const systemInfo = JSON.stringify(getSystemInfo(), null, 2)
    const ticks = '```'

    logger.log('start thread')
    await rootClient.sendMessage(
        announceChannelId,
        `System Info:<br>\n ${ticks}\n ${systemInfo}\n ${ticks}\n Initial Stats:<br>\n ${ticks}\n ${initialStats}\n ${ticks}\n`,
        { threadId: eventId },
    )

    logger.log('mint memberships')
    // loop over all the clients, mint memberships for them if they're not members
    // via spaceDapp.hasSpaceMembership
    for (let i = 0; i < cfg.allWallets.length; i++) {
        const wallet = cfg.allWallets[i]

        const hasSpaceMembership = await rootClient.spaceDapp.hasSpaceMembership(
            spaceId,
            wallet.address,
        )
        logger.log('minting membership for', i, wallet.address, 'has', hasSpaceMembership)
        if (!hasSpaceMembership) {
            const result = await rootClient.spaceDapp.joinSpace(
                spaceId,
                wallet.address,
                rootClient.connection.baseProvider.wallet,
            )
            logger.log('minted membership', result)
            // sleep for > 1 second
            await new Promise((resolve) => setTimeout(resolve, 1100))
        }
    }
    logger.log('done')
}

// cruft we need to do for root user
async function startRootClient(
    client: StressClient,
    balance: BigNumber,
    spaceId: string,
    defaultChannelId: string,
) {
    const userExists = await client.userExists()
    if (!userExists) {
        if (balance.lte(0)) {
            throw new Error('Insufficient balance')
        }
        await client.joinSpace(spaceId)
    } else {
        const isMember = await client.isMemberOf(spaceId)
        if (!isMember) {
            await client.joinSpace(spaceId)
        } else {
            await client.startStreamsClient()
        }
    }

    const isChannelMember = await client.isMemberOf(defaultChannelId)
    if (!isChannelMember) {
        await client.streamsClient.joinStream(defaultChannelId)
    }
    return defaultChannelId
}
