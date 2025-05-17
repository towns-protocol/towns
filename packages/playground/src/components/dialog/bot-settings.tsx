import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { isAddress } from 'viem'
import { useMutation } from '@tanstack/react-query'
import { AppRegistryService } from '@towns-protocol/sdk'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { bin_fromHexString, bin_toBase64, bin_toString } from '@towns-protocol/dlog'
import { LoaderCircleIcon } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ForwardSettingValue } from '@towns-protocol/proto'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { SecretInformationBanner } from '../ui/secret-information-banner'

const messageForwardingLabel = {
    [ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES]: 'All Messages',
    [ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS]:
        'Mentions, Replies & Reactions',
    [ForwardSettingValue.FORWARD_SETTING_NO_MESSAGES]: 'No Messages',
}

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

const appSettingsFormSchema = z.object({
    address: z.string().refine((x) => isAddress(x), {
        message: 'Must be a valid Ethereum address',
    }),
    forwardSetting: z.nativeEnum(ForwardSettingValue),
})

const APP_REGISTRY_URL = 'https://localhost:5180'

type BotFormSchema = z.infer<typeof botFormSchema>
type WebhookFormSchema = z.infer<typeof webhookFormSchema>
type AppSettingsFormSchema = z.infer<typeof appSettingsFormSchema>

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

    const appSettingsForm = useForm<AppSettingsFormSchema>({
        resolver: zodResolver(appSettingsFormSchema),
        defaultValues: {
            address: '' as `0x${string}`,
            forwardSetting: ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
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
            // Convert the Uint8Array secret to a Base64 string for display and copy-paste
            return { jwtSecretBase64: bin_toBase64(hs256SharedSecret) }
        },
        onSuccess: () => {
            botForm.reset()
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
        onSuccess: () => {
            registerWebhookMutation.reset()
        },
    })

    const updateSettingsMutation = useMutation({
        mutationFn: async ({ address, forwardSetting }: AppSettingsFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                APP_REGISTRY_URL,
            )
            const appId = bin_fromHexString(address)
            await appRegistryRpcClient.setAppSettings({
                appId,
                settings: {
                    forwardSetting,
                },
            })
        },
        onSuccess: () => {
            appSettingsForm.reset()
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
                appSettingsForm.reset()
                updateSettingsMutation.reset()
            }}
        >
            <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-md">
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

                            {registerBotMutation.data?.jwtSecretBase64 && (
                                <>
                                    <SecretInformationBanner>
                                        Store this Base64 encoded JWT secret in a secure location.
                                    </SecretInformationBanner>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <p className="text-muted-foreground">
                                            JWT Secret (Base64 Encoded)
                                        </p>
                                        <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                                            {registerBotMutation.data.jwtSecretBase64}
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

                    <div className="my-4 h-px bg-border" />

                    {/* App Settings Form */}
                    <Form {...appSettingsForm}>
                        <form
                            className="space-y-4"
                            onSubmit={appSettingsForm.handleSubmit(async (data) => {
                                await updateSettingsMutation.mutateAsync(data)
                            })}
                        >
                            <FormField
                                control={appSettingsForm.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bot Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0x..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The bot address to update settings for
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={appSettingsForm.control}
                                name="forwardSetting"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message Forwarding</FormLabel>
                                        <Select
                                            value={field.value.toString()}
                                            onValueChange={(value) => field.onChange(Number(value))}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select message forwarding setting" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(messageForwardingLabel).map(
                                                    ([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Choose which messages to forward to your bot
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={updateSettingsMutation.isPending}
                            >
                                {updateSettingsMutation.isPending ? (
                                    <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {updateSettingsMutation.isPending
                                    ? 'Updating...'
                                    : 'Update Settings'}
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
