import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Channel,
    useSpaceId,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnread,
    useSpaceUnreadThreadMentions,
} from 'use-zion-client'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Button, Icon, IconName, MotionStack, Stack, Text } from '@ui'
import { TouchLayoutDropdownMenu } from '@components/TouchLayoutNavigationBar/TouchLayoutDropdownMenu'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { transitions } from 'ui/transitions/transitions'
import { useMuteSettings } from 'api/lib/notificationSettings'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'

type ValueType = Channel | 'threads' | 'mentions'
type Props = {
    value: ValueType
}

export const TouchLayoutNavigationBar = (props: Props) => {
    const { value } = props
    const { displayNotificationBanner, requestPushPermission, denyPushPermission } =
        usePushNotifications()
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const spaceId = useSpaceId()

    const { channelIsMuted, spaceIsMuted } = useMuteSettings({
        spaceId: spaceId?.networkId,
        channelId: useChannelIdFromPathname(),
    })
    const isMuted = channelIsMuted || spaceIsMuted

    const hasSpaceUnread = useSpaceUnread()
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const unreadThreadMentions = useSpaceUnreadThreadMentions()
    const hasUnreadCount = unreadThreadsCount + unreadThreadMentions > 0 || hasSpaceUnread
    const navigate = useNavigate()

    const toggleDropDown = useCallback(() => {
        setDropDownOpen(!dropDownOpen)
    }, [dropDownOpen])

    const labelText = ((value: ValueType) => {
        if (value == 'threads') {
            return 'Threads'
        }
        if (value == 'mentions') {
            return 'Mentions'
        }

        if (value as Channel) {
            return value.label
        }
        return ''
    })(value)

    const shouldDisplayChannelInfoButton = ((value: ValueType) => {
        if (value == 'threads' || value == 'mentions') {
            return false
        }
        return true
    })(value)

    const iconName = ((value: ValueType): IconName => {
        if (value == 'threads') {
            return 'threads'
        }
        if (value == 'mentions') {
            return 'at'
        }

        return 'tag'
    })(value)

    const infoIconClicked = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            navigate('info?channel')
            event.stopPropagation()
        },
        [navigate],
    )

    return (
        <Stack background="level1" zIndex="uiAbove">
            <Stack
                horizontal
                borderBottom
                gap="md"
                paddingX="md"
                background="level1"
                alignItems="center"
                height="x8"
                color="gray1"
                overflow="hidden"
                shrink={false}
                onClick={toggleDropDown}
            >
                <Icon
                    size="square_lg"
                    padding="line"
                    type={iconName}
                    color="gray2"
                    background="level2"
                />

                <Text color="default">{labelText}</Text>
                {isMuted && <Icon size="square_xs" type="muteActive" color="gray2" />}

                <Stack grow />
                <Stack horizontal gap="lg" padding="none" alignItems="center">
                    {shouldDisplayChannelInfoButton && (
                        <Icon
                            type="info"
                            size="square_sm"
                            color="default"
                            onClick={infoIconClicked}
                        />
                    )}
                    <motion.div animate={{ rotate: dropDownOpen ? -180 : 0 }}>
                        <Icon
                            type={hasUnreadCount ? 'arrowDownActive' : 'arrowDown'}
                            size="square_sm"
                            color="default"
                        />
                    </motion.div>
                </Stack>
            </Stack>

            <AnimatePresence>
                {displayNotificationBanner && (
                    <MotionStack
                        centerContent
                        padding="lg"
                        gap="lg"
                        background="level3"
                        initial={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ ease: 'easeOut', duration: 0.3 }}
                    >
                        <Text fontWeight="strong" color="default" textAlign="center">
                            Turn on notification badges for threads and mentions?
                        </Text>
                        <Stack horizontal gap>
                            <Button tone="cta1" size="button_sm" onClick={requestPushPermission}>
                                Enable
                            </Button>
                            <Button tone="level2" size="button_sm" onClick={denyPushPermission}>
                                No thanks
                            </Button>
                        </Stack>
                    </MotionStack>
                )}

                {dropDownOpen && (
                    <Box grow absoluteFill overflow="hidden" zIndex="ui" top="x8">
                        <MotionStack
                            initial={{ y: '-100%', opacity: 0 }}
                            exit={{ y: '-100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={transitions.panel}
                            background="level1"
                            width="100%"
                            height="100%"
                        >
                            {/* this box makes sure the UI below doesn't bleed through while spring animating */}
                            <Box
                                background="level1"
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: -100,
                                    left: 0,
                                    height: 100,
                                }}
                            />
                            <TouchLayoutDropdownMenu
                                unreadThreadMentions={unreadThreadMentions}
                                unreadThreadsCount={unreadThreadsCount}
                            />
                        </MotionStack>
                    </Box>
                )}
            </AnimatePresence>
        </Stack>
    )
}
