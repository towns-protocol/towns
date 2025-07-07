import {
    useMember,
    useReactions,
    useRedact,
    useScrollback,
    useSendMessage,
    useSendReaction,
    useSyncAgent,
} from '@towns-protocol/react-sdk'
import {
    type MessageReactions,
    RiverTimelineEvent,
    type TimelineEvent,
    isChannelStreamId,
    spaceIdFromChannelId,
} from '@towns-protocol/sdk'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown } from 'lucide-react'
import type { IAppRegistryBase } from '@towns-protocol/generated/dev/typings/IAppRegistry'
import { cn } from '@/utils'
import { getNativeEmojiFromName } from '@/utils/emojis'
import { useSpaceInstalledApps } from '@/hooks/useSpaceInstalledApps'
import { useAppMetadata } from '@/hooks/useAppMetadata'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
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
    currentThreadId?: string
}

export const Timeline = ({
    streamId,
    showThreadMessages,
    threads,
    events,
    currentThreadId,
}: TimelineProps) => {
    const [opts, setOpts] = useState<{
        eventId: string
        senderId: string
        kind: 'reply' | 'thread'
    } | null>(null)
    const { scrollback, isPending } = useScrollback(streamId)
    const { data: installedApps = [] } = useSpaceInstalledApps(streamId)

    return (
        <div className="grid grid-rows-[auto,1fr,auto] gap-2">
            {!showThreadMessages && (
                <Button disabled={isPending} variant="outline" onClick={scrollback}>
                    {isPending ? 'Loading more...' : 'Scrollback'}
                </Button>
            )}
            <StickToBottom
                className="relative h-[calc(100dvh-222px)] overflow-y-auto"
                resize="smooth"
                initial="instant"
            >
                <StickToBottom.Content className="flex flex-col gap-6 p-4">
                    {events.map((event) => {
                        if (event.content?.kind === RiverTimelineEvent.ChannelMessage) {
                            if (showThreadMessages || !event.threadParentId) {
                                return (
                                    <Message
                                        streamId={streamId}
                                        key={event.eventId}
                                        event={event}
                                        thread={threads?.[event.eventId]}
                                        setOpts={setOpts}
                                        installedApps={installedApps}
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
                </StickToBottom.Content>
                <NewMessagesIndicator />
            </StickToBottom>
            <SendMessage
                streamId={streamId}
                opts={opts}
                resetOpts={() => setOpts(null)}
                currentThreadId={currentThreadId}
            />
        </div>
    )
}

const formSchema = z.object({
    message: z.string(),
})

const ReplyIndicatorContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            className={cn(
                'absolute inset-x-0 -top-[40px]',
                'flex items-center justify-between px-3 py-1 text-sm',
                'rounded-t-md border border-b-0 border-input',
            )}
        >
            {children}
        </div>
    )
}

export const SendMessage = ({
    streamId,
    opts,
    resetOpts,
    currentThreadId,
}: {
    streamId: string
    opts: {
        eventId: string
        senderId: string
        kind: 'reply' | 'thread'
    } | null
    resetOpts: () => void
    currentThreadId?: string
}) => {
    const { sendMessage, isPending } = useSendMessage(streamId)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { message: '' },
    })
    return (
        <div className="relative">
            <Form {...form}>
                <form
                    className={cn(
                        'z-10 grid grid-cols-[1fr,auto] gap-2',
                        opts &&
                            'rounded-b-md border border-t-0 border-input bg-background p-2 pt-0 transition-all duration-150',
                    )}
                    onSubmit={form.handleSubmit(async ({ message }) => {
                        const options: { threadId?: string; replyId?: string } = {}
                        if (opts?.kind === 'reply') {
                            options.replyId = opts.eventId
                        } else if (opts?.kind === 'thread') {
                            options.threadId = opts.eventId
                        } else if (currentThreadId) {
                            options.threadId = currentThreadId
                        }
                        await sendMessage(message, options)
                        form.reset()
                        resetOpts()
                    })}
                >
                    {opts?.kind === 'reply' && (
                        <ReplyIndicatorContainer>
                            <ReplyingTo streamId={streamId} senderId={opts.senderId} />
                            <Button variant="ghost" size="sm" type="button" onClick={resetOpts}>
                                ✕
                            </Button>
                        </ReplyIndicatorContainer>
                    )}
                    {opts?.kind === 'thread' && (
                        <ReplyIndicatorContainer>
                            <span>Replying in thread</span>
                            <Button variant="ghost" size="sm" type="button" onClick={resetOpts}>
                                ✕
                            </Button>
                        </ReplyIndicatorContainer>
                    )}
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
        </div>
    )
}

const Message = ({
    event,
    streamId,
    thread,
    setOpts,
    installedApps = [],
}: {
    event: TimelineEvent
    thread: TimelineEvent[] | undefined
    streamId: string
    setOpts: (opts: { eventId: string; senderId: string; kind: 'reply' | 'thread' }) => void
    installedApps?: IAppRegistryBase.AppStructOutput[]
}) => {
    const sync = useSyncAgent()
    const isBot = installedApps.some((app) => app.client === event.sender.id)

    const isMyMessage = event.sender.id === sync.userId
    const { reactions, onReact } = useMessageReaction(streamId, event.eventId)
    const { redact } = useRedact(streamId)

    const replyId =
        event.content?.kind === RiverTimelineEvent.ChannelMessage
            ? event.content.replyId
            : undefined

    return (
        <div className="flex w-full gap-3.5">
            <Avatar className="size-9 shadow" userId={event.sender.id} isBot={isBot} />
            <div className="flex flex-col gap-2">
                {isBot ? (
                    <BotInfo userId={event.sender.id} />
                ) : (
                    <UserInfo
                        userId={event.sender.id}
                        isMyMessage={isMyMessage}
                        streamId={streamId}
                    />
                )}
                <div className="flex flex-col gap-1">
                    {replyId ? (
                        <div className="text-xs text-muted-foreground">
                            ↪️ Replying to eventId: {event.eventId}
                        </div>
                    ) : null}
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

                    {!event.threadParentId && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setOpts({
                                        eventId: event.eventId,
                                        senderId: event.sender.id,
                                        kind: 'reply',
                                    })
                                }
                            >
                                Reply
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setOpts({
                                        eventId: event.eventId,
                                        senderId: event.sender.id,
                                        kind: 'thread',
                                    })
                                }
                            >
                                🧵
                            </Button>
                        </>
                    )}

                    {thread && thread.length > 0 && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost">+{thread.length} messages</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-full sm:max-w-[calc(100dvw-20%)]">
                                <DialogTitle>Thread</DialogTitle>
                                <Timeline
                                    showThreadMessages
                                    streamId={streamId}
                                    events={thread}
                                    currentThreadId={event.eventId}
                                />
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

const NewMessagesIndicator = () => {
    const { isAtBottom, scrollToBottom } = useStickToBottomContext()

    if (isAtBottom) {
        return null
    }

    return (
        <button
            type="button"
            className={cn(
                'absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center  gap-1 px-3 py-1.5',
                'rounded-full border border-transparent bg-blue-600 text-xs font-medium text-white shadow-sm',
                'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            )}
            onClick={() => scrollToBottom({ animation: 'smooth' })}
        >
            <ArrowDown className="size-3" /> New messages
        </button>
    )
}

const ReplyingTo = ({ streamId, senderId }: { streamId: string; senderId: string }) => {
    const { username, displayName, userId } = useMember({
        streamId,
        userId: senderId,
    })
    const prettyDisplayName = displayName || username || userId
    return (
        <span>
            Replying to <strong>{prettyDisplayName}</strong>
        </span>
    )
}

const UserInfo = ({
    userId,
    isMyMessage,
    streamId,
}: {
    userId: string
    isMyMessage: boolean
    streamId: string
}) => {
    const preferSpaceMember = isChannelStreamId(streamId)
        ? spaceIdFromChannelId(streamId)
        : streamId
    const { username, displayName } = useMember({
        streamId: preferSpaceMember,
        userId,
    })
    const prettyDisplayName = displayName || username
    return (
        <div className="flex items-center gap-1">
            <span className={cn('font-semibold', isMyMessage ? 'text-sky-500' : 'text-purple-500')}>
                {prettyDisplayName || userId}
            </span>
        </div>
    )
}

const BotInfo = ({ userId }: { userId: string }) => {
    const { data: metadata } = useAppMetadata(userId)
    return (
        <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-600">{metadata?.name}</span>
            <div className="flex items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5">
                <span className="text-xs font-medium text-white">BOT</span>
            </div>
        </div>
    )
}
