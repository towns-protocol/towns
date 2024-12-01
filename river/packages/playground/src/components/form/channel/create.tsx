import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateChannel } from '@river-build/react-sdk'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
    channelName: z.string().min(1, { message: 'Channel name is required' }),
})

export const CreateChannel = (props: {
    onChannelCreated: (channelId: string) => void
    spaceId: string
}) => {
    const { onChannelCreated, spaceId } = props
    const { createChannel, isPending } = useCreateChannel(spaceId)
    const signer = useEthersSigner()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { channelName: '' },
    })

    return (
        <Form {...form}>
            <form
                className="space-y-3"
                onSubmit={form.handleSubmit(async ({ channelName }) => {
                    if (!signer) {
                        return
                    }
                    const channelId = await createChannel(channelName, signer)
                    onChannelCreated(channelId)
                })}
            >
                <FormField
                    control={form.control}
                    name="channelName"
                    render={({ field }) => (
                        <FormItem>
                            <FormDescription>
                                This will be the name of your channel.
                            </FormDescription>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    {/* TODO: input mask so it start with # but gets stripped */}
                                    <Input placeholder="#cool-photos" {...field} />
                                </FormControl>
                                <Button type="submit">
                                    {isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    )
}
