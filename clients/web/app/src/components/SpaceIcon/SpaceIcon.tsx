import React from 'react'
import { Box, BoxProps, Text } from '@ui'
import { LetterStyles, LetterStylesVariantProps } from './SpaceIcon.css'

type Props = {
    spaceId: string
    firstLetterOfSpaceName: string
    letterFontSize?: LetterStylesVariantProps
} & BoxProps

export const SpaceIcon = (props: Props) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { spaceId, letterFontSize, firstLetterOfSpaceName, ...boxProps } = props

    // TODO: call space worker storage with spaceId to determine if image exists
    const hasImage = false
    return (
        <Box
            centerContent
            horizontal
            background="level2"
            borderRadius="full"
            flexDirection="row"
            {...boxProps}
        >
            {hasImage ? null : (
                <Text
                    strong
                    textTransform="uppercase"
                    className={LetterStyles(letterFontSize ? { fontSize: letterFontSize } : {})}
                >
                    {firstLetterOfSpaceName}
                </Text>
            )}
        </Box>
    )
}
