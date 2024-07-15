import React, { useMemo } from 'react'
import { Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'

export function NetworkName(props: { chainId: number } & TextProps) {
    const { chainId, ...rest } = props

    const networkName = useMemo(() => {
        switch (chainId) {
            case 1:
                return 'Ethereum'
            case 137:
                return 'Polygon'
            case 42161:
                return 'Arbitrum'
            case 10:
                return 'Optimism'
            case 8453:
                return 'Base'
            case 84532:
                return 'Base Sepolia'
            case 11155111:
                return 'Sepolia'
            default:
                return 'Unknown'
        }
    }, [chainId])
    return (
        <Text color="gray2" {...rest}>
            {networkName}
        </Text>
    )
}
