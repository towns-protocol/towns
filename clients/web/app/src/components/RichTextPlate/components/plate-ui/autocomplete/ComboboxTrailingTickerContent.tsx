import React, { PropsWithChildren } from 'react'
import { Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'

export const ComboboxTrailingTickerContent = ({
    address,
    chain,
}: PropsWithChildren<{ address: string; chain: string }>) => {
    return (
        <Text truncate color="gray2">
            {shortAddress(address)}@{chain}
        </Text>
    )
}
