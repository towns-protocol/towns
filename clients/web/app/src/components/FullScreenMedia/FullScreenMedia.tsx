import React, { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Attachment, TimelineEvent, ZTEvent } from 'use-zion-client'
import { Lightbox, ViewCallbackProps } from 'yet-another-react-lightbox'
import { isDefined } from '@river/mecholm'
import { QUERY_PARAMS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { Icon } from '@ui'
import 'yet-another-react-lightbox/styles.css'
import { fullScreenMediaStyle } from './FullScreeenMedia.css'
import { FullScreenMediaItem } from './FullScreenMediaItem'

type Props = {
    events: TimelineEvent[]
    threadId?: string
}

export const FullScreenMedia = (props: Props) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const { events, threadId } = props

    const elements = useMemo(() => {
        const filteredEvents = threadId
            ? events.filter((e) => e.eventId === threadId || e.threadParentId === threadId)
            : events
        return filteredEvents
            .map((e) => {
                if (
                    e.content?.kind === ZTEvent.RoomMessage &&
                    e.content.attachments &&
                    e.content.attachments.length > 0
                ) {
                    return e.content.attachments.map((a) => ({
                        attachment: a,
                        createdAtEpocMs: e.createdAtEpocMs,
                        userId: e.sender.id,
                    }))
                }
            })
            .filter(isDefined)
            .flatMap((e) => e)
    }, [events, threadId])

    const closeButtonPressed = useCallback(() => {
        setSearchParams((prev) => {
            prev.delete(QUERY_PARAMS.GALLERY_ID)
            prev.delete(QUERY_PARAMS.GALLERY_THREAD_ID)
            return prev
        })
    }, [setSearchParams])

    const onView = useCallback(
        (info: ViewCallbackProps) => {
            if (info.index >= elements.length) {
                return
            }
            const event = elements[info.index]
            setSearchParams((prev) => {
                prev.set(QUERY_PARAMS.GALLERY_ID, event.attachment.id)
                if (threadId) {
                    prev.set(QUERY_PARAMS.GALLERY_THREAD_ID, threadId)
                }
                return prev
            })
        },
        [setSearchParams, elements, threadId],
    )
    const slides = useMemo(() => {
        return elements.map((e) => {
            return {
                type: 'image' as const,
                attachment: e.attachment,
                userId: e.userId,
                createdAtEpocMs: e.createdAtEpocMs,
                src: '',
            }
        })
    }, [elements])

    const index = elements.findIndex((e) => e.attachment.id === galleryId)
    if (index < 0) {
        return null
    }

    return (
        <Lightbox
            open
            index={index}
            carousel={{ finite: true }}
            close={closeButtonPressed}
            slides={slides}
            on={{
                view: onView,
            }}
            render={{
                iconPrev: () => <Icon type="arrowLeft" />,
                iconNext: () => <Icon type="arrowRight" />,
                iconClose: () => <Icon type="close" />,
                slide: (info) => {
                    // Offset = distance from current center slide
                    if (Math.abs(info.offset) > 1 || !hasAttachment(info.slide)) {
                        return undefined
                    }

                    return (
                        <FullScreenMediaItem
                            attachment={info.slide.attachment}
                            userId={info.slide.userId}
                            timestamp={info.slide.createdAtEpocMs}
                        />
                    )
                },
            }}
            animation={{
                navigation: 350,
            }}
            className={`${atoms({ zIndex: 'tooltips' })} ${fullScreenMediaStyle}`}
            styles={{ toolbar: { paddingTop: 'calc(env(safe-area-inset-top) + 10px)' } }}
        />
    )
}

function hasAttachment(
    obj: unknown,
): obj is { attachment: Attachment; userId: string; createdAtEpocMs: number } {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'attachment' in obj &&
        typeof obj.attachment !== 'undefined' &&
        'userId' in obj &&
        typeof obj.userId !== 'undefined' &&
        'createdAtEpocMs' in obj &&
        typeof obj.createdAtEpocMs !== 'undefined'
    )
}
