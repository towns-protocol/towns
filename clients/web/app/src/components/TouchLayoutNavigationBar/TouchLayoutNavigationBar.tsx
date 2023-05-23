import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Channel,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
} from 'use-zion-client'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Icon, IconName, Stack, Text } from '@ui'
import { TouchLayoutDropdownMenu } from '@components/TouchLayoutNavigationBar/TouchLayoutDropdownMenu'

type ValueType = Channel | 'threads' | 'mentions'
type Props = {
    value: ValueType
}

export const TouchLayoutNavigationBar = (props: Props) => {
    const { value } = props

    const [dropDownOpen, setDropDownOpen] = useState(false)
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const unreadThreadMentions = useSpaceUnreadThreadMentions()
    const hasUnreadCount = unreadThreadsCount + unreadThreadMentions > 0

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

    return (
        <Stack height="auto" background="level1" zIndex="uiAbove">
            <Stack
                horizontal
                borderBottom
                gap="sm"
                paddingLeft="md"
                paddingRight="md"
                background="level1"
                alignItems="center"
                height="x8"
                color="gray1"
                overflow="hidden"
                shrink={false}
            >
                <Icon
                    size="square_lg"
                    padding="line"
                    type={iconName}
                    color="gray2"
                    background="level2"
                />

                <Text color="default">{labelText}</Text>

                <Stack grow />
                <Stack horizontal gap="lg" padding="none" alignItems="center">
                    {shouldDisplayChannelInfoButton && (
                        <Link to="info?channel">
                            <Icon type="info" size="square_sm" color="default" />
                        </Link>
                    )}
                    <motion.div animate={{ rotate: dropDownOpen ? -180 : 0 }}>
                        <Icon
                            type={hasUnreadCount ? 'arrowDownActive' : 'arrowDown'}
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
                        >
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

const MotionStack = motion(Stack)
