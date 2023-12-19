import React from 'react'
import { Box, Paragraph, Stack } from '@ui'
import { useVisualViewportContext } from '@components/VisualViewportContext/VisualViewportContext'

type Props = {
    children?: React.ReactNode
    contentLeft?: React.ReactNode
    contentRight?: React.ReactNode
    extraHeight?: boolean
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
                <Stack
                    borderBottom
                    height={props.extraHeight ? 'x7' : 'x5'}
                    justifyContent="end"
                    paddingY="sm"
                >
                    <Stack horizontal justifyContent="center" height="100%">
                        {hasSideContent && (
                            <Box centerContent width="x10">
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
                            <Box centerContent width="x8">
                                {props.contentRight}
                            </Box>
                        )}
                    </Stack>
                </Stack>
            </Box>
        </>
    )
}
