import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { GroupDMIcon } from '@components/DirectMessages/GroupDMIcon'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { UserList } from '@components/UserList/UserList'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { useChannelType } from 'hooks/useChannelType'
import { notUndefined } from 'ui/utils/utils'

type Props = {
    roomIdentifier: RoomIdentifier
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

export const ChannelDMIntro = (props: { roomIdentifier: RoomIdentifier }) => {
    const { counterParty } = useDMData(props.roomIdentifier)

    const userIds = useMemo(() => [counterParty].filter(notUndefined), [counterParty])

    if (!userIds.length) {
        return null
    }

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level2" aspectRatio="1/1" height="x7">
                    <Icon type="tag" color="gray2" size="square_lg" />
                </Box>
                <Stack justifyContent="spaceBetween" paddingY="sm" overflow="hidden">
                    <Paragraph color="gray1">Direct Message</Paragraph>
                    <Paragraph color="gray2">
                        This end-to-end encrypted chat is just between{' '}
                        <UserList
                            userIds={userIds}
                            renderUser={(props) => <UserWithTooltip {...props} />}
                        />
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}

export const ChannelGDMIntro = (props: { roomIdentifier: RoomIdentifier }) => {
    const { data } = useDMData(props.roomIdentifier)

    const userList = data?.userIds ? (
        <UserList userIds={data?.userIds} renderUser={(props) => <UserWithTooltip {...props} />} />
    ) : (
        <></>
    )

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <GroupDMIcon roomIdentifier={props.roomIdentifier} />
                <Stack justifyContent="spaceBetween" paddingY="sm" overflow="hidden">
                    <Paragraph color="gray1">Group Message</Paragraph>
                    <Paragraph color="gray2">
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
