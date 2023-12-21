import React, { useMemo } from 'react'
import { Box, Paragraph } from '@ui'

type Props = { label: string; new?: boolean; faded?: boolean }

export const DateDivider = React.forwardRef<HTMLElement, Props>((props, ref) => {
    const { label, new: isNew, faded: isNewFaded } = props
    const borderColor = isNew ? 'accent' : 'default'

    const opacityStyle = useMemo(
        () => (isNewFaded ? { opacity: 0.33, transition: `opacity 1s` } : undefined),
        [isNewFaded],
    )

    return (
        <>
            <Box
                horizontal
                gap="sm"
                alignItems="center"
                height="x6"
                position="absolute"
                width="100%"
                color={borderColor}
            >
                <Box grow borderBottom={borderColor} paddingTop="md" style={opacityStyle} />
                {!!isNew && (
                    <Box
                        centerContent
                        alignSelf="end"
                        color="accent"
                        height="x4"
                        paddingRight="lg"
                        style={opacityStyle}
                    >
                        <Paragraph size="xs" fontWeight="medium">
                            NEW
                        </Paragraph>
                    </Box>
                )}
            </Box>
            <Box centerContent top="none" display="block" position="sticky" zIndex="ui" ref={ref}>
                <Box centerContent color="gray2" paddingY="md">
                    <Box
                        border
                        paddingY="sm"
                        paddingX="md"
                        rounded="md"
                        background="default"
                        fontSize="sm"
                    >
                        {label}
                    </Box>
                </Box>
            </Box>
        </>
    )
})
