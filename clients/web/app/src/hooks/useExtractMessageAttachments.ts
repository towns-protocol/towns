import { ZTEvent, useTimelineStore, useTownsContext, useUserLookupStore } from 'use-towns-client'
import { isEqual } from 'lodash'
import { useCallback } from 'react'
import { notUndefined } from 'ui/utils/utils'
import { useExtractInternalLinks } from './useExtractInternalLinks'

export const useExtractMessageAttachments = (text: string) => {
    const links = useExtractInternalLinks(text)
    const { createStaticInfo } = useCreateStaticInfo()

    const attachments = useTimelineStore(
        (state) => {
            return links
                .map((link) => {
                    const event = state.timelines[link.channelId]?.find(
                        (e) => e.eventId === link.messageId,
                    )
                    if (event?.content?.kind !== ZTEvent.ChannelMessage) {
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
                    }
                })
                .filter(notUndefined)
        },
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
            }
        },
        [spaces],
    )
    return { createStaticInfo }
}
