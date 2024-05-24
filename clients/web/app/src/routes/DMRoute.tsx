import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { Outlet, useNavigate, useOutlet, useParams } from 'react-router'
import { useTownsContext } from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { PanelContext, PanelStack } from '@components/Panel/PanelContext'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'

export const DirectMessages = () => {
    const { isTouch } = useDevice()

    const [searchParams] = useSearchParams()
    const outlet = useOutlet()
    const panelContext = useContext(PanelContext)
    const stackId = panelContext?.stackId

    const { spaceSlug } = useParams()
    useTouchRedirect({ isTouch })

    const searchParamsStackId = useMemo(() => searchParams.get('stackId'), [searchParams])

    if (isTouch && !spaceSlug) {
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource="DM route !spaceSlug"
            />
        )
    }

    if (isTouch) {
        if (
            stackId === PanelStack.DIRECT_MESSAGES ||
            searchParamsStackId === PanelStack.DIRECT_MESSAGES
        ) {
            if (panelContext && searchParamsStackId === PanelStack.DIRECT_MESSAGES) {
                panelContext.stackId = PanelStack.DIRECT_MESSAGES
            }
            return (
                <Box absoluteFill background="level1">
                    <DirectMessagesPanel />
                    <Outlet />
                </Box>
            )
        } else {
            return <Outlet />
        }
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
    const { spaces } = useTownsContext()
    const storeState = useStore.getState()
    const spaceStreamId = storeState.spaceIdBookmark || spaces[0]?.id

    const needsRedirect = isTouch && isDesktopRoute
    const canRedirect = !hasRedirectedRef.current && !!spaceStreamId
    const [searchParams] = useSearchParams()

    useEffect(() => {
        console.log('[useTouchRedirect][route]', 'route', {
            storeSpaceIdBookmark: storeState.spaceIdBookmark,
            spaces: spaces.map((s) => s.id),
            needsRedirect,
            canRedirect,
        })
        if (needsRedirect && canRedirect) {
            hasRedirectedRef.current = true
            const messageSegment = channelId ? `${channelId}/` : ''
            const threadSegment = replyId ? `${PATHS.REPLIES}/${replyId}` : ''
            console.log('[useTouchRedirect][route]', 'redirected', {
                path: `/${PATHS.SPACES}/${spaceStreamId}/${PATHS.MESSAGES}/${messageSegment}${threadSegment}`,
                stackId: searchParams.get('stackId') ?? '',
            })
        }
    }, [
        canRedirect,
        channelId,
        needsRedirect,
        replyId,
        searchParams,
        spaceStreamId,
        spaces,
        storeState.spaceIdBookmark,
    ])

    useEffect(() => {
        if (needsRedirect && canRedirect) {
            hasRedirectedRef.current = true
            const messageSegment = channelId ? `${channelId}/` : ''
            const threadSegment = replyId ? `${PATHS.REPLIES}/${replyId}` : ''
            navigate({
                pathname: `/${PATHS.SPACES}/${spaceStreamId}/${PATHS.MESSAGES}/${messageSegment}${threadSegment}`,
                search: searchParams.toString(),
            })
        }
    }, [canRedirect, channelId, spaceStreamId, navigate, needsRedirect, replyId, searchParams])
}
