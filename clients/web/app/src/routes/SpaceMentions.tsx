import React from 'react'
import { useMyProfile, useSpaceMentions } from 'use-towns-client'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'

export const SpaceMentions = () => {
    const userId = useMyProfile()?.userId
    const mentions = useSpaceMentions()
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
        <>
            <Stack
                scroll
                height="100%"
                id={TouchScrollToTopScrollId.MentionsTabScrollId}
                position="relative"
            >
                {mentions.length ? (
                    <Stack minHeight="forceScroll">
                        <Stack
                            padding={{ touch: 'sm', default: 'md' }}
                            gap={{ touch: 'sm', default: 'md' }}
                        >
                            {mentions.map((m) => {
                                return (
                                    m.type === 'mention' && (
                                        <IsolatedMessageItem
                                            hoverable
                                            result={m}
                                            key={m.event.eventId}
                                            userId={userId}
                                            padding="md"
                                            borderRadius="md"
                                            background="readability"
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
        </>
    )
}
