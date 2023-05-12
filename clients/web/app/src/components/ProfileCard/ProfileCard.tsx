import React from 'react'
import { Link } from 'react-router-dom'
import { useSpaceData, useSpaceMembers } from 'use-zion-client'
import { Card, Paragraph, Stack } from '@ui'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { shortAddress } from 'ui/utils/utils'
import { Avatar } from 'ui/components/Avatar/Avatar'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

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
                    <Stack
                        width="x10"
                        aspectRatio="1/1"
                        position="relative"
                        rounded="full"
                        overflow="hidden"
                    >
                        <Avatar userId={userId} size="avatar_100" />
                        <Stack
                            absoluteFill
                            centerContent
                            padding
                            background="transparentDark"
                            opacity={{
                                default: 'transparent',
                                hover: 'opaque',
                            }}
                            transition="default"
                        >
                            <Paragraph
                                strong
                                textAlign="center"
                                textTransform="uppercase"
                                size="sm"
                            >
                                View Profile
                            </Paragraph>
                        </Stack>
                    </Stack>
                </Link>
                <Stack justifyContent="center" gap="sm">
                    <Paragraph truncate strong>
                        {getPrettyDisplayName(user).name}
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
                    {`Please come back when I have written my bio. It shouldn't be more thans a few
                    lines written in a way that makes you want to know more about me.`}
                </Paragraph>
            </Stack>
        </Card>
    )
}
