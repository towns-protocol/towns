import React from 'react'
import { useMyProfile, useSpaceMentions } from 'use-zion-client'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { MessageResultItem } from '@components/MessageResultItem/MessageResultItem'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'
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

    return (
        <CentralPanelLayout>
            {isTouch && <TouchNavBar>Mentions</TouchNavBar>}
            <Stack scroll height="100%" id={TouchScrollToTopScrollId.MentionsTabScrollId}>
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
                                        <MessageResultItem
                                            result={m}
                                            key={m.event.eventId}
                                            userId={userId}
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
