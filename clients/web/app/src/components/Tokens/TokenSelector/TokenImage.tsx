import React from 'react'
import { Box, BoxProps, Icon } from '@ui'
import { TokenDataWithChainId } from '../types'

type Props = {
    imgSrc: TokenDataWithChainId['data']['imgSrc'] | undefined
    width?: BoxProps['width']
} & BoxProps

export function TokenImage({ imgSrc, width = 'x4', ...boxProps }: Props) {
    if (!imgSrc) {
        return (
            <Box
                centerContent
                horizontal
                background="level4"
                rounded="sm"
                width={width}
                aspectRatio="square"
                {...boxProps}
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
            {...boxProps}
        />
    )
}
