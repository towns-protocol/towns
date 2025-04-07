import React, { forwardRef, useCallback, useMemo, useRef } from 'react'
import { useMyProfile, useSpaceData, useSpaceDataStore, useTownsContext } from 'use-towns-client'
import { matchRoutes, useLocation, useNavigate, useResolvedPath } from 'react-router'
import { Box, Dot, Icon, IconButton, Stack, Text, Tooltip } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { PATHS } from 'routes'
import { useShowHasUnreadBadgeForCurrentSpace } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { useInstallPWAPrompt } from 'hooks/useInstallPWAPrompt'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar } from '@components/Avatar/Avatar'
import { MintAnimation } from '@components/MintAnimation/MintAnimation'
import { useStore } from 'store/store'
import { PanelStack } from '@components/Panel/PanelContext'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { TouchScrollToTopScrollId } from './TouchScrollToTopScrollId'

export const TouchTabBar = () => {
    const space = useSpaceData()
    const userId = useMyProfile()?.userId
    const { showHasUnreadBadgeForCurrentSpace } = useShowHasUnreadBadgeForCurrentSpace()
    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark
    })
    const { spaces } = useTownsContext()
    const spaceId = space?.id || spaceIdBookmark || spaces[0]?.id
    const cachedSpace = useSpaceDataStore((s) => s.spaceDataMap?.[spaceId ?? ''])
    const spaceName = space?.name || cachedSpace?.name || spaces[0]?.name

    const { dmUnreadChannelIds } = useTownsContext()
    const recentlyMintedSpaceToken = useStore((s) => s.recentlyMintedSpaceToken)

    const targetRef = useRef<HTMLElement>(null)
    const hasUnreadDMs = dmUnreadChannelIds.size > 0

    const { shouldDisplayPWAPrompt, closePWAPrompt } = useInstallPWAPrompt()

    const { createLink } = useCreateLink()

    const messageLink = useMemo(() => {
        return createLink({ route: 'messages' })
    }, [createLink])

    return (
        <Box borderTop background="level2" paddingBottom="safeAreaInsetBottom">
            {recentlyMintedSpaceToken && (
                <MintAnimation targetRef={targetRef} info={recentlyMintedSpaceToken} />
            )}
            <Stack horizontal width="100%" background="level2" paddingY="sm" alignContent="end">
                {spaceId ? (
                    <TabBarItem
                        title="Home"
                        icon={(highlighted: boolean) => (
                            <Box>
                                <SpaceIcon
                                    letterFontSize="sm"
                                    border={highlighted ? 'iconHighlighted' : 'iconIdle'}
                                    inset="xxs"
                                    width="toolbar_icon"
                                    height="toolbar_icon"
                                    spaceId={spaceId ?? ''}
                                    firstLetterOfSpaceName={spaceName?.[0] ?? ''}
                                    overrideBorderRadius="sm"
                                    variant={ImageVariants.thumbnail50}
                                    fadeIn={false}
                                />

                                {showHasUnreadBadgeForCurrentSpace && <Dot position="topRight" />}
                            </Box>
                        )}
                        to={`/${PATHS.SPACES}/${spaceId}`}
                        scrollToTopId={TouchScrollToTopScrollId.HomeTabScrollId}
                        highlightPattern={`${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/*`}
                    />
                ) : (
                    <TabBarItem
                        title="Create"
                        icon={(highlighted: boolean) => (
                            <Box>
                                <Icon type="plus" size="toolbar_icon" padding="xxs" />
                            </Box>
                        )}
                        to={`/${PATHS.SPACES}/new`}
                        scrollToTopId={TouchScrollToTopScrollId.HomeTabScrollId}
                        highlightPattern={`${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/*`}
                    />
                )}

                <TabBarItem
                    disabled={!spaceId}
                    title="DMs"
                    icon={() => (
                        <Box>
                            <Icon type="inbox" size="toolbar_icon" padding="xxs" />
                            {hasUnreadDMs && <Dot position="topRight" />}
                        </Box>
                    )}
                    to={
                        space
                            ? `${messageLink}?stackId=${PanelStack.DIRECT_MESSAGES}`
                            : `${PATHS.SPACES}/${spaceId}/${PATHS.MESSAGES}?stackId=${PanelStack.DIRECT_MESSAGES}`
                    }
                    scrollToTopId={TouchScrollToTopScrollId.SearchTabScrollId}
                    onPressTwice={() => {
                        document.getElementById(TouchScrollToTopScrollId.SearchTabInputId)?.focus()
                    }}
                />

                <TabBarItem
                    title="Explore"
                    icon={() => <Icon type="explore" size="toolbar_icon" padding="xxs" />}
                    to={
                        spaceId
                            ? `/${PATHS.SPACES}/${spaceId}/${PATHS.EXPLORE}`
                            : `/${PATHS.EXPLORE}`
                    }
                    scrollToTopId={TouchScrollToTopScrollId.ExploreTabScrollId}
                    highlightPattern="/"
                />

                <TabBarItem
                    title="You"
                    icon={(highlighted) => (
                        <Box rounded="full" border={highlighted ? 'iconHighlighted' : 'iconIdle'}>
                            <Avatar size="toolbar_icon" userId={userId} />
                        </Box>
                    )}
                    scrollToTopId={TouchScrollToTopScrollId.ProfileTabScrollId}
                    to={spaceId ? `/${PATHS.SPACES}/${spaceId}/${PATHS.PROFILE}/me` : `/me`}
                    ref={targetRef}
                />
            </Stack>
            {shouldDisplayPWAPrompt && <PWATooltip onClose={closePWAPrompt} />}
        </Box>
    )
}

type TabBarItemProps = {
    title: string
    to: string
    highlightPattern?: string
    scrollToTopId: TouchScrollToTopScrollId
    icon: (highlighted: boolean) => React.ReactNode
    onPressTwice?: () => void
    disabled?: boolean
}

const TabBarItem = forwardRef<HTMLElement, TabBarItemProps>((props, ref) => {
    const { title, icon, to, scrollToTopId, onPressTwice } = props
    const { closePanel } = usePanelActions()

    const location = useLocation()

    const resolved = useResolvedPath(to)
    const navigate = useNavigate()

    const isHighlighted = useMemo(() => {
        // if "to" matches location.pathname exactly, it's highlighted
        if (decodeURIComponent(location.pathname) === decodeURIComponent(resolved.pathname)) {
            return true
        }
        return props.highlightPattern
            ? // mainly to exclude 'home' "/" from matching all other tabs
              !!matchRoutes([{ path: props.highlightPattern }], location.pathname)?.length
            : // otherwise just check if location.pathname starts with "to"
              decodeURIComponent(location.pathname).startsWith(
                  decodeURIComponent(resolved.pathname),
              )
    }, [location.pathname, props.highlightPattern, resolved.pathname])

    const onClick = useCallback(() => {
        if (location.pathname === to) {
            if (onPressTwice) {
                closePanel()
                onPressTwice()
            }
            const element = document.getElementById(scrollToTopId)
            element?.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        navigate(to)
    }, [location.pathname, to, navigate, onPressTwice, scrollToTopId, closePanel])

    return (
        <Stack
            flexGrow="x1"
            alignItems="center"
            color={isHighlighted ? 'default' : 'gray2'}
            gap="xs"
            style={{ opacity: props.disabled ? 0.5 : undefined }}
            onClick={!props.disabled ? onClick : undefined}
        >
            <Box centerContent height="height_md" width="height_md" position="relative" ref={ref}>
                {icon(isHighlighted && !props.disabled)}
            </Box>
            <Text fontSize="xs" fontWeight="strong">
                {title}
            </Text>
        </Stack>
    )
})

const PWATooltip = (props: { onClose: () => void }) => {
    const { onClose } = props
    return (
        <Box
            width="100%"
            tooltip={
                <Tooltip background="level3" style={{ translate: '0px 10px' }} pointerEvents="all">
                    <Stack horizontal centerContent>
                        <Text fontWeight="normal" color="default" textAlign="left" fontSize="sm">
                            Enable notifications on <strong>mobile</strong>: <br /> Tap{' '}
                            <Icon
                                type="share"
                                size="square_sm"
                                display="inline-block"
                                style={{ verticalAlign: 'middle' }}
                            />{' '}
                            and then <strong>Add to Home Screen</strong>
                        </Text>
                        <Box grow />
                        <IconButton icon="close" size="square_sm" onClick={onClose} />
                    </Stack>
                </Tooltip>
            }
            tooltipOptions={{ active: true }}
            position="fixed"
            right="none"
            left="none"
            bottom="sm"
        />
    )
}
