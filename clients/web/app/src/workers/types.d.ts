import { StreamEvent } from '@river-build/proto'

export enum NotificationKind {
    AtChannel = '@channel',
    DirectMessage = 'direct_message',
    Mention = 'mention',
    NewMessage = 'new_message',
    ReplyTo = 'reply_to',
    Reaction = 'reaction',
    Tip = 'tip',
    Trade = 'trade',
}

export type AppNotification = {
    topic?: string
    channelId?: string
    content: {
        kind: NotificationKind
        spaceId?: string
        channelId: string
        threadId?: string
        senderId: string
        recipients: string[]
        event?: StreamEvent
    }
}

export type NotificationContent = {
    kind: NotificationKind
    spaceId?: string
    channelId: string
    title: string
    body: string
    refEventId?: string
    threadId?: string
}

export const WEB_PUSH_NAVIGATION_CHANNEL = 'web-push-navigation-channel'
export const WEB_PUSH_SUBSCRIPTIONS_CHANNEL = 'web-push-subscriptions-channel'

export interface User {
    userId: string
    username: string
    displayName: string
}
