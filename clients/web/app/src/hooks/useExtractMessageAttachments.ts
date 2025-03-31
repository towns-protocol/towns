import { EmbeddedMessageAttachment, RiverTimelineEvent } from '@towns-protocol/sdk'
import { isEqual, uniqBy } from 'lodash'
import { useCallback, useMemo, useRef } from 'react'
import { useRawTimelineStore, useTownsContext, useUserLookupStore } from 'use-towns-client'
import { notUndefined } from 'ui/utils/utils'
import { useExtractInternalLinks } from './useExtractInternalLinks'

export const useExtractMessageAttachments = (
    text: string,
): { attachments: EmbeddedMessageAttachment[] } => {
    const links = useExtractInternalLinks(text)
    const { createStaticInfo } = useCreateStaticInfo()

    const ref = useRef<EmbeddedMessageAttachment[]>([])

    const attachments = useMemo(() => {
        const timelines = useRawTimelineStore.getState().timelines
        const attachments = links
            .map((link) => {
                const event = timelines[link.channelId]?.find((e) => e.eventId === link.messageId)
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

        const result = uniqBy(attachments, 'url')

        if (!isEqual(result, ref.current)) {
            ref.current = result
        }

        return ref.current
    }, [createStaticInfo, links])

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
