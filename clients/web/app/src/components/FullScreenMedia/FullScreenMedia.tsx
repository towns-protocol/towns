import React, { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageType, TimelineEvent, ZTEvent } from 'use-zion-client'
import { Lightbox, ViewCallbackProps } from 'yet-another-react-lightbox'
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
        const imageEvents = events.filter((e) => {
            return (
                e.content?.kind === ZTEvent.RoomMessage &&
                (e.content.msgType === MessageType.ChunkedMedia ||
                    e.content.msgType == MessageType.EmbeddedMedia ||
                    e.content.msgType == MessageType.Image)
            )
        })
        if (!threadId) {
            return imageEvents.filter((e) => e.threadParentId === undefined)
        }
        return imageEvents.filter((e) => e.threadParentId === threadId || e.eventId === threadId)
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
                prev.set(QUERY_PARAMS.GALLERY_ID, event.eventId)
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
            return { type: 'image' as const, event: e, src: '' }
        })
    }, [elements])

    const index = elements.findIndex((e) => e.eventId === galleryId)
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
                    if (Math.abs(info.offset) > 1 || !hasTimelineEvent(info.slide)) {
                        return undefined
                    }
                    return <FullScreenMediaItem event={info.slide.event} />
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

function hasTimelineEvent(obj: unknown): obj is { event: TimelineEvent } {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'event' in obj &&
        typeof obj.event !== 'undefined'
    )
}
