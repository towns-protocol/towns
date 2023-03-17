import React, { useCallback, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { FullyReadMarker, useZionClient } from 'use-zion-client'
import { useStore } from 'store/store'
import { Box, BoxProps, Paragraph, Stack } from '@ui'

export const NewDivider = React.memo(
    (props: { fullyReadMarker: FullyReadMarker; hidden?: boolean } & BoxProps) => {
        const { fullyReadMarker, hidden: isHidden, ...boxProps } = props
        const { sendReadReceipt } = useZionClient()

        const isSentRef = useRef(!fullyReadMarker.isUnread)

        const markAsRead = useCallback(() => {
            if (isSentRef.current) {
                // repeated calls can occur if server reponse is lagging and
                // user scrolls back into view
                return
            }
            sendReadReceipt(fullyReadMarker)
            isSentRef.current = true
        }, [fullyReadMarker, sendReadReceipt])

        const isWindowActive = useStore((state) => state.isWindowFocused)

        const { ref, inView } = useInView({
            threshold: 0,
            triggerOnce: true,
        })

        useEffect(() => {
            if (fullyReadMarker.isUnread && inView && isWindowActive) {
                const timeout = setTimeout(markAsRead, 100)
                return () => {
                    clearTimeout(timeout)
                }
            }
        }, [markAsRead, fullyReadMarker.isUnread, isWindowActive, inView])

        return fullyReadMarker ? (
            !isHidden ? (
                <Stack horizontal gap paddingY="sm" alignItems="center" paddingX="lg" {...boxProps}>
                    <Box grow borderBottom="negative" />
                    <Box centerContent color="negative" ref={ref}>
                        <Paragraph size="sm">NEW</Paragraph>
                    </Box>
                </Stack>
            ) : (
                <div ref={ref} />
            )
        ) : (
            <></>
        )
    },
)
