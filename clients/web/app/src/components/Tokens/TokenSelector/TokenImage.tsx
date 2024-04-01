import React from 'react'
import { Box, BoxProps, Icon } from '@ui'
import { TokenDataWithChainId } from '../types'

export function TokenImage({
    imgSrc,
    width = 'x4',
}: {
    imgSrc: TokenDataWithChainId['data']['imgSrc'] | undefined
    width?: BoxProps['width']
}) {
    if (!imgSrc) {
        return (
            <Box
                centerContent
                horizontal
                background="level4"
                rounded="sm"
                width={width}
                aspectRatio="square"
            >
                <Icon type="token" size="square_md" color="gray2" />
            </Box>
        )
    }
    return (
        <Box
            as="img"
            src={imgSrc}
            width={width}
            rounded="sm"
            aspectRatio="square"
            background="level4"
        />
    )
}
