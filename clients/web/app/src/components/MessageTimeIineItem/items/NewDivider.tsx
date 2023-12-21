import React, { useMemo } from 'react'
import { Box, BoxProps, Paragraph, Stack } from '@ui'

type Props = {
    faded?: boolean
    hidden?: boolean
} & BoxProps

const style = { top: -12 }

export const NewDivider = (props: Props) => {
    const { faded: isNewFaded, ...boxProps } = props

    const opacityStyle = useMemo(
        () => (isNewFaded ? { opacity: 0.33, transition: `opacity 1s`, ...style } : style),
        [isNewFaded],
    )

    return (
        <Stack grow horizontal position="relative" width="100%" style={{ height: 0 }}>
            <Stack
                horizontal
                zIndex="above"
                width="100%"
                position="absolute"
                gap="sm"
                paddingY="sm"
                alignItems="center"
                paddingRight="lg"
                paddingLeft="none"
                {...boxProps}
                style={opacityStyle}
            >
                <Box grow borderBottom="accent" />
                <Box centerContent color="accent">
                    <Paragraph size="xs" fontWeight="medium">
                        NEW
                    </Paragraph>
                </Box>
            </Stack>
        </Stack>
    )
}
