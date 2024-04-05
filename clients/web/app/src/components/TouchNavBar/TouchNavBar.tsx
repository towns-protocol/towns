import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, Paragraph, Stack } from '@ui'
import { useVisualViewportContext } from '@components/VisualViewportContext/VisualViewportContext'
import { AnimatedLoaderGradient } from '@components/AnimatedLoaderGradient/AnimatedLoaderGradient'

type Props = {
    children?: React.ReactNode
    contentLeft?: React.ReactNode
    contentRight?: React.ReactNode
    extraHeight?: boolean
    showLoadingIndicator?: boolean
}

export const TouchNavBar = (props: Props) => {
    const centerContent = typeof props.children === 'string'
    const hasSideContent = !!props.contentLeft || !!props.contentRight
    const { offset } = useVisualViewportContext()
    return (
        <>
            {/* placeholder space */}
            <Stack paddingTop="safeAreaInsetTop">
                <Stack minHeight={props.extraHeight ? 'x7' : 'x5'} />
            </Stack>
            {/* absolute position to adapt to virtual keyboard */}
            <Box
                elevateReadability
                zIndex="uiAbove"
                width="100%"
                paddingTop="safeAreaInsetTop"
                style={{
                    position: 'absolute',
                    top: `calc(${offset ?? 0}px - var(--tabbar-vertical-offset, 0))`,
                }}
            >
                <Stack borderBottom height={props.extraHeight ? 'x7' : 'x5'} justifyContent="end">
                    <Stack horizontal justifyContent="center" height="100%" paddingY="sm">
                        {hasSideContent && (
                            <Box centerContent minWidth="x8">
                                {props.contentLeft}
                            </Box>
                        )}
                        <Stack
                            grow
                            position="relative"
                            overflow="hidden"
                            justifyContent="center"
                            alignItems={centerContent ? 'center' : undefined}
                        >
                            {centerContent ? (
                                <Paragraph truncate strong color="default" size="lg">
                                    {props.children}
                                </Paragraph>
                            ) : (
                                props.children
                            )}
                        </Stack>
                        {hasSideContent && (
                            <Box centerContent paddingRight="md" minWidth="x8">
                                {props.contentRight}
                            </Box>
                        )}
                    </Stack>
                    <AnimatePresence>
                        {props.showLoadingIndicator && <AnimatedLoaderGradient />}
                    </AnimatePresence>
                </Stack>
            </Box>
        </>
    )
}
