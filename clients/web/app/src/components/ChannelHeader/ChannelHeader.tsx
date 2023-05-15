import React, { useCallback, useState } from 'react'
import { Channel, RoomIdentifier, useRoom } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChannelUsersPill } from '@components/ChannelUserPill/ChannelUserPill'
import { Box, Icon, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { StackLayoutDropdown } from './StackLayoutDropdown'

type Props = {
    channel: Channel
    spaceId: RoomIdentifier
}

export const ChannelHeader = (props: Props) => {
    const { isMobile } = useDevice()
    return isMobile ? <MobileChannelHeader {...props} /> : <DesktopChannelHeader {...props} />
}

const MobileChannelHeader = (props: Props) => {
    const { channel } = props
    const [dropDownOpen, setDropDownOpen] = useState(false)

    const toggleDropDown = useCallback(() => {
        setDropDownOpen(!dropDownOpen)
    }, [dropDownOpen])

    return (
        <Stack height="auto" background="level1" zIndex="uiAbove">
            <Stack
                horizontal
                borderBottom
                gap="sm"
                paddingLeft="lg"
                paddingRight="md"
                background="level1"
                alignItems="center"
                height="x8"
                color="gray1"
                overflow="hidden"
                shrink={false}
            >
                <Icon type="tag" size="square_md" color="gray2" background="level2" />

                <Text color="default">{channel.label}</Text>

                <Stack grow />
                <Stack horizontal gap="lg" padding="none">
                    <Link to="info?channel">
                        <Icon type="info" size="square_sm" color="default" />
                    </Link>

                    <motion.div animate={{ rotate: dropDownOpen ? -180 : 0 }}>
                        <Icon
                            type="arrowDown"
                            size="square_sm"
                            color="default"
                            onClick={toggleDropDown}
                        />
                    </motion.div>
                </Stack>
            </Stack>

            <AnimatePresence>
                {dropDownOpen && (
                    <Box grow absoluteFill height="100svh" overflow="hidden" zIndex="ui" top="x8">
                        <MotionStack
                            initial={{ y: '-100%' }}
                            exit={{ y: '-100%' }}
                            animate={{ y: 0 }}
                            transition={{ ease: 'easeOut', duration: 0.3 }}
                            background="level1"
                            width="100%"
                            height="100svh"
                            onClick={toggleDropDown}
                        >
                            <StackLayoutDropdown />
                        </MotionStack>
                    </Box>
                )}
            </AnimatePresence>
        </Stack>
    )
}

const DesktopChannelHeader = (props: Props) => {
    const { channel, spaceId } = props

    const topic = useRoom(channel?.id)?.topic

    return (
        <Stack
            horizontal
            borderBottom
            gap
            paddingX="lg"
            background="level1"
            height="x8"
            alignItems="center"
            color="gray1"
            overflow="hidden"
            shrink={false}
        >
            <Link to="info?channel">
                <Stack
                    horizontal
                    border
                    paddingX
                    gap="sm"
                    paddingY="sm"
                    background="level2"
                    alignItems="center"
                    rounded="sm"
                >
                    <Icon type="tag" size="square_sm" color="gray2" />
                    <Paragraph fontWeight="strong" color="default">
                        {channel.label}
                    </Paragraph>
                </Stack>
            </Link>
            {topic && <Paragraph color="gray2">{topic}</Paragraph>}
            <Stack grow />
            <ChannelUsersPill channelId={channel.id} spaceId={spaceId} />
        </Stack>
    )
}

const MotionStack = motion(Stack)
