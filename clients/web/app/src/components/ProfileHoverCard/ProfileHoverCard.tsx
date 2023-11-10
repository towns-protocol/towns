import React from 'react'
import { getAccountAddress, useSpaceData, useSpaceMembers } from 'use-zion-client'
import { shortAddress } from 'ui/utils/utils'
import { useGetUserBio } from 'hooks/useUserBio'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Stack } from 'ui/components/Stack/Stack'
import { Avatar } from 'ui/components/Avatar/Avatar'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props
    const { membersMap } = useSpaceMembers()
    const space = useSpaceData()
    const user = membersMap[userId]
    const userAddress = getAccountAddress(userId)
    const { data: userBio } = useGetUserBio(userAddress)

    return user ? (
        <Tooltip gap padding maxWidth="300">
            <Stack horizontal gap>
                <Stack
                    width="x10"
                    aspectRatio="1/1"
                    position="relative"
                    rounded="full"
                    overflow="hidden"
                >
                    <Avatar userId={userId} size="avatar_100" />
                </Stack>
                <Stack justifyContent="center" gap="sm">
                    <Paragraph truncate strong>
                        {getPrettyDisplayName(user).displayName}
                    </Paragraph>
                    <Paragraph color="gray2">{userAddress && shortAddress(userAddress)}</Paragraph>
                </Stack>
            </Stack>

            <Stack>
                <Paragraph color="gray2" size="sm">
                    Member of {space?.name}
                </Paragraph>
                {userBio && (
                    <>
                        <Paragraph strong size="sm">
                            Bio
                        </Paragraph>
                        <Paragraph size="sm" color="gray1">
                            {userBio}
                        </Paragraph>
                    </>
                )}
            </Stack>
        </Tooltip>
    ) : (
        <Tooltip>User info not available</Tooltip>
    )
}
