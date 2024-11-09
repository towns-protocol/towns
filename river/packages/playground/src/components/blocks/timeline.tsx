import { useMember, useSendMessage, useSyncAgent } from '@river-build/react-sdk'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TimelineEvent, isChannelStreamId, spaceIdFromChannelId } from '@river-build/sdk'
import { cn } from '@/utils'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'

type TimelineProps = {
    events: TimelineEvent[]
    streamId: string
}

export const Timeline = (props: TimelineProps) => {
    return (
        <div className="grid grid-rows-[auto,1fr] gap-2">
            <ScrollArea className="h-[calc(100dvh-172px)]">
                <div className="flex flex-col gap-1.5">
                    {props.events.map((event) => (
                        <Message key={event.eventId} streamId={props.streamId} event={event} />
                    ))}
                </div>
            </ScrollArea>
            <SendMessage streamId={props.streamId} />
        </div>
    )
}

const formSchema = z.object({
    message: z.string(),
})

export const SendMessage = ({ streamId }: { streamId: string }) => {
    const { sendMessage, isPending } = useSendMessage(streamId)
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

const Message = ({ event, streamId }: { event: TimelineEvent; streamId: string }) => {
    const sync = useSyncAgent()
    const preferSpaceMember = isChannelStreamId(streamId)
        ? spaceIdFromChannelId(streamId)
        : streamId
    const { username, displayName } = useMember({
        streamId: preferSpaceMember,
        userId: event.creatorUserId,
    })
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
