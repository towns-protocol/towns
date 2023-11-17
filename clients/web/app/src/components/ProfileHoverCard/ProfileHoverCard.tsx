import React, { useMemo } from 'react'
import {
    RoomMember,
    getAccountAddress,
    useAllKnownUsers,
    useSpaceData,
    useSpaceMembers,
    useZionContext,
} from 'use-zion-client'
import { useGetUserBio } from 'hooks/useUserBio'
import { Avatar } from '@components/Avatar/Avatar'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { shortAddress } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props
    const { spaces } = useZionContext()
    const { usersMap } = useAllKnownUsers()
    const { membersMap } = useSpaceMembers()
    const combinedUsers: { [userId: string]: RoomMember & { memberOf?: string[] } } = useMemo(
        () => ({ ...usersMap, ...membersMap }),
        [membersMap, usersMap],
    )
    const space = useSpaceData()

    const user = combinedUsers[userId]
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
                    Member of{' '}
                    {user?.memberOf?.length
                        ? user.memberOf.map(
                              (spaceId) => spaces.find((f) => f.id.networkId === spaceId)?.name,
                          )
                        : space?.name}
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
