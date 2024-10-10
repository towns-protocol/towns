import { StressClient } from '../../utils/stressClient'
import { getSystemInfo } from '../../utils/systemInfo'
import { BigNumber, Wallet } from 'ethers'
import { ChatConfig } from '../common/types'
import { check } from '@river-build/dlog'
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
    await rootClient.streamsClient.cryptoBackend?.ensureOutboundSession(announceChannelId, {
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
        const hasSpaceMembership = await rootClient.spaceDapp.hasSpaceMembership(
            spaceId,
            wallet.address,
        )
        logger.debug({ i, address: wallet.address, hasSpaceMembership }, 'minting membership')
        if (!hasSpaceMembership) {
            const result = await rootClient.spaceDapp.joinSpace(
                spaceId,
                wallet.address,
                rootClient.baseProvider.wallet,
            )
            logger.debug(result, 'minted membership')
            // sleep for > 1 second
            await new Promise((resolve) => setTimeout(resolve, 1100))
        }
    }

    logger.debug('mint random memberships')
    for (let i = 0; i < cfg.randomClients.length; i++) {
        const client = cfg.randomClients[i]
        await mintMembershipForWallet(client.baseProvider.wallet, i)
    }

    // loop over all the clients, mint memberships for them if they're not members
    // via spaceDapp.hasSpaceMembership
    logger.debug('mint memberships')
    for (let i = 0; i < cfg.allWallets.length; i++) {
        const wallet = cfg.allWallets[i]
        await mintMembershipForWallet(wallet, i)
    }
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
