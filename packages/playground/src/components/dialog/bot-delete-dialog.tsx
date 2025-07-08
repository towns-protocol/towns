import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Address } from 'viem'
import { AlertTriangleIcon, LoaderCircleIcon } from 'lucide-react'
import { AppRegistryDapp } from '@towns-protocol/web3'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { makeBaseProvider } from '@towns-protocol/sdk'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { getAllBotsQueryKey } from '@/hooks/useAllBots'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'

export const BotDeleteDialog = ({
    appAddress,
    open,
    onOpenChange,
}: {
    appAddress: Address
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const signer = useEthersSigner()
    const sync = useSyncAgent()
    const queryClient = useQueryClient()
    const baseProvider = makeBaseProvider(sync.config.riverConfig)

    const { reset, mutate, isPending } = useMutation({
        mutationFn: async () => {
            if (!signer) {
                throw new Error('Signer is not available')
            }

            const appRegistryDapp = new AppRegistryDapp(
                sync.config.riverConfig.base.chainConfig,
                baseProvider,
            )
            const latestAppId = await appRegistryDapp.getLatestAppId(appAddress)
            const tx = await appRegistryDapp.removeApp(signer, latestAppId)
            await tx.wait()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getAllBotsQueryKey(sync.userId) })
            onOpenChange(false)
        },
        onError: (error) => {
            console.error(error)
        },
    })

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                if (!open) {
                    reset()
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Bot</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete your bot and
                        remove all its data from our servers.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-md border border-destructive bg-destructive/10 p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangleIcon className="mt-0.5 h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">
                            Once you delete this bot, there is no going back. Please be certain.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" disabled={isPending} onClick={() => mutate()}>
                        {isPending ? (
                            <>
                                <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
