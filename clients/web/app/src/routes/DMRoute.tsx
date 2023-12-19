import React, { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useOutlet, useParams } from 'react-router'
import { useZionContext } from 'use-zion-client'
import { GlobalContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const DirectMessages = () => {
    const { isTouch } = useDevice()
    const outlet = useOutlet()

    const { spaceSlug } = useParams()
    useTouchRedirect({ isTouch })

    if (isTouch && !spaceSlug) {
        return <WelcomeLayout debugText="TOUCH MESSAGE REDIRECT" />
    }

    return isTouch ? (
        <GlobalContextUserLookupProvider>
            <Box absoluteFill background="level1">
                <DirectMessagesPanel />
                <Outlet />
            </Box>
        </GlobalContextUserLookupProvider>
    ) : (
        outlet ?? (
            <Stack centerContent grow scroll absoluteFill>
                <Stack centerContent gap="lg" width="250" minHeight="100svh">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="message" size="square_sm" />
                    </Box>
                    <Heading level={3}>Welcome to your DMs</Heading>
                    <Paragraph textAlign="center" color="gray2">
                        Direct messages are end to end encrypted conversations between you and other
                        users
                    </Paragraph>
                </Stack>
            </Stack>
        )
    )
}

/**
 * on a touch device landing on  a desktop message route (i.e. outside of /t/:townId)
 * will redirect to the first space
 */
const useTouchRedirect = (params: { isTouch: boolean }) => {
    const { isTouch } = params

    const navigate = useNavigate()
    const spaceId = useParams().spaceId
    const channelId = useParams().channelSlug
    const replyId = useParams().messageId

    const isDesktopRoute = !spaceId
    const hasRedirectedRef = useRef(false)
    const { spaces } = useZionContext()
    const firstSpaceStreamId = spaces[0]?.id.streamId

    const needsRedirect = isTouch && isDesktopRoute
    const canRedirect = !hasRedirectedRef.current && !!firstSpaceStreamId

    useEffect(() => {
        if (needsRedirect && canRedirect) {
            hasRedirectedRef.current = true
            const messageSegment = channelId ? `${channelId}/` : ''
            const threadSegment = replyId ? `${PATHS.REPLIES}/${replyId}` : ''
            navigate(
                `/${PATHS.SPACES}/${firstSpaceStreamId}/${PATHS.MESSAGES}/${messageSegment}${threadSegment}`,
            )
        }
    }, [canRedirect, firstSpaceStreamId, channelId, navigate, needsRedirect, replyId])
}
