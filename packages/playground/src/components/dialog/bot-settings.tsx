import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { type Address } from 'viem'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppRegistryService, getAppRegistryUrl } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { LoaderCircleIcon } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ForwardSettingValue } from '@towns-protocol/proto'
import { useAgentConnection } from '@towns-protocol/react-sdk'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { getAppMetadataQueryKey, useAppMetadata } from '@/hooks/useAppMetadata'
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

const messageForwardingLabel = {
    [ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES]: 'All Messages',
    [ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS]:
        'Mentions, Replies & Reactions',
    [ForwardSettingValue.FORWARD_SETTING_NO_MESSAGES]: 'No Messages',
}

const webhookFormSchema = z.object({
    webhookUrl: z.string().url({
        message: 'Must be a valid URL',
    }),
})

const appSettingsFormSchema = z.object({
    forwardSetting: z.nativeEnum(ForwardSettingValue),
})

const metadataFormSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    description: z.string().optional(),
    imageUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
    avatarUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
    externalUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
})

type WebhookFormSchema = z.infer<typeof webhookFormSchema>
type AppSettingsFormSchema = z.infer<typeof appSettingsFormSchema>
type MetadataFormSchema = z.infer<typeof metadataFormSchema>

export const BotSettingsDialog = ({
    appClientId,
    open,
    onOpenChange,
}: {
    appClientId: Address
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const { data: metadata, isLoading: isLoadingMetadata } = useAppMetadata(appClientId)
    const queryClient = useQueryClient()
    const webhookForm = useForm<WebhookFormSchema>({
        resolver: zodResolver(webhookFormSchema),
        defaultValues: {
            webhookUrl: '',
        },
    })

    const appSettingsForm = useForm<AppSettingsFormSchema>({
        resolver: zodResolver(appSettingsFormSchema),
        defaultValues: {
            forwardSetting: ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
        },
    })

    const metadataForm = useForm<MetadataFormSchema>({
        resolver: zodResolver(metadataFormSchema),
        defaultValues: {
            name: metadata?.name || '',
            description: metadata?.description || '',
            imageUrl: metadata?.imageUrl || '',
            avatarUrl: metadata?.avatarUrl || '',
            externalUrl: metadata?.externalUrl || '',
        },
    })

    // Update form when metadata loads
    useEffect(() => {
        if (metadata && !isLoadingMetadata && open) {
            metadataForm.reset({
                name: metadata.name || '',
                description: metadata.description || '',
                imageUrl: metadata.imageUrl || '',
                avatarUrl: metadata.avatarUrl || '',
                externalUrl: metadata.externalUrl || '',
            })
        }
    }, [metadata, isLoadingMetadata, open, metadataForm])

    const signer = useEthersSigner()
    const { address: signerAddress } = useAccount()
    const { env: currentEnv } = useAgentConnection()
    const appRegistryUrl = currentEnv ? getAppRegistryUrl(currentEnv) : ''

    const registerWebhookMutation = useMutation({
        mutationFn: async ({ webhookUrl }: WebhookFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                appRegistryUrl,
            )
            await appRegistryRpcClient.registerWebhook({
                appId: bin_fromHexString(appClientId),
                webhookUrl,
            })
        },
        onSuccess: () => {
            registerWebhookMutation.reset()
        },
    })

    const updateSettingsMutation = useMutation({
        mutationFn: async ({ forwardSetting }: AppSettingsFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                appRegistryUrl,
            )
            await appRegistryRpcClient.setAppSettings({
                appId: bin_fromHexString(appClientId),
                settings: {
                    forwardSetting,
                },
            })
        },
        onSuccess: () => {
            appSettingsForm.reset()
        },
    })

    const updateMetadataMutation = useMutation({
        mutationFn: async (metadataData: MetadataFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                appRegistryUrl,
            )
            await appRegistryRpcClient.setAppMetadata({
                appId: bin_fromHexString(appClientId),
                metadata: {
                    name: metadataData.name,
                    description: metadataData.description || '',
                    imageUrl: metadataData.imageUrl || '',
                    avatarUrl: metadataData.avatarUrl || '',
                    externalUrl: metadataData.externalUrl,
                },
            })
        },
        onSuccess: () => {
            // Invalidate and refetch metadata after successful update
            queryClient.invalidateQueries({
                queryKey: getAppMetadataQueryKey(appClientId),
            })
        },
    })

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                webhookForm.reset()
                registerWebhookMutation.reset()
                appSettingsForm.reset()
                updateSettingsMutation.reset()
                metadataForm.reset()
                updateMetadataMutation.reset()
            }}
        >
            <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bot Settings</DialogTitle>
                    <DialogDescription>
                        Configure your bot's metadata, webhook URL, and message forwarding settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <Form {...metadataForm}>
                        <form
                            className="space-y-4"
                            onSubmit={metadataForm.handleSubmit(async (data) => {
                                await updateMetadataMutation.mutateAsync(data)
                            })}
                        >
                            <FormField
                                control={metadataForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bot Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="My Bot" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={metadataForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Optional description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={metadataForm.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com/bot-image.png"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={metadataForm.control}
                                name="avatarUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Avatar URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com/bot-avatar.png"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={metadataForm.control}
                                name="externalUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>External URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Link to your bot's homepage or documentation
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={updateMetadataMutation.isPending || isLoadingMetadata}
                            >
                                {updateMetadataMutation.isPending ? (
                                    <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {updateMetadataMutation.isPending
                                    ? 'Updating...'
                                    : 'Update Metadata'}
                            </Button>
                        </form>
                    </Form>

                    <div className="my-4 h-px bg-border" />
                    <Form {...webhookForm}>
                        <form
                            className="space-y-4"
                            onSubmit={webhookForm.handleSubmit(async (data) => {
                                await registerWebhookMutation.mutateAsync(data)
                            })}
                        >
                            <h3 className="text-lg font-medium">Webhook Configuration</h3>
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

                    <Form {...appSettingsForm}>
                        <form
                            className="space-y-4"
                            onSubmit={appSettingsForm.handleSubmit(async (data) => {
                                await updateSettingsMutation.mutateAsync(data)
                            })}
                        >
                            <h3 className="text-lg font-medium">Message Settings</h3>
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
