import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { type Address } from 'viem'
import { useMutation } from '@tanstack/react-query'
import { AppRegistryService } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
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

const APP_REGISTRY_URL = 'https://localhost:6170'

type WebhookFormSchema = z.infer<typeof webhookFormSchema>
type AppSettingsFormSchema = z.infer<typeof appSettingsFormSchema>

export const BotSettingsDialog = ({
    appClientId,
    open,
    onOpenChange,
}: {
    appClientId: Address
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
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

    const signer = useEthersSigner()
    const { address: signerAddress } = useAccount()

    const registerWebhookMutation = useMutation({
        mutationFn: async ({ webhookUrl }: WebhookFormSchema) => {
            if (!signer || !signerAddress) {
                return
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                signerAddress,
                signer,
                APP_REGISTRY_URL,
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
                APP_REGISTRY_URL,
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

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
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
                        Configure your bot's webhook URL to receive space events.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <Form {...webhookForm}>
                        <form
                            className="space-y-4"
                            onSubmit={webhookForm.handleSubmit(async (data) => {
                                await registerWebhookMutation.mutateAsync(data)
                            })}
                        >
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
