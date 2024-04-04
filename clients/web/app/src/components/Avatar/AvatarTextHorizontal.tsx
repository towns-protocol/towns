import React from 'react'
import { Address } from 'use-towns-client'
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
            <Stack
                horizontal
                alignItems="center"
                gap="sm"
                padding="xs"
                rounded="full"
                paddingRight="sm"
                background="lightHover"
            >
                <Avatar userId={userId} size="avatar_sm" />
                {name && (
                    <Text strong size="md">
                        {name}
                    </Text>
                )}
                {abstractAccountaddress && (
                    <Text size="md" color="default" fontWeight="medium">
                        {shortAddress(abstractAccountaddress)}
                    </Text>
                )}
            </Stack>
        </Stack>
    )
}
