import React from 'react'
import { Address } from 'wagmi'
import { shortAddress } from 'ui/utils/utils'
import { Stack } from '../Stack/Stack'
import { Avatar } from './Avatar'
import { Text } from '../Text/Text'

type Props = {
    address: Address
    name: string
}
export function AvatarTextHorizontal({ address, name }: Props) {
    return (
        <Stack horizontal centerContent gap>
            <Avatar userId={address} size="avatar_sm" />
            <Text strong size="lg">
                {name}
            </Text>
            <Text size="lg" color="gray2">
                {shortAddress(address)}
            </Text>
        </Stack>
    )
}
