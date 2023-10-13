import React, { useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { FullyReadMarker } from '@river/proto'
import { useStore } from 'store/store'
import { Box, BoxProps, Paragraph, Stack } from '@ui'

type Props = {
    onMarkAsRead: (fullyReadMarker: FullyReadMarker) => void
    fullyReadMarker: FullyReadMarker
    faded?: boolean
    hidden?: boolean
} & BoxProps

export const NewDivider = (props: Props) => {
    const {
        fullyReadMarker,
        hidden: isHidden,
        faded: isNewFaded,
        onMarkAsRead,
        ...boxProps
    } = props

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
    }, [onMarkAsRead, fullyReadMarker.isUnread, isWindowActive, inView, fullyReadMarker])

    const opacityStyle = useMemo(
        () => (isNewFaded ? { opacity: 0.33, transition: `opacity 1s` } : undefined),
        [isNewFaded],
    )

    return fullyReadMarker ? (
        !isHidden ? (
            <Stack
                horizontal
                gap="sm"
                paddingY="sm"
                alignItems="center"
                paddingRight="lg"
                paddingLeft="none"
                {...boxProps}
                style={opacityStyle}
            >
                <Box grow borderBottom="accent" />
                <Box centerContent color="accent" ref={ref}>
                    <Paragraph size="sm">NEW</Paragraph>
                </Box>
            </Stack>
        ) : (
            <div ref={ref} />
        )
    ) : (
        <></>
    )
}
