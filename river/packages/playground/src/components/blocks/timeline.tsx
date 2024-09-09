import {
    useDisplayName,
    useSendMessage,
    useSyncAgent,
    useTimeline,
    useUsername,
} from '@river-build/react-sdk'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TimelineEvent } from '@river-build/sdk'
import { useMemo } from 'react'
import { useCurrentSpaceId } from '@/hooks/current-space'
import { useCurrentChannelId } from '@/hooks/current-channel'
import { cn } from '@/utils'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'

export const Timeline = () => {
    const spaceId = useCurrentSpaceId()
    const channelId = useCurrentChannelId()
    const { data: timeline } = useTimeline(spaceId, channelId)
    return (
        <div className="grid grid-rows-[auto,1fr] gap-2">
            <ScrollArea className="h-[calc(100dvh-172px)]">
                <div className="flex flex-col gap-1.5">
                    {timeline.map((event) => (
                        <Message key={event.eventId} event={event} />
                    ))}
                </div>
            </ScrollArea>
            <SendMessage />
        </div>
    )
}

const formSchema = z.object({
    message: z.string(),
})

export const SendMessage = () => {
    const spaceId = useCurrentSpaceId()
    const channelId = useCurrentChannelId()
    const { sendMessage, isPending } = useSendMessage(spaceId, channelId)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { message: '' },
    })

    return (
        <Form {...form}>
            <form
                className="grid grid-cols-[1fr,auto] gap-2"
                onSubmit={form.handleSubmit(async ({ message }) => {
                    sendMessage(message)
                })}
            >
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="Type a message" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit"> {isPending ? 'Sending...' : 'Send'}</Button>
            </form>
        </Form>
    )
}

const Message = ({ event }: { event: TimelineEvent }) => {
    const sync = useSyncAgent()
    const spaceId = useCurrentSpaceId()
    const member = useMemo(
        () => sync.spaces.getSpace(spaceId).members.get(event.creatorUserId),
        [sync, spaceId, event.creatorUserId],
    )
    const { username } = useUsername(member)
    const { displayName } = useDisplayName(member)
    const prettyDisplayName = displayName || username

    return (
        <div className="flex gap-1">
            {prettyDisplayName && (
                <span
                    className={cn(
                        'font-semibold',
                        event.creatorUserId === sync.userId ? 'text-sky-500' : 'text-purple-500',
                    )}
                >
                    {prettyDisplayName}:
                </span>
            )}
            <span>{event.text}</span>
        </div>
    )
}
