import React from 'react'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { useChannelType } from 'hooks/useChannelType'

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
                <Stack justifyContent="spaceBetween" paddingY="sm">
                    <Paragraph color="gray1">Direct Message</Paragraph>
                    <Paragraph color="gray2">
                        This end-to-end encrypted chat is just between{' '}
                        <span className={atoms({ fontWeight: 'medium', color: 'default' })}>
                            {counterParty}
                        </span>{' '}
                        and you
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}
