import React from 'react'
import { Link } from 'react-router-dom'
import { Box, BoxProps, Icon, Text } from '@ui'
import { isTouch } from 'hooks/useDevice'

export function WalletLinkingInfo(props: BoxProps) {
    if (isTouch()) {
        return null
    }

    return (
        <Box
            horizontal
            padding
            rounded="sm"
            background={props.background || 'level2'}
            justifyContent="start"
            alignItems="center"
            gap="sm"
            {...props}
        >
            <Icon type="info" size="square_sm" shrink={false} />
            <WalletLinkingInfoLink />
        </Box>
    )
}

export function WalletLinkingInfoLink(props: { text?: string }) {
    const { text = 'Make sure your wallet is on Base network before linking.' } = props
    return (
        <Text display="inline">
            {`${text} `}
            <Link
                to="https://www.notion.so/herenottherelabs/Linking-Wallets-1053562b1f4e807e8f6ecda74313ef2c"
                target="_blank"
                rel="noopener noreferrer"
            >
                <Text as="span" display="inline" color="cta2">
                    Instructions here
                </Text>
            </Link>
            .
        </Text>
    )
}
