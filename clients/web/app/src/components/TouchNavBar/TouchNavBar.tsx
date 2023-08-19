import React from 'react'
import { Box, Paragraph, Stack } from '@ui'

type Props = {
    children?: React.ReactNode
    contentLeft?: React.ReactNode
    contentRight?: React.ReactNode
    extraHeight?: boolean
}

export const TouchNavBar = (props: Props) => {
    const centerContent = typeof props.children === 'string'
    const hasSideContent = !!props.contentLeft || !!props.contentRight
    return (
        <Box elevateReadability paddingTop="safeAreaInsetTop">
            <Stack
                borderBottom
                height={props.extraHeight ? 'x7' : 'x5'}
                justifyContent="end"
                paddingBottom="sm"
            >
                <Stack horizontal justifyContent="center" height={props.extraHeight ? 'x7' : 'x5'}>
                    {hasSideContent && (
                        <Box centerContent width="x10">
                            {props.contentLeft}
                        </Box>
                    )}
                    <Stack
                        grow
                        position="relative"
                        overflowX="hidden"
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
    )
}
