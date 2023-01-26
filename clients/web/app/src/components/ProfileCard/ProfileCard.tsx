import React from 'react'
import { Link } from 'react-router-dom'
import { useSpaceData, useSpaceMembers } from 'use-zion-client'
import { Avatar, BackgroundImage, Card, Paragraph, Stack } from '@ui'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    userId: string
}

export const ProfileCard = (props: Props) => {
    const { userId } = props
    const { membersMap } = useSpaceMembers()
    const user = membersMap[userId]
    const context = useCardOpenerContext()
    const space = useSpaceData()

    if (!user) {
        return null
    }

    const userAddress = user.userId.match(/0x[a-f0-9]{40}/i)?.[0] ?? ''

    return (
        <Card padding gap minWidth="300">
            <Stack horizontal gap>
                <Link to={`profile/${userId}/`} onClick={context.closeCard}>
                    <Stack>
                        <BackgroundImage
                            src={user.avatarUrl}
                            width="x10"
                            aspectRatio="1/1"
                            rounded="full"
                        />
                    </Stack>
                </Link>
                <Stack justifyContent="center" gap="sm">
                    <Paragraph truncate strong>
                        {user.name}
                    </Paragraph>
                    <Paragraph color="gray2">{shortAddress(userAddress)}</Paragraph>
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
                    Born and raised degen
                </Paragraph>
            </Stack>
        </Card>
    )
}
