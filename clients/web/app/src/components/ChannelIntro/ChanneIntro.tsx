import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDMData, useMyUserId } from 'use-zion-client'
import { GroupDMIcon } from '@components/DirectMessages/GroupDMIcon'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { UserList } from '@components/UserList/UserList'
import { Box, Icon, Paragraph, Stack, Text } from '@ui'
import { useChannelType } from 'hooks/useChannelType'
import { notUndefined } from 'ui/utils/utils'
import { Avatar } from '@components/Avatar/Avatar'

type Props = {
    roomIdentifier: string
    name?: string
    description?: string
}

export const ChannelIntro = (props: Props) => {
    const { roomIdentifier } = props
    const channelType = useChannelType(roomIdentifier)
    if (channelType === 'channel') {
        return <RegularChannelIntro {...props} />
    } else if (channelType === 'dm') {
        return <ChannelDMIntro roomIdentifier={roomIdentifier} />
    } else if (channelType === 'gdm') {
        return <ChannelGDMIntro roomIdentifier={roomIdentifier} />
    }
}

const RegularChannelIntro = (props: Props) => {
    const { name = 'general', description } = props

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level2" aspectRatio="1/1" height="x7">
                    <Icon type="tag" color="gray2" size="square_lg" />
                </Box>
                <Stack justifyContent="spaceBetween" paddingY="sm">
                    <Paragraph color="gray1">{name}</Paragraph>
                    <Paragraph color="gray2">
                        {description
                            ? description
                            : `Welcome to #${name}, an end-to-end encrypted channel`}
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}

export const ChannelDMIntro = (props: { roomIdentifier: string }) => {
    const { counterParty } = useDMData(props.roomIdentifier)
    const myUserId = useMyUserId()

    const userIds = useMemo(() => [counterParty].filter(notUndefined), [counterParty])

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap="lg">
                <Avatar key={userIds[0]} userId={userIds[0] || myUserId} size="avatar_x10" />

                <Stack justifyContent="start" paddingY="sm" overflow="hidden">
                    <Paragraph color="gray1" size="lg">
                        Direct Message
                    </Paragraph>
                    {userIds.length === 0 ? (
                        <Paragraph color="gray2" size="lg">
                            <Text strong display="inline" as="span" color="default" size="lg">
                                This is your space.
                            </Text>{' '}
                            Draft messages, list your to-dos, or keep links and files handy. You can
                            also talk to yourself here, but please bear in mind you’ll have to
                            supply both sides of the conversation.
                        </Paragraph>
                    ) : (
                        <Paragraph color="gray2">
                            This end-to-end encrypted chat is just between{' '}
                            <UserList
                                userIds={userIds}
                                renderUser={(props) => <UserWithTooltip {...props} />}
                            />
                        </Paragraph>
                    )}
                </Stack>
            </Stack>
        </Stack>
    )
}

export const ChannelGDMIntro = (props: { roomIdentifier: string }) => {
    const { data } = useDMData(props.roomIdentifier)

    const userList = data?.userIds ? (
        <UserList userIds={data?.userIds} renderUser={(props) => <UserWithTooltip {...props} />} />
    ) : (
        <></>
    )

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" aspectRatio="1/1" width="x12">
                    <GroupDMIcon roomIdentifier={props.roomIdentifier} width="x12" />
                </Box>

                <Stack justifyContent="center" paddingY="sm" overflow="hidden">
                    <Paragraph color="gray1" size="lg">
                        Group Message
                    </Paragraph>
                    <Paragraph color="gray2" size="lg">
                        This end-to-end encrypted chat is just between {userList}
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}

const UserWithTooltip = ({ displayName, userId }: { displayName: string; userId: string }) => (
    <Box
        color="default"
        display="inline"
        key={userId}
        fontWeight="medium"
        tooltip={<ProfileHoverCard userId={userId} />}
    >
        <Link to={`profile/${userId}`}>{displayName}</Link>
    </Box>
)
