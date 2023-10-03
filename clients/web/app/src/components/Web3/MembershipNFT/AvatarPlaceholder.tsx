import React from 'react'
import { Address } from 'wagmi'
import { Avatar, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'

// TBD
type Props = {
    member: {
        address: Address | undefined
        displayName?: string
    }
}

export function AvatarPlaceholder({ member }: Props) {
    const hasAddress = !!member.address
    return (
        <Stack centerContent gap="xs">
            {hasAddress ? (
                <Avatar size="avatar_lg" userId={member.address} />
            ) : (
                <Stack aspectRatio="1/1" width="x8" background="level2" rounded="full" />
            )}
            <Stack
                centerContent
                height="x2"
                background={hasAddress ? 'none' : 'level2'}
                width="x12"
                rounded="xs"
                textAlign="center"
            >
                {hasAddress && <Text size="sm">{member.displayName ?? ''}</Text>}
            </Stack>
            <Stack
                centerContent
                height="x3"
                width="x11"
                background={hasAddress ? 'level4' : 'level2'}
                paddingX={hasAddress ? 'sm' : 'none'}
                rounded="sm"
            >
                {hasAddress && <Text size="sm">{shortAddress(member.address ?? '')}</Text>}
            </Stack>
        </Stack>
    )
}

{
    /* <Stack centerContent gap="xs">
            <Stack aspectRatio="1/1" width="x8" background="level2" rounded="full" />
            <Stack width="x12" height="x2" background="level2" rounded="xs" />
            <Stack width="x11" height="x3" background="level2" rounded="sm" />
        </Stack> */
}
