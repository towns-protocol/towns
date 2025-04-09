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
import { toBinary } from '@bufbuild/protobuf'
import { ExportedDeviceSchema } from '@towns-protocol/proto'
import { bin_toBase64 } from '@towns-protocol/dlog'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { useCurrentSpaceId } from '@/hooks/current-space'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { SecretInformationBanner } from '../ui/secret-information-banner'

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
            await botClient.joinUser(spaceId, botWallet.address)
            await Promise.all([
                botClient.setUsername(spaceId, `bot-${userId}`),
                botClient.setDisplayName(spaceId, `bot-${userId}`),
            ])
            await botClient.bot_I_will_move_this_function_into_another_place_soon_pushDeviceToStream()
            const channelId = makeDefaultChannelStreamId(spaceId)
            await botClient.joinStream(channelId, {
                skipWaitForUserStreamUpdate: true,
                skipWaitForMiniblockConfirmation: true,
            })
            const userAddress = await signer.getAddress()
            const { streamId } = await botClient.createDMChannel(userAddress)
            const encryptionDevice = await botClient.cryptoBackend?.exportDevice()
            if (!encryptionDevice) {
                throw new Error('Failed to export encryption device')
            }
            const encryptionDeviceBase64 = bin_toBase64(
                toBinary(ExportedDeviceSchema, encryptionDevice),
            )
            await botClient.waitForStream(streamId)
            await botClient.sendMessage(
                streamId,
                `I'm ready! \n\`\`\` \nMNEMONIC="${botWallet.mnemonic.phrase}"\nPUBLIC_KEY="${botWallet.address}"\nENCRYPTION_DEVICE="${encryptionDeviceBase64}"\n\`\`\``,
            )

            return {
                publicKey: botWallet.address,
                mnemonic: botWallet.mnemonic.phrase,
                encryptionDeviceBase64,
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
                            <p className="text-muted-foreground">Bot address:</p>
                            <pre className="overflow-auto whitespace-pre-wrap">
                                {data.publicKey}
                            </pre>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="text-muted-foreground">Bot mnemonic:</p>
                            <pre className="overflow-auto whitespace-pre-wrap">{data.mnemonic}</pre>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex justify-between">
                                <p className="text-muted-foreground">Bot Encryption Device</p>
                                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                    BASE64
                                </span>
                            </div>
                            <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all">
                                {data.encryptionDeviceBase64}
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
