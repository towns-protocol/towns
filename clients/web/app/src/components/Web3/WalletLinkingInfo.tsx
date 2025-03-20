import React from 'react'
import { Link } from 'react-router-dom'
import { Box, BoxProps, Icon, Stack, Text } from '@ui'

export function WalletLinkingInfo(props: BoxProps) {
    return (
        <Stack gap="md">
            <Box padding="md" rounded="sm" background="level2" width="100%" {...props}>
                <Text color="gray1">
                    We support
                    <Icon
                        type="delegateCash"
                        size="square_xs"
                        display="inline-flex"
                        style={{ marginRight: '2px', marginLeft: '4px' }}
                    />{' '}
                    Delegate.xyz.
                </Text>
            </Box>
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
                <Box horizontal gap="sm">
                    <Icon type="info" size="square_sm" shrink={false} />
                    <WalletLinkingInfoLink />
                </Box>
            </Box>
        </Stack>
    )
}

export function WalletLinkingInfoLink({
    text = 'Make sure your wallet is on Base network before linking.',
}: {
    text?: string
}) {
    return (
        <Text display="inline" size="sm">
            {text}{' '}
            <Link
                to="https://www.notion.so/herenottherelabs/Linking-Wallets-1053562b1f4e807e8f6ecda74313ef2c"
                target="_blank"
                rel="noopener noreferrer"
            >
                <Text as="span" display="inline" color="cta2" size="sm">
                    Instructions here
                </Text>
            </Link>
            .
        </Text>
    )
}
