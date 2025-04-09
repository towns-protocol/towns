import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { isAddress } from 'viem'
import { useMutation } from '@tanstack/react-query'
import { AppRegistryService } from '@towns-protocol/sdk'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { bin_fromHexString, bin_toHexString } from '@towns-protocol/dlog'
import { LoaderCircleIcon } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SecretInformationBanner } from '../ui/secret-information-banner'

const botFormSchema = z.object({
    address: z.string().refine((x) => isAddress(x), {
        message: 'Must be a valid Ethereum address',
    }),
})

const webhookFormSchema = z.object({
    address: z.string().refine((x) => isAddress(x), {
        message: 'Must be a valid Ethereum address',
    }),
    webhookUrl: z.string().url({
        message: 'Must be a valid URL',
    }),
})

const APP_REGISTRY_URL = 'https://localhost:5180'

type BotFormSchema = z.infer<typeof botFormSchema>
type WebhookFormSchema = z.infer<typeof webhookFormSchema>

export const BotSettingsDialog = ({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const botForm = useForm<BotFormSchema>({
        resolver: zodResolver(botFormSchema),
        defaultValues: {
            address: '' as `0x${string}`,
        },
    })

    const webhookForm = useForm<WebhookFormSchema>({
        resolver: zodResolver(webhookFormSchema),
        defaultValues: {
            address: '' as `0x${string}`,
            webhookUrl: '',
        },
    })

    const signer = useEthersSigner()
    const { address: signerAddress } = useAccount()
    const { userId } = useSyncAgent()

    const registerBotMutation = useMutation({
        mutationFn: async ({ address }: BotFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                APP_REGISTRY_URL,
            )
            const appId = bin_fromHexString(address)
            const { hs256SharedSecret } = await appRegistryRpcClient.register({
                appId,
                appOwnerId: bin_fromHexString(userId),
            })
            return { jwt: bin_toHexString(hs256SharedSecret) }
        },
    })

    const registerWebhookMutation = useMutation({
        mutationFn: async ({ address, webhookUrl }: WebhookFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                APP_REGISTRY_URL,
            )
            const appId = bin_fromHexString(address)
            await appRegistryRpcClient.registerWebhook({
                appId,
                webhookUrl,
            })
        },
    })

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                botForm.reset()
                registerBotMutation.reset()
                webhookForm.reset()
                registerWebhookMutation.reset()
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bot Settings</DialogTitle>
                    <DialogDescription>
                        Register your bot and configure its webhook URL to receive space events.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Bot Registration Form */}
                    <Form {...botForm}>
                        <form
                            className="space-y-4"
                            onSubmit={botForm.handleSubmit(async (data) => {
                                await registerBotMutation.mutateAsync(data)
                            })}
                        >
                            <FormField
                                control={botForm.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bot Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0x..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The public address of your bot
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={registerBotMutation.isPending}
                            >
                                {registerBotMutation.isPending ? (
                                    <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {registerBotMutation.isPending ? 'Registering...' : 'Register Bot'}
                            </Button>

                            {registerBotMutation.data?.jwt && (
                                <>
                                    <SecretInformationBanner>
                                        Store this JWT secret in a secure location.
                                    </SecretInformationBanner>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <p className="text-muted-foreground">JWT Secret</p>
                                        <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                                            {registerBotMutation.data.jwt}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </form>
                    </Form>

                    <div className="my-4 h-px bg-border" />

                    {/* Webhook Registration Form */}
                    <Form {...webhookForm}>
                        <form
                            className="space-y-4"
                            onSubmit={webhookForm.handleSubmit(async (data) => {
                                await registerWebhookMutation.mutateAsync(data)
                                webhookForm.reset()
                            })}
                        >
                            <FormField
                                control={webhookForm.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bot Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0x..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The bot address to register the webhook for
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={webhookForm.control}
                                name="webhookUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Webhook URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The URL where your bot will receive space events
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={registerWebhookMutation.isPending}
                            >
                                {registerWebhookMutation.isPending ? (
                                    <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {registerWebhookMutation.isPending
                                    ? 'Registering...'
                                    : 'Register Webhook'}
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
