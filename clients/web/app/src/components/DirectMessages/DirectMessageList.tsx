import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router'
import {
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useZionContext,
} from 'use-zion-client'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useShortcut } from 'hooks/useShortcut'
import { DirectMessageListItem } from './DirectMessageListItem'

export const DirectMessageList = () => {
    const { channels: dmChannelIds } = useFilteredDirectMessages()

    const routeMatch = useMatch('messages/:channelId/*')

    const channelId = routeMatch?.params?.channelId

    const { dmUnreadChannelIds } = useZionContext()

    const { selectMessage } = useSelectMessage(dmChannelIds, channelId)

    const searchRef = useRef<HTMLInputElement>(null)

    useShortcut('DisplaySearchModal', () => {
        searchRef.current?.focus()
    })

    return (
        <Stack scroll padding="sm">
            <Stack minHeight="100svh" paddingBottom="safeAreaInsetBottom" gap="sm">
                {dmChannelIds.length > 0 ? (
                    dmChannelIds.map((channel) => {
                        return (
                            <DMChannelContextUserLookupProvider
                                fallbackToParentContext
                                key={channel.id}
                                channelId={channel.id}
                            >
                                <DirectMessageListItem
                                    key={channel.id}
                                    channel={channel}
                                    selected={channelId === channel.id}
                                    unread={dmUnreadChannelIds.has(channel.id)}
                                    onSelect={selectMessage}
                                />
                            </DMChannelContextUserLookupProvider>
                        )
                    })
                ) : (
                    <Box centerContent absoluteFill padding="md" pointerEvents="none">
                        <Paragraph as="span" color="gray2" textAlign="center">
                            Click the compose button above{' '}
                            <Box
                                display="inline-block"
                                style={{ verticalAlign: 'middle' }}
                                paddingBottom="xxs"
                            >
                                <Icon type="compose" size="square_sm" />
                            </Box>
                            <br />
                            to write your first message
                        </Paragraph>
                    </Box>
                )}
            </Stack>
        </Stack>
    )
}

const useFilteredDirectMessages = () => {
    const { dmChannels: _dmChannels } = useZionContext()
    const channels = useMemo(() => _dmChannels.filter((c) => !c.left), [_dmChannels])
    return { channels }
}

const useSelectMessage = (dmChannels: DMChannelIdentifier[], messageId?: string) => {
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const hasInitRef = useRef(false)
    const { createLink } = useCreateLink()

    // auto select first message if needed
    useEffect(() => {
        if (!hasInitRef.current && !isTouch && !messageId && dmChannels.length > 0) {
            const link = createLink({ messageId: dmChannels[0].id })
            if (link) {
                navigate(link)
            }
        }
        hasInitRef.current = true
    }, [messageId, dmChannels, navigate, isTouch, createLink])

    const selectMessage = useCallback(
        (id: string) => {
            const link = createLink({ messageId: id })
            if (link) {
                navigate(link)
            }
        },
        [createLink, navigate],
    )

    return { selectMessage }
}
