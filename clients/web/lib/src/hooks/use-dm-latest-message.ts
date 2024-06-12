import { useTimeline } from './use-timeline'
import {
    Attachment,
    RoomMessageEncryptedEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../types/timeline-types'

import { Membership, MessageType } from '../types/towns-types'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { useEffect, useMemo, useState } from 'react'
import { markdownToPlainText } from '../utils/markdownToPlainText'
import { isMediaMimeType } from '../utils/isMediaMimeType'

export type MostRecentMessageInfo_OneOf =
    | MostRecentMessageInfoImage
    | MostRecentMessageInfoAttachment
    | MostRecentMessageInfoText
    | MostRecentMessageEncrypted
    | MostRecentMessageInfoGif
    | MostRecentMemberAdded
    | MostRecentMemberLeft
    | MostRecentGDMCreated
    | MostRecentDMCreated
    | MostRecentMemberInvited

export interface MostRecentMessageInfoImage {
    kind: 'image'
    images?: Attachment[]
}

export interface MostRecentMessageInfoAttachment {
    kind: 'attachment'
    attachments: Attachment[]
}

export interface MostRecentMessageInfoGif {
    kind: 'gif'
}
export interface MostRecentMessageInfoText {
    kind: 'text'
    text: string
}

export interface MostRecentMessageEncrypted {
    kind: 'encrypted'
    content: RoomMessageEncryptedEvent
}

export interface MostRecentMemberAdded {
    kind: 'member_added'
    userId: string
}

export interface MostRecentMemberLeft {
    kind: 'member_left'
    userId: string
}

export interface MostRecentMemberInvited {
    kind: 'member_invited'
    userId: string
}

export interface MostRecentGDMCreated {
    kind: 'gdm_created'
    creatorId: string
}

export interface MostRecentDMCreated {
    kind: 'dm_created'
    creatorId: string
}

type LatestMessageInfo = {
    createdAtEpochMs: number
    info: ReturnType<typeof toMostRecentMessageInfo> | undefined
    sender: TimelineEvent['sender']
}

export function useDMLatestMessage(roomId: string, ignoreThreads = true) {
    const { timeline } = useTimeline(roomId)
    const unreadMarker = useFullyReadMarkerStore((state) => state.markers[roomId])

    // let's not count unreads if the timeline doesn't yet contain the event marked as unread
    const hasRelevantUnreadMarker =
        unreadMarker?.isUnread && timeline.some((event) => event.eventId === unreadMarker?.eventId)

    const latestMessage = useMemo(() => {
        let markerReached = false
        let unreadCount = 0
        let latest: LatestMessageInfo | undefined
        for (let i = timeline.length - 1; i >= 0; i--) {
            const message = timeline[i]
            const info = toMostRecentMessageInfo(message.content)

            if (!markerReached && info && hasRelevantUnreadMarker) {
                unreadCount++
            }
            if (!latest && info && (!ignoreThreads || !message.threadParentId)) {
                latest = {
                    createdAtEpochMs: message.createdAtEpochMs,
                    info: info,
                    sender: message.sender,
                }
            }
            if (unreadMarker?.eventId === message.eventId) {
                // we don't need to look further than the lastest unread marker
                markerReached = true
            }
        }
        return { latest, unreadCount }
    }, [hasRelevantUnreadMarker, ignoreThreads, timeline, unreadMarker?.eventId])

    const [latest, setLatest] = useState(latestMessage)

    useEffect(() => {
        const TIMEOUT = 1000 * 10
        const update = () => {
            setLatest((prev) =>
                // keep previous message until a fresh encrypted message gets
                // decrypted (unless its slow to decrypt and timeouts)
                latestMessage.latest?.info?.kind !== 'encrypted' ||
                latestMessage.latest.createdAtEpochMs < Date.now() - TIMEOUT
                    ? latestMessage
                    : prev,
            )
        }
        const info = latestMessage.latest?.info
        if (info && info.kind !== 'encrypted') {
            update()
        } else {
            // double check in a little while
            const timeout = setTimeout(update, TIMEOUT)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [latestMessage])

    return latest
}

function toMostRecentMessageInfo(
    content?: TimelineEvent_OneOf,
): MostRecentMessageInfo_OneOf | undefined {
    if (content?.kind === ZTEvent.RoomMessageEncrypted) {
        return {
            kind: 'encrypted',
            content,
        }
    }

    if (content?.kind === ZTEvent.RoomCreate) {
        if (content.type === 'dmChannelPayload') {
            return {
                kind: 'dm_created',
                creatorId: content.creator,
            }
        }
        if (content.type === 'gdmChannelPayload') {
            return {
                kind: 'gdm_created',
                creatorId: content.creator,
            }
        }
    }

    if (content?.kind === ZTEvent.RoomMember) {
        if (content.membership === Membership.Join) {
            return {
                kind: 'member_added',
                userId: content.userId,
            }
        }
        if (content.membership === Membership.Leave) {
            return {
                kind: 'member_left',
                userId: content.userId,
            }
        }
        if (content.membership === Membership.Invite) {
            return {
                kind: 'member_invited',
                userId: content.userId,
            }
        }
    }
    if (content?.kind !== ZTEvent.RoomMessage) {
        return undefined
    }

    if (!content.content) {
        return undefined
    }
    switch (content.content.msgType) {
        case MessageType.Text: {
            const hasUnfurledLink = content.attachments?.some((x) => x.type === 'unfurled_link')
            if (!hasUnfurledLink && content.attachments && content.attachments.length > 0) {
                const hasEmbeddedMedia = content.attachments.some(
                    (attachment) => attachment.type === 'embedded_media',
                )
                if (hasEmbeddedMedia) {
                    return
                }

                const images = content.attachments.filter((attachment) => {
                    const isGif =
                        attachment.type === 'chunked_media' &&
                        attachment.info.mimetype === 'image/gif'
                    const hasMedia =
                        attachment.type === 'chunked_media' &&
                        isMediaMimeType(attachment.info.mimetype)
                    return (!isGif && hasMedia) || attachment.type === 'image'
                })
                const hasImages = images.length > 0

                if (hasImages) {
                    return {
                        kind: 'image',
                        images,
                    }
                }
                return {
                    kind: 'attachment',
                    attachments: content.attachments,
                }
            }

            return {
                kind: 'text',
                text: markdownToPlainText(content.body),
            }
        }
        case MessageType.Image: {
            const isGif = content.content.info?.mimetype === 'image/gif'
            if (isGif) {
                return {
                    kind: 'gif',
                }
            }
            return {
                kind: 'image',
                images: [],
            }
        }
        default:
            return undefined
    }
}
