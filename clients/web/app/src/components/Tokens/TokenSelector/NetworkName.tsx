import React from 'react'
import { supportedNftNetworks } from '@components/Web3/utils'
import { Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'

// TODO: supportedNftNetworks will be grabbed from river
export function NetworkName(props: { chainId: number } & TextProps) {
    const { chainId, ...rest } = props
    return (
        <Text color="gray2" {...rest}>
            {supportedNftNetworks.find((network) => network.vChain.id === chainId)?.vChain.name}
        </Text>
    )
}
