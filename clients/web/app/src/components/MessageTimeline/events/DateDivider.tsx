import React from 'react'
import { Box, Paragraph } from '@ui'

type Props = { label: string; new?: boolean }

export const DateDivider = React.forwardRef<HTMLElement, Props>((props, ref) => {
    const { label, new: isNew } = props
    const borderColor = isNew ? 'negative' : 'default'
    return (
        <>
            <Box
                horizontal
                gap
                alignItems="center"
                paddingX="lg"
                height="x4"
                position="absolute"
                width="100%"
                color={borderColor}
            >
                <Box grow borderBottom={borderColor} />
                {!!isNew && (
                    <Box color="negative">
                        <Paragraph size="sm">NEW</Paragraph>
                    </Box>
                )}
            </Box>
            <Box centerContent top="md" display="block" position="sticky" zIndex="ui" ref={ref}>
                <Box centerContent color={isNew ? 'negative' : 'gray2'}>
                    <Box
                        paddingY="sm"
                        paddingX="md"
                        rounded="md"
                        background="default"
                        border={borderColor}
                        fontSize="sm"
                    >
                        {label}
                    </Box>
                </Box>
            </Box>
        </>
    )
})
