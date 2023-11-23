import { useEffect, useRef, useState } from 'react'
import { TimelineEvent } from 'use-zion-client'
import { useHotkeys } from 'react-hotkeys-hook'
import debug from 'debug'

type TimelineRecorderCue = {
    timestamp: number
    events: TimelineEvent[]
}

const log = debug('app:recorder')

export const useTimelineRecorder = (events: TimelineEvent[]) => {
    const timestampsRef = useRef<TimelineRecorderCue[]>([])
    const interactiveRef = useRef(false)
    const [playhead, setPlayhead] = useState(0)

    const isEnabled = debug.enabled('app:recorder')

    const [mode, setMode] = useState<'record' | 'playback' | 'disabled'>(
        isEnabled ? 'record' : 'disabled',
    )

    useEffect(() => {
        timestampsRef.current.push({
            timestamp: Date.now(),
            events,
        })
        log('recorded', timestampsRef.current.length)
    }, [events])

    useEffect(() => {
        if (mode === 'disabled') {
            return
        } else if (mode === 'playback') {
            setPlayhead(0)
            interactiveRef.current = false
            log('playback started')
            const interval = setInterval(() => {
                if (interactiveRef.current) {
                    return
                }
                setPlayhead((playhead) => {
                    const frame = playhead + 1
                    if (frame >= timestampsRef.current.length - 1) {
                        clearInterval(interval)
                    }

                    return frame
                })
            }, 1000)
            return () => {
                clearInterval(interval)
            }
        }
    }, [isEnabled, mode])

    useHotkeys(
        'Meta+Shift+O',
        () => {
            log('toggle mode')
            setMode((mode) => (mode === 'record' ? 'playback' : 'record'))
        },
        { enabled: isEnabled },
    )

    useHotkeys(
        'ArrowLeft',
        (e) => {
            interactiveRef.current = true
            const min = 0
            setPlayhead((playhead) => Math.max(min, e.metaKey && e.shiftKey ? min : playhead - 1))
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )
    useHotkeys(
        'ArrowRight',
        (e) => {
            interactiveRef.current = true
            const max = timestampsRef.current.length - 1
            setPlayhead((playhead) => Math.min(max, e.metaKey && e.shiftKey ? max : playhead + 1))
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )
    useHotkeys(
        'Meta+Shift+ArrowLeft',
        (e) => {
            interactiveRef.current = true
            const min = 0
            setPlayhead((playhead) => min)
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )
    useHotkeys(
        'Meta+Shift+ArrowRight',
        (e) => {
            interactiveRef.current = true
            const max = timestampsRef.current.length - 1
            setPlayhead((playhead) => max)
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )
    useHotkeys(
        'Enter',
        (e) => {
            interactiveRef.current = false
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )

    useHotkeys(
        'q',
        (e) => {
            console.clear()
        },
        { enabled: mode === 'playback' },
        [mode, playhead],
    )

    useEffect(() => {
        log('playhead', playhead, timestampsRef.current[playhead].events)
    }, [playhead])

    return mode === 'playback' ? timestampsRef.current[playhead].events : events
}
