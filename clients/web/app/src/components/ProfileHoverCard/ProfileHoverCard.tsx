import React from 'react'
import { getAccountAddress, useUserLookupContext } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { useGetUserBio } from 'hooks/useUserBio'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { MutualTowns } from '@components/MutualTowns/MutualTowns'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props

    const { usersMap } = useUserLookupContext()

    const user = usersMap[userId]
    const userAddress = getAccountAddress(userId)
    const { data: userBio } = useGetUserBio(userAddress)

    return user ? (
        <Tooltip gap maxWidth="300" background="level2" border="level3">
            <Stack gap padding="sm">
                <Stack horizontal gap>
                    <Avatar userId={userId} size="avatar_lg" />

                    <Stack justifyContent="center" gap="sm">
                        {user.displayName.length > 0 && (
                            <Paragraph truncate strong color="default">
                                {user.displayName}
                            </Paragraph>
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
