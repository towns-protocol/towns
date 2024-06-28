import {
    Client,
    RiverDbManager,
    StreamRpcClient,
    makeRiverRpcClient,
    makeSignerContext,
    makeStreamRpcClient,
    userIdFromAddress,
} from '@river-build/sdk'
import { useGetEmbeddedSigner } from '@towns/privy'
import { ethers } from 'ethers'
import { useCallback } from 'react'
import { useChannelId, useSpaceId, useTownsClient, useTownsContext } from 'use-towns-client'

export const useMintBot = () => {
    const { spaceDapp, clientSingleton } = useTownsClient()
    const spaceId = useSpaceId()
    const channelId = useChannelId()
    const getSigner = useGetEmbeddedSigner()
    const { riverProvider, riverConfig } = useTownsContext()

    const mintBot = useCallback(
        async (botName: string, botDisplayName?: string) => {
            const botWallet = ethers.Wallet.createRandom()

            if (!spaceId) {
                throw new Error('spaceId is required for mint bot command')
            }
            if (!spaceDapp) {
                throw new Error('No spaceDapp found')
            }
            const signer = await getSigner()
            if (!signer) {
                throw new Error('No signer found')
            }
            if (!clientSingleton) {
                throw new Error('No clientSingleton found')
            }

            const delegateWallet = ethers.Wallet.createRandom()
            const context = await makeSignerContext(botWallet, delegateWallet)
            let rpcClient: StreamRpcClient

            if (localStorage.getItem('RIVER_RPC_URL')) {
                rpcClient = makeStreamRpcClient(localStorage.getItem('RIVER_RPC_URL') as string)
            } else {
                rpcClient = await makeRiverRpcClient(riverProvider, riverConfig)
            }

            const userId = userIdFromAddress(context.creatorAddress)
            const cryptoDbName = clientSingleton?.cryptoDbName(context)
            const persistenceDbName = clientSingleton?.persistenceDbName(context)
            const cryptoStore = RiverDbManager.getCryptoDb(userId, cryptoDbName)

            const { issued } = await spaceDapp.joinSpace(spaceId, botWallet.address, signer)
            if (!issued) {
                throw new Error('Bot could not join the space')
            }

            const botClient = new Client(
                context,
                rpcClient,
                cryptoStore,
                clientSingleton, // re-using current user's client for entitlement checks for now
                persistenceDbName,
            )
            await botClient.initializeUser({ spaceId })
            await botClient.joinUser(spaceId, botWallet.address)
            const namesUpdatePromises = []
            namesUpdatePromises.push(botClient.setUsername(spaceId, botName))
            if (botDisplayName) {
                namesUpdatePromises.push(botClient.setDisplayName(spaceId, botDisplayName))
            }
            await Promise.all(namesUpdatePromises)
            await botClient.joinStream(channelId, {
                skipWaitForUserStreamUpdate: true,
                skipWaitForMiniblockConfirmation: true,
            })
            const userAddress = await signer.getAddress()
            const { streamId } = await botClient.createDMChannel(userAddress)
            await botClient.waitForStream(streamId)
            await botClient.sendMessage(
                streamId,
                `I'm ready! \n\`\`\` \nMNEMONIC="${botWallet.mnemonic.phrase}"\nSPACE_ID=${spaceId}\nCHANNEL_ID=${channelId}\n\`\`\``,
            )
        },
        [spaceId, spaceDapp, getSigner, clientSingleton, channelId, riverProvider, riverConfig],
    )

    return mintBot
}
