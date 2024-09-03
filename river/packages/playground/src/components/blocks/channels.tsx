import { useChannel, useCreateChannel, useSpace } from '@river-build/react-sdk'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { useCurrentSpaceId } from '@/hooks/current-space'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form'
import { Block, type BlockProps } from '../ui/block'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { JsonHover } from '../utils/json-hover'

type ChannelsBlockProps = {
    changeChannel: (channelId: string) => void
}

const formSchema = z.object({
    channelName: z.string().min(1, { message: 'Space name is required' }),
})

export const ChannelsBlock = ({ changeChannel }: ChannelsBlockProps) => {
    const spaceId = useCurrentSpaceId()
    const { data: space } = useSpace(spaceId)

    return (
        <Block title={`Channels in ${space.metadata?.name || 'Unnamed Space'}`}>
            <CreateChannel variant="secondary" spaceId={spaceId} onChannelCreated={changeChannel} />
            <div className="flex flex-col gap-2">
                <span className="text-xs">Select a channel to start messaging</span>
                <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                    {space.channelIds.map((channelId) => (
                        <ChannelInfo
                            key={`${spaceId}-${channelId}`}
                            spaceId={space.id}
                            channelId={channelId}
                            changeChannel={changeChannel}
                        />
                    ))}
                </div>
            </div>
            {space.channelIds.length === 0 && (
                <p className="pt-4 text-center text-sm text-secondary-foreground">
                    You're not in any Channels yet.
                </p>
            )}
        </Block>
    )
}

const ChannelInfo = ({
    spaceId,
    channelId,
    changeChannel,
}: {
    spaceId: string
    channelId: string
    changeChannel: (channelId: string) => void
}) => {
    const { data: channel } = useChannel(spaceId, channelId)

    return (
        <JsonHover data={channel}>
            <div>
                <Button variant="outline" onClick={() => changeChannel(channelId)}>
                    {channel.metadata?.name || 'Unnamed Channel'}
                </Button>
            </div>
        </JsonHover>
    )
}

export const CreateChannel = (
    props: {
        spaceId: string
        onChannelCreated: (channelId: string) => void
    } & BlockProps,
) => {
    const { onChannelCreated, spaceId, ...rest } = props
    const { createChannel, isPending } = useCreateChannel(spaceId)
    const signer = useEthersSigner()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { channelName: '' },
    })

    // TODO: this should be a dialog
    return (
        <Block {...rest}>
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
                                <FormLabel>New channel name</FormLabel>
                                <FormControl>
                                    {/* TODO: input mask so it start with # but gets stripped */}
                                    <Input placeholder="#cool-photos" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This will be the name of your channel.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit"> {isPending ? 'Creating...' : 'Create'}</Button>
                </form>
            </Form>
        </Block>
    )
}
