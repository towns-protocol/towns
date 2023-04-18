import React from 'react'
import { createUserIdFromString, useSpaceData, useSpaceMembers } from 'use-zion-client'
import { Avatar, Card, Paragraph, Stack } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { useGetUserBio } from 'hooks/useUserBio'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props
    const { membersMap } = useSpaceMembers()
    const space = useSpaceData()
    const user = membersMap[userId]
    const userAddress = createUserIdFromString(userId)?.accountAddress
    const { data: userBio } = useGetUserBio(userAddress)

    return (
        <Card padding gap width="300">
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
                        {user.name}
                    </Paragraph>
                    <Paragraph color="gray2">{userAddress && shortAddress(userAddress)}</Paragraph>
                </Stack>
            </Stack>

            <Stack>
                <Paragraph color="gray2" size="sm">
                    Member of {space?.name}
                </Paragraph>
                <Paragraph strong size="sm">
                    Bio
                </Paragraph>
                <Paragraph size="sm" color="gray1">
                    {userBio ?? `no biography just yet`}
                </Paragraph>
            </Stack>
        </Card>
    )
}
