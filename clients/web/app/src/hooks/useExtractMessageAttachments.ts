import { useThrottledTimelineStore, useTownsContext, useUserLookupStore } from 'use-towns-client'
import { isEqual } from 'lodash'
import { useCallback, useRef } from 'react'
import { EmbeddedMessageAttachment, RiverTimelineEvent } from '@towns-protocol/sdk'
import { notUndefined } from 'ui/utils/utils'
import { useExtractInternalLinks } from './useExtractInternalLinks'

export const useExtractMessageAttachments = (
    text: string,
): { attachments: EmbeddedMessageAttachment[] } => {
    const links = useExtractInternalLinks(text)
    const { createStaticInfo } = useCreateStaticInfo()
    const ref = useRef<EmbeddedMessageAttachment[]>([])

    const attachments = useThrottledTimelineStore(
        (state) => {
            const newValue: EmbeddedMessageAttachment[] = links
                .map((link) => {
                    const event = state.timelines[link.channelId]?.find(
                        (e) => e.eventId === link.messageId,
                    )
                    if (event?.content?.kind !== RiverTimelineEvent.ChannelMessage) {
                        return
                    }

                    const { url, spaceId, channelId, messageId } = link
                    const userId = event.sender.id
                    const staticInfo = createStaticInfo({ spaceId, channelId, userId })

                    return {
                        type: 'embedded_message' as const,
                        id: `${spaceId}${channelId}${messageId}`,
                        url,
                        channelMessageEvent: {
                            ...event.content,
                        },
                        info: {
                            createdAtEpochMs: BigInt(event.createdAtEpochMs),
                            userId,
                            spaceId,
                            channelId,
                            messageId,
                        },
                        staticInfo,
                    } satisfies EmbeddedMessageAttachment
                })
                .filter(notUndefined)

            if (isEqual(ref.current, newValue)) {
                return ref.current
            }
            ref.current = newValue
            return newValue
        },
        250,
        (a, b) => isEqual(a, b),
    )

    return { attachments }
}

const useCreateStaticInfo = () => {
    const { spaces } = useTownsContext()

    const createStaticInfo = useCallback(
        ({ spaceId, userId }: { spaceId: string; channelId: string; userId: string }) => {
            const spaceName = spaces.find((s) => s.id === spaceId)?.name
            const spaceUser = useUserLookupStore.getState().spaceUsers[spaceId]?.[userId]
            const user = spaceId ? spaceUser : undefined

            return {
                spaceName,
                userName: user?.username,
                displayName: user?.displayName,
                ensName: user?.ensName,
            }
        },
        [spaces],
    )
    return { createStaticInfo }
}
