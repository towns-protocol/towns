import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { FullyReadMarker } from '@river-build/proto'
import { useStore } from 'store/store'
import { Box, BoxProps } from '@ui'

type Props = {
    onMarkAsRead: (fullyReadMarker: FullyReadMarker) => void
    fullyReadMarker: FullyReadMarker
} & BoxProps

export const FullyReadObserver = (props: Props) => {
    const { fullyReadMarker, onMarkAsRead } = props

    const isWindowActive = useStore((state) => state.isWindowFocused)

    const { ref, inView } = useInView({
        threshold: 0,
        triggerOnce: true,
    })

    useEffect(() => {
        if (fullyReadMarker.isUnread && inView && isWindowActive) {
            const timeout = setTimeout(() => {
                onMarkAsRead(fullyReadMarker)
            }, 100)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [fullyReadMarker, inView, isWindowActive, onMarkAsRead])

    return <Box position="relative" ref={ref} />
}
