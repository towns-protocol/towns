import React from 'react'
import { Address } from 'wagmi'
import { shortAddress } from 'ui/utils/utils'
import { Stack } from '../../ui/components/Stack/Stack'
import { Avatar } from './Avatar'
import { Text } from '../../ui/components/Text/Text'

type Props = {
    prepend?: React.ReactNode
    userId: string
    abstractAccountaddress: Address | undefined
    name?: string
}
export function AvatarTextHorizontal({ abstractAccountaddress, name, prepend, userId }: Props) {
    return (
        <Stack horizontal gap="sm" alignItems="center">
            {prepend}
            <Avatar userId={userId} size="avatar_sm" insetY="xs" />
            {name && (
                <Text strong size="lg">
                    {name}
                </Text>
            )}
            {abstractAccountaddress && (
                <Text size="lg" color="gray2">
                    {shortAddress(abstractAccountaddress)}
                </Text>
            )}
        </Stack>
    )
}
