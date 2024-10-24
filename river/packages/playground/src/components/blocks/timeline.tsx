import { useMember, useSendMessage, useSyncAgent } from '@river-build/react-sdk'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TimelineEvent } from '@river-build/sdk'
import { useMemo } from 'react'
import { cn } from '@/utils'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'

type GdmOrChannel =
    | {
          type: 'gdm'
          streamId: string
      }
    | {
          type: 'channel'
          spaceId: string
          channelId: string
      }

type TimelineProps =
    | {
          type: 'gdm'
          events: TimelineEvent[]
          streamId: string
      }
    | {
          type: 'channel'
          events: TimelineEvent[]
          spaceId: string
          channelId: string
      }
export const Timeline = (props: TimelineProps) => {
    return (
        <div className="grid grid-rows-[auto,1fr] gap-2">
            <ScrollArea className="h-[calc(100dvh-172px)]">
                <div className="flex flex-col gap-1.5">
                    {props.events.map((event) => (
                        <Message key={event.eventId} {...props} event={event} />
                    ))}
                </div>
            </ScrollArea>
            <SendMessage {...props} />
        </div>
    )
}

const formSchema = z.object({
    message: z.string(),
})

export const SendMessage = (props: GdmOrChannel) => {
    const { sendMessage, isPending } = useSendMessage(props)
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

const Message = ({ event, ...props }: { event: TimelineEvent } & GdmOrChannel) => {
    const sync = useSyncAgent()
    const member = useMemo(() => {
        if (props.type === 'gdm') {
            return sync.gdms.getGdm(props.streamId).members.get(event.creatorUserId)
        }
        return sync.spaces.getSpace(props.spaceId).members.get(event.creatorUserId)
    }, [props, sync.gdms, sync.spaces, event.creatorUserId])
    const { username, displayName } = useMember(member)
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
