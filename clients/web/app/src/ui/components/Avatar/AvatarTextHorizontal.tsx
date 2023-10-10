import React from 'react'
import { Address } from 'wagmi'
import { shortAddress } from 'ui/utils/utils'
import { Stack } from '../Stack/Stack'
import { Avatar } from './Avatar'
import { Text } from '../Text/Text'

type Props = {
    prepend?: React.ReactNode
    address: Address
    name?: string
}
export function AvatarTextHorizontal({ address, name, prepend }: Props) {
    return (
        <Stack horizontal gap="sm" alignItems="center">
            {prepend}
            <Avatar userId={address} size="avatar_sm" insetY="xs" />
            {name && (
                <Text strong size="lg">
                    {name}
                </Text>
            )}
            <Text size="lg" color="gray2">
                {shortAddress(address)}
            </Text>
        </Stack>
    )
}
