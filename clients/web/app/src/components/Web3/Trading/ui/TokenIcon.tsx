import React, { CSSProperties } from 'react'
import { Box, Icon } from '@ui'

type AssetData = {
    imageUrl?: string
    name?: string
    chain?: string
}

const tokenStyle = {
    width: '14px',
    height: '14px',
} as CSSProperties

const iconStyle = {
    width: '11px',
    height: '11px',
} as CSSProperties

export const TokenIcon = (props: { asset: AssetData }) => {
    const { asset } = props
    return asset.imageUrl && asset.imageUrl !== 'missing.png' ? (
        <Box position="relative">
            <Box square="square_lg" as="img" src={asset.imageUrl} rounded="full" />
            {asset.chain && ['solana-mainnet', 'base'].includes(asset.chain) && (
                <Box
                    centerContent
                    position="bottomRight"
                    background={asset.chain === 'base' ? 'base' : 'level2'}
                    rounded="xs"
                    style={tokenStyle}
                >
                    <Icon
                        style={iconStyle}
                        type={
                            asset.chain === 'solana-mainnet'
                                ? 'solana'
                                : asset.chain === 'base'
                                ? 'base'
                                : 'ethFilled'
                        }
                    />
                </Box>
            )}
        </Box>
    ) : (
        <Icon size="square_lg" type="token" color="gray1" />
    )
}
