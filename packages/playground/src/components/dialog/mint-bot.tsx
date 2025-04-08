import { ethers } from 'ethers'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { SpaceDapp } from '@towns-protocol/web3'
import { makeBaseProvider } from '@towns-protocol/sdk'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, LoaderCircleIcon } from 'lucide-react'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { useCurrentSpaceId } from '@/hooks/current-space'
import { DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'

export const MintBotDialog = () => {
    const signer = useEthersSigner()
    const sync = useSyncAgent()
    const spaceId = useCurrentSpaceId()

    const { mutate, isPending, data } = useMutation({
        mutationFn: async () => {
            if (!signer) {
                return
            }
            const spaceDapp = new SpaceDapp(
                sync.config.riverConfig.base.chainConfig,
                makeBaseProvider(sync.config.riverConfig),
            )

            const { mnemonic, address: publicKey } = ethers.Wallet.createRandom()
            await spaceDapp.joinSpace(spaceId, publicKey, signer)
            return { mnemonic, publicKey }
        },
    })

    return (
        <DialogContent>
            <DialogTitle>Mint a new Bot</DialogTitle>
            <DialogDescription>
                This action will result in the creation of a wallet and the bot will be added to the
                space
            </DialogDescription>
            <Button disabled={isPending} onClick={() => mutate()}>
                {isPending ? <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Minting...' : 'Mint'}
            </Button>
            {data && (
                <>
                    <div className="flex items-center gap-2 rounded-sm bg-red-50 p-2 text-sm text-red-500 dark:bg-red-900/50">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <p>Store this information in a secure location.</p>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                        <p className="text-muted-foreground">Bot address:</p>
                        <pre className="overflow-auto whitespace-pre-wrap">{data.publicKey}</pre>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                        <p className="text-muted-foreground">Bot mnemonic:</p>
                        <pre className="overflow-auto whitespace-pre-wrap">
                            {data.mnemonic.phrase}
                        </pre>
                    </div>
                </>
            )}
        </DialogContent>
    )
}
