import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { isAddress, zeroAddress } from 'viem'
import { useMutation } from '@tanstack/react-query'
import { makeAppRegistryRpcClient } from '@towns-protocol/sdk'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { bin_fromHexString, bin_toString } from '@towns-protocol/dlog'
import { LoaderCircleIcon } from 'lucide-react'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
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

const formSchema = z.object({
    address: z.string().refine((x) => isAddress(x)),
    webhookUrl: z.string().url(),
})

const APP_REGISTRY_URL = 'http://localhost:8546'

type FormSchema = z.infer<typeof formSchema>

export const BotSettingsDialog = () => {
    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: { address: '' as `0x${string}`, webhookUrl: '' },
    })
    const signer = useEthersSigner()
    const { userId } = useSyncAgent()

    const { mutateAsync, isPending } = useMutation({
        mutationFn: async ({ address, webhookUrl }: FormSchema) => {
            if (!signer) {
                return
            }
            const client = makeAppRegistryRpcClient(APP_REGISTRY_URL)
            const appId = bin_fromHexString(address)
            const { hs256SharedSecret } = await client.register({
                appId,
                appOwnerId: bin_fromHexString(userId),
            })
            const withAuth = makeAppRegistryRpcClient(
                APP_REGISTRY_URL,
                bin_toString(hs256SharedSecret),
            )
            await withAuth.registerWebhook({ appId, webhookUrl })
        },
    })

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Register Bot</DialogTitle>
            </DialogHeader>

            <DialogDescription>
                Register your bot by providing its public address and webhook URL. This is required
                before the bot can interact with the space.
            </DialogDescription>

            <Form {...form}>
                <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit(async (data) => {
                        await mutateAsync(data)
                        form.reset()
                    })}
                >
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bot Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="0x..." {...field} />
                                </FormControl>
                                <FormDescription>The public address of your bot</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
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

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isPending ? 'Registering...' : 'Register'}
                    </Button>
                </form>
            </Form>
        </DialogContent>
    )
}
