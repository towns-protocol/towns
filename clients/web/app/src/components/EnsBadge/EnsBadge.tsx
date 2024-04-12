import React from 'react'
import { useResolveEnsName } from 'api/lib/ensNames'
import { Icon, Stack, Text } from '@ui'

export const EnsBadge = (props: { userId: string; ensAddress: string }) => {
    const { userId, ensAddress } = props
    const { resolvedEnsName } = useResolveEnsName({ userId: userId, ensAddress: ensAddress })

    if (!resolvedEnsName || !resolvedEnsName) {
        return null
    }

    return (
        <Stack
            horizontal
            hoverable
            cursor="pointer"
            key={resolvedEnsName}
            alignItems="center"
            gap="xs"
            color={{ hover: 'accent', default: 'default' }}
        >
            <Text size="sm">{resolvedEnsName}</Text>
            <Icon type="verifiedEnsName" size="square_sm" color="gray2" />
        </Stack>
    )
}
