import React from 'react'
import { Address, useUserLookupContext } from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { useGetUserBio } from 'hooks/useUserBio'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { MutualTowns } from '@components/MutualTowns/MutualTowns'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useResolveEnsName } from 'api/lib/ensNames'
import { Icon, Text } from '@ui'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props

    const { usersMap } = useUserLookupContext()
    const user = usersMap[userId]
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })
    const { data: userBio } = useGetUserBio(abstractAccountAddress)
    const { resolvedEnsName } = useResolveEnsName({ userId, ensAddress: user?.ensAddress })

    return user ? (
        <Tooltip gap elevate maxWidth="300" background="level2">
            <Stack gap padding="sm">
                <Stack horizontal gap>
                    <Avatar userId={userId} size="avatar_lg" />

                    <Stack justifyContent="center" gap="sm">
                        {user.displayName.length > 0 && (
                            <Paragraph truncate strong color="default">
                                {user.displayName}
                            </Paragraph>
                        )}
                        {resolvedEnsName && (
                            <Stack horizontal key={resolvedEnsName} alignItems="center" gap="xs">
                                <Text size="sm" color="default">
                                    {resolvedEnsName}
                                </Text>
                                <Icon type="verifiedEnsName" size="square_sm" color="gray2" />
                            </Stack>
                        )}

                        {user.username.length > 0 && (
                            <Paragraph truncate color="gray2">
                                @{user.username}
                            </Paragraph>
                        )}
                    </Stack>
                </Stack>
                {user && (
                    <Stack horizontal gap="xs" color="gray1" alignItems="center" paddingX="sm">
                        <MutualTowns user={user} />
                    </Stack>
                )}
                {userBio && (
                    <Stack>
                        <Paragraph strong size="md">
                            Bio
                        </Paragraph>
                        <Paragraph size="md" color="gray2">
                            {userBio}
                        </Paragraph>
                    </Stack>
                )}
            </Stack>
        </Tooltip>
    ) : (
        <Tooltip>User info not available</Tooltip>
    )
}
