import React, { useCallback } from 'react'
import { useMyProfile, useSpaceMentions } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Box, Heading, Icon, IconButton, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'
import { useCreateLink } from 'hooks/useCreateLink'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceMentions = () => {
    const userId = useMyProfile()?.userId
    const mentions = useSpaceMentions()
    const { isTouch } = useDevice()
    const { loadingChannels, hasJoinedChannels } = useHasJoinedChannels()

    const renderContent = () => {
        if (loadingChannels) {
            return (
                <>
                    <ButtonSpinner /> Loading...
                </>
            )
        }
        if (hasJoinedChannels) {
            return (
                <>
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="at" size="square_sm" />
                    </Box>
                    <Heading level={3}>No mentions yet</Heading>
                    <Paragraph textAlign="center" color="gray2">
                        {`Whenever someone "@" mentions you, it'll show up here.`}
                    </Paragraph>
                </>
            )
        }

        return <NoJoinedChannelsFallback />
    }

    const navigate = useNavigate()

    const { createLink } = useCreateLink()
    const onTouchClose = useCallback(() => {
        const link = createLink({ route: 'townHome' })
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate])

    return (
        <CentralPanelLayout>
            {isTouch && (
                <TouchNavBar
                    contentLeft={
                        <IconButton
                            icon="back"
                            size="square_md"
                            color="default"
                            onClick={onTouchClose}
                        />
                    }
                >
                    Mentions
                </TouchNavBar>
            )}
            <Stack
                scroll
                height="100%"
                id={TouchScrollToTopScrollId.MentionsTabScrollId}
                position="relative"
            >
                {mentions.length ? (
                    <Stack minHeight="forceScroll">
                        <Stack
                            gap={{ touch: 'none', default: 'md' }}
                            paddingX={{ touch: 'none', default: 'lg' }}
                            paddingY={{ touch: 'md', default: 'lg' }}
                        >
                            {mentions.map((m) => {
                                return (
                                    m.type === 'mention' && (
                                        <IsolatedMessageItem
                                            hoverable
                                            border
                                            result={m}
                                            key={m.event.eventId}
                                            userId={userId}
                                            padding="md"
                                            borderRadius="md"
                                            boxShadow="card"
                                        />
                                    )
                                )
                            })}
                        </Stack>
                    </Stack>
                ) : (
                    <Stack centerContent grow absoluteFill scroll>
                        <Stack centerContent gap="lg" minHeight="100svh" padding="lg">
                            {renderContent()}
                        </Stack>
                    </Stack>
                )}
            </Stack>
        </CentralPanelLayout>
    )
}
