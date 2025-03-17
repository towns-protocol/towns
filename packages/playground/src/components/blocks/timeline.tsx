import {
    useMarkAsRead,
    useMarkAsUnread,
    useMember,
    useReactions,
    useRedact,
    useScrollback,
    useSendMessage,
    useSendReaction,
    useSyncAgent,
} from '@river-build/react-sdk'
import {
    type MessageReactions,
    RiverTimelineEvent,
    type TimelineEvent,
    isChannelStreamId,
    spaceIdFromChannelId,
} from '@river-build/sdk'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/utils'
import { getNativeEmojiFromName } from '@/utils/emojis'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Avatar } from '../ui/avatar'

const useMessageReaction = (streamId: string, eventId: string) => {
    const { data: reactionMap } = useReactions(streamId)
    const reactions = reactionMap?.[eventId]
    const { sendReaction } = useSendReaction(streamId)
    const { redact } = useRedact(streamId)
    const onReact = useCallback(
        (
            params:
                | {
                      type: 'add'
                      reaction: string
                  }
                | {
                      type: 'remove'
                      refEventId: string
                  },
        ) => {
            if (params.type === 'add') {
                sendReaction(eventId, params.reaction)
            } else {
                redact(params.refEventId)
            }
        },
        [sendReaction, redact, eventId],
    )

    return {
        reactions,
        onReact,
    }
}

type TimelineProps = {
    events: TimelineEvent[]
    showThreadMessages?: boolean
    threads?: Record<string, TimelineEvent[]>
    streamId: string
}

export const Timeline = ({ streamId, showThreadMessages, threads, events }: TimelineProps) => {
    const { scrollback, isPending } = useScrollback(streamId)
    const { markAsRead, isPending: isMarkingAsRead } = useMarkAsRead()
    const { markAsUnread, isPending: isMarkingAsUnread } = useMarkAsUnread()

    return (
        <div className="grid grid-rows-[auto,1fr] gap-2">
            <ScrollArea className="h-[calc(100dvh-172px)]">
                <div className="flex flex-col gap-6">
                    {!showThreadMessages && (
                        <>
                            <Button disabled={isPending} variant="outline" onClick={scrollback}>
                                {isPending ? 'Loading more...' : 'Scrollback'}
                            </Button>
                            <Button disabled={isMarkingAsRead} onClick={() => markAsRead(streamId)}>
                                {isMarkingAsRead ? 'Marking as read...' : 'Mark as read'}
                            </Button>
                            <Button
                                disabled={isMarkingAsUnread}
                                onClick={() => markAsUnread(streamId)}
                            >
                                {isMarkingAsUnread ? 'Marking as unread...' : 'Mark as unread'}
                            </Button>
                        </>
                    )}
                    {events.map((event) => {
                        if (event.content?.kind === RiverTimelineEvent.ChannelMessage) {
                            if (showThreadMessages || !event.threadParentId) {
                                return (
                                    <Message
                                        streamId={streamId}
                                        key={event.eventId}
                                        event={event}
                                        thread={threads?.[event.eventId]}
                                    />
                                )
                            }
                            return null
                        }
                        if (
                            event.content?.kind === RiverTimelineEvent.ChannelMessageEncrypted ||
                            event.content?.kind ===
                                RiverTimelineEvent.ChannelMessageEncryptedWithRef
                        ) {
                            return <EncryptedMessage key={event.eventId} />
                        }
                        return null
                    })}
                </div>
            </ScrollArea>
            <SendMessage streamId={streamId} />
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
                    // reset the form:
                    form.setValue('message', '')
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

const Message = ({
    event,
    streamId,
    thread,
}: {
    event: TimelineEvent
    thread: TimelineEvent[] | undefined
    streamId: string
}) => {
    const sync = useSyncAgent()
    const preferSpaceMember = isChannelStreamId(streamId)
        ? spaceIdFromChannelId(streamId)
        : streamId

    const { username, displayName } = useMember({
        streamId: preferSpaceMember,
        userId: event.sender.id,
    })
    const prettyDisplayName = displayName || username
    const isMyMessage = event.sender.id === sync.userId
    const { reactions, onReact } = useMessageReaction(streamId, event.eventId)
    const { redact } = useRedact(streamId)

    return (
        <div className="flex w-full gap-3.5">
            <Avatar className="size-9 shadow" userId={event.sender.id} />
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <span
                            className={cn(
                                'font-semibold',
                                isMyMessage ? 'text-sky-500' : 'text-purple-500',
                            )}
                        >
                            {prettyDisplayName || event.sender.id}
                        </span>
                    </div>
                    <span>
                        {event.content?.kind === RiverTimelineEvent.ChannelMessage
                            ? event.content.body
                            : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {reactions && <ReactionRow reactions={reactions} onReact={onReact} />}
                    <Button
                        variant="outline"
                        className="aspect-square p-1"
                        onClick={() => onReact({ type: 'add', reaction: '👍' })}
                    >
                        👍
                    </Button>
                    {isMyMessage && (
                        <Button variant="ghost" onClick={() => redact(event.eventId)}>
                            ❌
                        </Button>
                    )}

                    {thread && thread.length > 0 && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost">+{thread.length} messages</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-full sm:max-w-[calc(100dvw-20%)]">
                                <DialogTitle>Thread</DialogTitle>
                                <Timeline showThreadMessages streamId={streamId} events={thread} />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </div>
    )
}

type OnReactParams =
    | {
          type: 'add'
          reaction: string
      }
    | {
          type: 'remove'
          refEventId: string
      }
const ReactionRow = ({
    reactions,
    onReact,
}: {
    reactions: MessageReactions
    onReact: (params: OnReactParams) => void
}) => {
    const entries = Object.entries<Record<string, { eventId: string }>>(reactions)
    return (
        <div className="flex gap-1">
            {entries.length
                ? entries.map(([reaction, users]) => (
                      <Reaction
                          key={reaction}
                          reaction={reaction}
                          users={users}
                          onReact={onReact}
                      />
                  ))
                : undefined}
        </div>
    )
}

const Reaction = ({
    reaction,
    users,
    onReact,
}: {
    reaction: string
    users: Record<string, { eventId: string }>
    onReact: (params: OnReactParams) => void
}) => {
    const sync = useSyncAgent()

    const isMyReaction = Object.keys(users).some((userId) => userId === sync.userId)
    return (
        <button
            type="button"
            className={cn(
                'flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-neutral-200 bg-neutral-100 px-2 dark:border-neutral-800 dark:bg-neutral-900',
                isMyReaction && 'border-lime-200 bg-lime-100 dark:border-lime-800 dark:bg-lime-900',
            )}
            onClick={() => {
                if (isMyReaction) {
                    onReact({ type: 'remove', refEventId: users[sync.userId].eventId })
                } else {
                    onReact({ type: 'add', reaction })
                }
            }}
        >
            <span className="text-sm">{getNativeEmojiFromName(reaction)}</span>
            <span className="text-xs">{Object.keys(users).length}</span>
        </button>
    )
}

const EncryptedMessage = () => {
    const [random] = useState(Math.random())
    return (
        <div
            className={cn(
                'flex rounded-sm border border-foreground/10 bg-muted px-4 py-2',
                random < 0.2 ? 'w-3/4' : random < 0.4 ? 'w-2/4' : random < 0.6 ? 'w-1/4' : 'w-3/4',
            )}
        >
            <span className="animate-pulse text-sm text-muted-foreground">
                Decrypting message...
            </span>
        </div>
    )
}
