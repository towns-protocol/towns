import React from 'react'
import { useNetwork } from 'wagmi'
import { Box, Text } from '@ui'

type Props = {
    MATRIX_HOMESERVER_URL: string
}
export const DebugBar = ({ MATRIX_HOMESERVER_URL }: Props) => {
    const { chain } = useNetwork()
    const serverBg = MATRIX_HOMESERVER_URL.includes('localhost') ? 'etherum' : 'cta1'
    const chainBg = !chain?.name
        ? 'level3'
        : chain?.name.toLowerCase().includes('foundry')
        ? 'etherum'
        : 'cta1'

    return (
        <Box
            position="fixed"
            zIndex="tooltips"
            width="100%"
            paddingX="md"
            bottom="none"
            paddingY="xs"
            flexDirection="row"
            gap="sm"
            justifyContent="end"
        >
            <Box flexDirection="row" alignItems="center" gap="sm">
                <Box
                    background={serverBg}
                    rounded="full"
                    style={{ width: '20px', height: '20px' }}
                />
                <Text strong size="sm">
                    Server: {MATRIX_HOMESERVER_URL}
                </Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="sm">
                <Box
                    background={chainBg}
                    rounded="full"
                    style={{ width: '20px', height: '20px' }}
                />
                <Text strong size="sm">
                    Chain: {chain?.name || 'Not connected'}
                </Text>
            </Box>
        </Box>
    )
}
