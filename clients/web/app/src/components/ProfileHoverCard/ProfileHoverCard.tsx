import React from 'react'
import { createUserIdFromString, useSpaceData, useSpaceMembers } from 'use-zion-client'
import { shortAddress } from 'ui/utils/utils'
import { useGetUserBio } from 'hooks/useUserBio'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Stack } from 'ui/components/Stack/Stack'
import { Avatar } from 'ui/components/Avatar/Avatar'
import { MotionBox } from 'ui/components/Motion/MotionBox'

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
        <MotionBox
            border
            gap
            padding
            background="level2"
            rounded="sm"
            maxWidth="300"
            boxShadow="avatar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.1 }}
        >
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
        </MotionBox>
    )
}
