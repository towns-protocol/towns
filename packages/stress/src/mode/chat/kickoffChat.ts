import { StressClient } from '../../utils/stressClient'
import { getSystemInfo } from '../../utils/systemInfo'
import { BigNumber, Wallet } from 'ethers'
import { ChatConfig } from '../common/types'
import { check } from '@towns-protocol/dlog'
import { makeCodeBlock } from '../../utils/messages'

export async function kickoffChat(rootClient: StressClient, cfg: ChatConfig) {
    const logger = rootClient.logger.child({ name: 'kickoffChat' })
    logger.info('start kickoffChat')
    check(rootClient.clientIndex === 0, 'rootClient.clientIndex === 0')
    const globalRunIndex = parseInt(
        (await cfg.globalPersistedStore?.get('stress_global_run_index').catch(() => undefined)) ??
            '0',
    )
    await cfg.globalPersistedStore?.set('stress_global_run_index', `${globalRunIndex + 1}`)

    const { spaceId, sessionId } = cfg
    const balance = await rootClient.baseProvider.wallet.getBalance()
    const announceChannelId = cfg.announceChannelId
    logger.debug('start client')
    await startRootClient(rootClient, balance, spaceId, announceChannelId)

    await rootClient.streamsClient.waitForStream(announceChannelId)

    logger.debug('share keys')
    const shareKeysStart = Date.now()
    await rootClient.streamsClient.ensureOutboundSession(announceChannelId, {
        awaitInitialShareSession: true,
    })
    const shareKeysDuration = Date.now() - shareKeysStart

    logger.debug('send message')
    const { eventId: kickoffMessageEventId } = await rootClient.sendMessage(
        announceChannelId,
        `hello, we're starting the stress test now!, containers: ${cfg.containerCount} ppc: ${cfg.processesPerContainer} clients: ${cfg.clientsCount} randomNewClients: ${cfg.randomClients.length} sessionId: ${sessionId}`,
    )
    const { eventId: countClientsMessageEventId } = await rootClient.sendMessage(
        cfg.announceChannelId,
        `Clients: 0/${cfg.clientsCount} 🤖`,
    )

    cfg.kickoffMessageEventId = kickoffMessageEventId
    cfg.countClientsMessageEventId = countClientsMessageEventId

    const initialStats = {
        timeToShareKeys: shareKeysDuration + 'ms',
        walletBalance: balance.toString(),
        testDuration: cfg.duration,
        clientsCount: cfg.clientsCount,
        globalRunIndex,
    }

    logger.debug('start thread')
    await rootClient.sendMessage(
        announceChannelId,
        `System Info: ${makeCodeBlock(getSystemInfo())} Initial Stats: ${makeCodeBlock(
            initialStats,
        )}`,
        { threadId: kickoffMessageEventId },
    )

    const mintMembershipForWallet = async (wallet: Wallet, i: number) => {
        const hasSpaceMembership = (
            await rootClient.spaceDapp.getMembershipStatus(spaceId, [wallet.address])
        ).isMember
        logger.debug({ i, address: wallet.address, hasSpaceMembership }, 'minting membership')
        if (!hasSpaceMembership) {
            const result = await rootClient.spaceDapp.joinSpace(
                spaceId,
                wallet.address,
                rootClient.baseProvider.wallet,
            )
            logger.debug(
                {
                    ...result,
                    address: wallet.address,
                    clientIndex: i,
                },
                'minted membership for client',
            )
        }
    }

    logger.debug('mint random memberships')
    const randomMintPromises = cfg.randomClients.map((client, i) =>
        mintMembershipForWallet(client.baseProvider.wallet, i),
    )
    await Promise.all(randomMintPromises)

    // loop over all the clients, and mint memberships for them if they're not members
    // via spaceDapp.hasSpaceMembership
    logger.debug('mint memberships')
    const BATCH_SIZE = 10 // Process 10 wallets at a time
    for (let i = 0; i < cfg.allWallets.length; i += BATCH_SIZE) {
        const batch = cfg.allWallets.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((wallet, index) =>
            mintMembershipForWallet(wallet, i + index),
        )
        await Promise.all(batchPromises)
        logger.debug(
            `Minted memberships for batch ${i / BATCH_SIZE + 1} of ${Math.ceil(cfg.allWallets.length / BATCH_SIZE)}`,
        )
    }

    // Signal to all follower clients that membership minting is complete
    logger.debug('signaling membership minting complete')
    await rootClient.sendMessage(announceChannelId, `MEMBERSHIPS_MINTED:${sessionId}`, {
        threadId: kickoffMessageEventId,
    })

    logger.info('kickoffChat done')
}

// cruft we need to do for root user
async function startRootClient(
    client: StressClient,
    balance: BigNumber,
    spaceId: string,
    defaultChannelId: string,
) {
    const userExists = client.userExists()
    if (!userExists) {
        if (balance.lte(0)) {
            throw new Error('Insufficient balance')
        }
        await client.joinSpace(spaceId)
    } else {
        const isMember = await client.isMemberOf(spaceId)
        if (!isMember) {
            await client.joinSpace(spaceId)
        }
    }

    const isChannelMember = await client.isMemberOf(defaultChannelId)
    if (!isChannelMember) {
        await client.streamsClient.joinStream(defaultChannelId)
    }
    return defaultChannelId
}
