import { ethers } from 'ethers'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { SpaceDapp } from '@towns-protocol/web3'
import {
    Client,
    MockEntitlementsDelegate,
    RiverDbManager,
    makeBaseProvider,
    makeDefaultChannelStreamId,
    makeRiverProvider,
    makeRiverRpcClient,
    makeSignerContext,
    userIdFromAddress,
} from '@towns-protocol/sdk'
import { useMutation } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import { create, toBinary } from '@bufbuild/protobuf'
import { AppPrivateDataSchema } from '@towns-protocol/proto'
import { bin_toBase64 } from '@towns-protocol/dlog'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { useCurrentSpaceId } from '@/hooks/current-space'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { SecretInformationBanner } from '../ui/secret-information-banner'
import { CopyButton } from '../copy-button'

export const MintBotDialog = ({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const signer = useEthersSigner()
    const sync = useSyncAgent()
    const spaceId = useCurrentSpaceId()
    const {
        mutate: mintAndAddBot,
        isPending,
        data,
        error,
        reset,
    } = useMutation({
        mutationFn: async () => {
            if (!signer) {
                return
            }

            const botWallet = ethers.Wallet.createRandom()
            const delegateWallet = ethers.Wallet.createRandom()
            const context = await makeSignerContext(botWallet, delegateWallet)

            const spaceDapp = new SpaceDapp(
                sync.config.riverConfig.base.chainConfig,
                makeBaseProvider(sync.config.riverConfig),
            )
            const riverProvider = makeRiverProvider(sync.config.riverConfig)
            const rpcClient = await makeRiverRpcClient(
                riverProvider,
                sync.config.riverConfig.river.chainConfig,
            )

            const userId = userIdFromAddress(context.creatorAddress)
            const cryptoStore = RiverDbManager.getCryptoDb(userId)

            const { issued } = await spaceDapp.joinSpace(spaceId, botWallet.address, signer)
            if (!issued) {
                throw new Error('Bot could not join the space')
            }

            const botClient = new Client(
                context,
                rpcClient,
                cryptoStore,
                new MockEntitlementsDelegate(),
            )
            await botClient.initializeUser({ spaceId })
            await sync.riverConnection.call((client) => client.joinUser(spaceId, botWallet.address))
            await Promise.all([
                botClient.setUsername(spaceId, `bot-${userId}`),
                botClient.setDisplayName(spaceId, `bot-${userId}`),
            ])
            await botClient.uploadDeviceKeys()
            const channelId = makeDefaultChannelStreamId(spaceId)
            await botClient.joinStream(channelId, {
                skipWaitForUserStreamUpdate: true,
                skipWaitForMiniblockConfirmation: true,
            })
            const userAddress = await signer.getAddress()
            const { streamId } = await botClient.createDMChannel(userAddress)

            const device = await botClient.cryptoBackend?.exportDevice()
            if (!device) {
                throw new Error('Failed to export device')
            }
            const appPrivateDataBase64 = bin_toBase64(
                toBinary(
                    AppPrivateDataSchema,
                    create(AppPrivateDataSchema, {
                        privateKey: botWallet.privateKey,
                        encryptionDevice: device,
                    }),
                ),
            )
            await botClient.waitForStream(streamId)
            await botClient.sendMessage(
                streamId,
                `I'm ready! \n\`\`\` \nAPP_PRIVATE_DATA="${appPrivateDataBase64}"\n\`\`\``,
            )

            return {
                publicKey: botWallet.address,
                appPrivateDataBase64,
            }
        },
    })

    return (
        <Dialog
            open={open}
            onOpenChange={(changed) => {
                reset()
                onOpenChange(changed)
            }}
        >
            <DialogContent>
                <DialogTitle>Mint a new Bot</DialogTitle>
                <DialogDescription>Create and add a bot in this space</DialogDescription>
                {data && (
                    <>
                        <SecretInformationBanner>
                            Store this information in a secure location.
                        </SecretInformationBanner>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="text-muted-foreground">Bot Address:</p>
                            <pre className="overflow-auto whitespace-pre-wrap">
                                {data.publicKey}
                            </pre>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground">Bot Private Data</p>
                                <div className="flex items-center gap-2">
                                    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                        BASE64
                                    </span>
                                    <CopyButton text={data.appPrivateDataBase64} />
                                </div>
                            </div>
                            <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all">
                                {data.appPrivateDataBase64}
                            </pre>
                        </div>
                    </>
                )}
                <Button disabled={isPending || !!data} onClick={() => mintAndAddBot()}>
                    {isPending ? <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isPending ? 'Minting...' : data ? 'Minted' : 'Mint'}
                </Button>
                {error && <p className="text-red-500">{error.message}</p>}
            </DialogContent>
        </Dialog>
    )
}
