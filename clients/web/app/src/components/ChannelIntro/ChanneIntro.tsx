import React, { useMemo } from 'react'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { Box, Icon, Paragraph, Stack, Text } from '@ui'
import { useChannelType } from 'hooks/useChannelType'
import { shortAddress } from 'ui/utils/utils'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'

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
    if (!counterParty) {
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
                        <Text as="span" color="default" fontWeight="medium" display="inline">
                            {shortAddress(counterParty)}
                        </Text>{' '}
                        and you
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}

export const ChannelGDMIntro = (props: { roomIdentifier: RoomIdentifier }) => {
    const { data } = useDMData(props.roomIdentifier)

    const memberLinks = useMemo(() => {
        if (!data?.userIds) {
            return []
        }
        return data.userIds.map((userId) => {
            return (
                <Box display="inline" key={userId} tooltip={<ProfileHoverCard userId={userId} />}>
                    <Link to={`profile/${userId}`}>{shortAddress(userId)}</Link>
                </Box>
            )
        })
    }, [data?.userIds])

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level2" aspectRatio="1/1" height="x7">
                    <Icon type="tag" color="gray2" size="square_lg" />
                </Box>
                <Stack justifyContent="spaceBetween" paddingY="sm" overflow="hidden">
                    <Paragraph color="gray2">
                        <Text as="span" color="gray1" fontWeight="medium" display="inline">
                            {memberLinks.map((link, index) => [index > 0 && ', ', link])}
                        </Text>{' '}
                        and you
                    </Paragraph>
                    <Paragraph color="gray2">
                        This end-to-end encrypted chat is just between{' '}
                        <Text as="span" color="default" fontWeight="medium" display="inline">
                            {memberLinks.map((link, index) => [index > 0 && ', ', link])}
                        </Text>{' '}
                        and you
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}
