import React from 'react'
import { RoomIdentifier, useDMData, useMyProfile } from 'use-zion-client'
import { isDMChannelStreamId } from '@river/sdk'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { atoms } from 'ui/styles/atoms.css'

type Props = {
    roomIdentifier: RoomIdentifier
    name?: string
    description?: string
    channelEncrypted?: boolean
}

export const ChannelIntro = (props: Props) => {
    const { roomIdentifier } = props
    const channelContext = isDMChannelStreamId(roomIdentifier?.networkId ?? '') ? 'dm' : 'channel'
    if (channelContext === 'channel') {
        return <RegularChannelIntro {...props} />
    } else {
        return <ChannelDMIntro roomIdentifier={roomIdentifier} />
    }
}

const RegularChannelIntro = (props: Props) => {
    const { name = 'general', description, channelEncrypted: isChannelEncrypted } = props

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
                            : `Welcome to #${name}${
                                  isChannelEncrypted ? `, an end-to-end encrypted channel` : ``
                              }`}
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}

export const ChannelDMIntro = (props: { roomIdentifier: RoomIdentifier }) => {
    const userId = useMyProfile()?.userId
    const { data } = useDMData(props.roomIdentifier)
    const counterParty = data?.userIds.find((u) => u !== userId)
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
