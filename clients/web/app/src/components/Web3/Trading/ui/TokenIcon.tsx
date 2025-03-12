import React, { CSSProperties } from 'react'
import { Box, Icon } from '@ui'
import { isTradingChain, tradingChains } from '../tradingConstants'

type AssetData = {
    imageUrl?: string
    name?: string
    chain: keyof typeof tradingChains | undefined
}

const tokenStyle = {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '12px',
    height: '12px',
    boxShadow: `0 0 0 1px var(--background)`,
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
            {asset.chain && isTradingChain(asset.chain) && (
                <Box style={tokenStyle} rounded="xs">
                    <Box
                        centerContent
                        background={asset.chain === '8453' ? 'base' : 'level2'}
                        rounded="xs"
                    >
                        <Icon
                            style={iconStyle}
                            type={
                                asset.chain === 'solana-mainnet'
                                    ? 'solana'
                                    : asset.chain === '8453'
                                    ? 'base'
                                    : 'ethFilled'
                            }
                        />
                    </Box>
                </Box>
            )}
        </Box>
    ) : (
        <Icon size="square_lg" type="token" color="gray1" />
    )
}
