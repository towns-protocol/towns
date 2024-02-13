import React, { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useOutlet, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useZionContext } from 'use-zion-client'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const DirectMessages = () => {
    const { isTouch } = useDevice()
    const outlet = useOutlet()

    const { spaceSlug } = useParams()
    useTouchRedirect({ isTouch })
    const [search] = useSearchParams()

    if (isTouch && !spaceSlug) {
        return <WelcomeLayout debugText="TOUCH MESSAGE REDIRECT" />
    }

    if (isTouch) {
        if (search.get('ref') === 'home') {
            return <Outlet />
        }
        return (
            <Box absoluteFill background="level1">
                <DirectMessagesPanel />
                <ZLayerBox>
                    <Outlet />
                </ZLayerBox>
            </Box>
        )
    } else {
        return (
            outlet ?? (
                <Stack centerContent grow scroll absoluteFill>
                    <Stack centerContent gap="lg" width="250" minHeight="100svh">
                        <Box padding="md" color="gray2" background="level2" rounded="sm">
                            <Icon type="message" size="square_sm" />
                        </Box>
                        <Heading level={3}>Welcome to your DMs</Heading>
                        <Paragraph textAlign="center" color="gray2">
                            Direct messages are end to end encrypted conversations between you and
                            other users
                        </Paragraph>
                    </Stack>
                </Stack>
            )
        )
    }
}

/**
 * on a touch device landing on  a desktop message route (i.e. outside of /t/:townId)
 * will redirect to the currently bookmarked space and fallback to the first available space
 */
const useTouchRedirect = ({ isTouch }: { isTouch: boolean }) => {
    const navigate = useNavigate()

    const params = useParams()
    const spaceId = params.spaceSlug
    const channelId = params.channelSlug
    const replyId = params.messageId

    const isDesktopRoute = !spaceId
    const hasRedirectedRef = useRef(false)
    const { spaces } = useZionContext()
    const storeState = useStore.getState()
    const spaceStreamId = storeState.spaceIdBookmark ?? spaces[0]?.id

    const needsRedirect = isTouch && isDesktopRoute
    const canRedirect = !hasRedirectedRef.current && !!spaceStreamId

    useEffect(() => {
        if (needsRedirect && canRedirect) {
            hasRedirectedRef.current = true
            const messageSegment = channelId ? `${channelId}/` : ''
            const threadSegment = replyId ? `${PATHS.REPLIES}/${replyId}` : ''
            navigate(
                `/${PATHS.SPACES}/${spaceStreamId}/${PATHS.MESSAGES}/${messageSegment}${threadSegment}`,
            )
        }
    }, [canRedirect, channelId, spaceStreamId, navigate, needsRedirect, replyId])
}
