import React from 'react'
import { Box, Stack, Text } from '@ui'

type Props = {
    children?: React.ReactNode
    contentLeft?: React.ReactNode
    contentRight?: React.ReactNode
}

export const TouchNavBar = (props: Props) => {
    const centerTitle = typeof props.children === 'string'
    const hasSideContent = !!props.contentLeft || !!props.contentRight
    return (
        <Box elevateReadability paddingTop="safeAreaInsetTop">
            <Stack horizontal borderBottom height="x8" justifyContent="center" alignItems="center">
                {hasSideContent && (
                    <Box centerContent height="x8" aspectRatio="1/1">
                        {props.contentLeft}
                    </Box>
                )}
                <Stack
                    grow
                    position="relative"
                    overflowX="hidden"
                    height="100%"
                    justifyContent="center"
                    alignItems={centerTitle ? 'center' : undefined}
                >
                    {centerTitle ? (
                        <Text fontWeight="strong">{props.children}</Text>
                    ) : (
                        props.children
                    )}
                </Stack>
                {hasSideContent && (
                    <Box centerContent height="x8" aspectRatio="1/1">
                        {props.contentRight}
                    </Box>
                )}
            </Stack>
        </Box>
    )
}
