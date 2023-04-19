import React, { useCallback, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Permission, RoomIdentifier, SpaceData, useSpaceMembers } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { PATHS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Box, Icon, IconName, Paragraph, Stack, TooltipRenderer } from '@ui'
import { useHasPermission } from 'hooks/useHasPermission'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { shortAddress } from 'ui/utils/utils'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
import { FadeIn } from '@components/Transitions'
import { OpenInEtherscan } from '@components/Tooltips/OpenInEtherscan'
import * as styles from './SpaceSideBar.css'

export const SpaceSideBarHeader = (props: {
    headerRef: React.RefObject<HTMLElement>
    space: SpaceData
    opaqueHeaderBar: boolean
    scrollOffset: number
    onSettings: (spaceId: RoomIdentifier) => void
}) => {
    const { onSettings, opaqueHeaderBar, space } = props
    const currentChannelId = useChannelIdFromPathname()
    const { chainName } = useEnvironment()
    const { pathname } = useLocation()

    const { members } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id.networkId)

    const membersCount = members.length

    const navigate = useNavigate()

    const onMembersClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/members`)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `https://${chainName}.etherscan.io/address/${spaceInfo?.address}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

    const onTokenClick = useEvent(() => {
        const currentSpacePathWithoutInfo = matchPath(
            `${PATHS.SPACES}/:spaceSlug/:current`,
            pathname,
        )

        let path

        if (currentChannelId) {
            path = `/${PATHS.SPACES}/${space.id.slug}/channels/${currentChannelId}/info`
        } else if (currentSpacePathWithoutInfo) {
            path = `/${PATHS.SPACES}/${space.id.slug}/${currentSpacePathWithoutInfo?.params.current}/info`
        }

        if (path) {
            navigate(path)
        }
    })

    const hasName = !!space.name
    const hasMembers = membersCount > 0
    const hasAddress = !!spaceInfo?.address

    const size = useSizeContext()
    const isSmall = size.lessThan(200)

    const [isHeaderHovering, setIsHeaderHovering] = useState(false)
    const onHeaderOver = useCallback(() => {
        setIsHeaderHovering(true)
    }, [])
    const onHeaderLeave = useCallback(() => {
        setIsHeaderHovering(false)
    }, [])

    return (
        <>
            <Stack
                horizontal
                height="x8"
                zIndex="ui"
                pointerEvents={opaqueHeaderBar ? 'auto' : 'none'}
                className={styles.spaceHeader}
                justifyContent="spaceBetween"
                onPointerEnter={onHeaderOver}
                onPointerLeave={onHeaderLeave}
            >
                <Box centerContent width="x8" pointerEvents="auto">
                    <SettingsGear
                        spaceId={space.id}
                        spaceName={space.name}
                        onSettings={onSettings}
                    />
                </Box>
                <Box centerContent width="x8" pointerEvents="auto">
                    <AnimatePresence>
                        {isHeaderHovering && (
                            <FadeIn fast>
                                <CopySpaceLink
                                    spaceId={space.id}
                                    background="none"
                                    color={{ hover: 'default', default: 'gray2' }}
                                />
                            </FadeIn>
                        )}
                    </AnimatePresence>
                </Box>
            </Stack>
            <Stack
                centerContent
                data-common="hey"
                paddingTop="md"
                position="relative"
                width="100%"
                className={styles.spaceIconContainer}
                insetBottom="sm" // cheating since sibling is sticky and needs more top space
                onPointerEnter={onHeaderOver}
                onPointerLeave={onHeaderLeave}
                onClick={onTokenClick}
            >
                <Box height="x2" />
                {space ? (
                    <InteractiveSpaceIcon
                        key={space.id.networkId}
                        size="sm"
                        spaceId={space.id.networkId}
                        address={spaceInfo?.address}
                        spaceName={space.name}
                    />
                ) : (
                    <Box background="level1" rounded="full" width="x15" aspectRatio="1/1" />
                )}
            </Stack>

            <Stack
                width="100%"
                position="sticky"
                top="none"
                zIndex="above"
                height="x8"
                ref={props.headerRef}
            >
                <Stack
                    position="absolute"
                    bottom="none"
                    background="level1"
                    boxShadow="medium"
                    borderBottom={opaqueHeaderBar ? 'default' : 'none'}
                    height="x20"
                    width="100%"
                    pointerEvents="none"
                    style={{ opacity: 1 - props.scrollOffset }}
                />
                <Stack horizontal height="x8">
                    <Box width="x7" shrink={false} />
                    <Box grow position="relative">
                        <Box absoluteFill justifyContent="center">
                            {hasName && (
                                <Paragraph
                                    strong
                                    truncate
                                    size={isSmall ? 'md' : 'lg'}
                                    color="gray1"
                                    textAlign="center"
                                >
                                    {space.name}
                                </Paragraph>
                            )}
                        </Box>
                    </Box>
                    <Box width="x7" shrink={false} />
                </Stack>
            </Stack>

            {(hasMembers || hasAddress) && (
                <>
                    <Stack paddingX="md" gap="sm" insetX="xs">
                        {hasMembers && (
                            <SidebarPill
                                icon="people"
                                label="Members"
                                labelRight={membersCount}
                                onClick={onMembersClick}
                            />
                        )}
                        {hasAddress && (
                            <TooltipRenderer
                                keepOpenOnTriggerRefClick
                                trigger="hover"
                                distance="xxs"
                                placement="vertical-top"
                                render={<OpenInEtherscan />}
                            >
                                {({ triggerProps }) => (
                                    <Box {...triggerProps} padding="xs" rounded="sm">
                                        <SidebarPill
                                            icon="document"
                                            label="Address"
                                            labelRight={
                                                isSmall
                                                    ? `${spaceInfo?.address.slice(
                                                          0,
                                                          4,
                                                      )}..${spaceInfo?.address.slice(-2)}`
                                                    : shortAddress(spaceInfo?.address)
                                            }
                                            onClick={onAddressClick}
                                        />
                                    </Box>
                                )}
                            </TooltipRenderer>
                        )}
                    </Stack>
                </>
            )}
        </>
    )
}

const SidebarPill = (props: {
    icon: IconName
    label: string
    labelRight: string | number
    onClick?: () => void
}) => {
    return (
        <Stack
            horizontal
            transition
            border
            gap="sm"
            rounded="lg"
            paddingX="md"
            height="height_lg"
            alignItems="center"
            cursor="pointer"
            background={{
                default: 'level2',
                hover: 'level3',
            }}
            color="gray2"
            position="relative"
            onClick={props.onClick}
        >
            <Icon type={props.icon} size="square_md" padding="xxs" />
            <AnimatePresence mode="sync">
                <Paragraph size="sm">{props.label}</Paragraph>
            </AnimatePresence>
            <Stack horizontal grow alignItems="center" justifyContent="end">
                <Paragraph size="sm" color="default" textAlign="right">
                    {props.labelRight}
                </Paragraph>
            </Stack>
        </Stack>
    )
}

const SettingsGear = (props: {
    spaceId: RoomIdentifier
    onSettings: (spaceId: RoomIdentifier) => void
    spaceName: string
}) => {
    const { spaceId, onSettings, spaceName } = props
    const { data: canEditSettings } = useHasPermission(Permission.ModifySpaceSettings)

    const onSettingClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            onSettings?.(spaceId)
        },
        [onSettings, spaceId],
    )

    return (
        <CardOpener
            tabIndex={0}
            trigger="click"
            placement="horizontal"
            render={
                <SpaceSettingsCard
                    spaceId={spaceId}
                    spaceName={spaceName}
                    canEditSettings={Boolean(canEditSettings)}
                />
            }
            layoutId="settings"
        >
            {({ triggerProps }) => (
                <Box
                    padding="xs"
                    color={{ hover: 'default', default: 'gray2' }}
                    onClick={onSettingClick}
                    {...triggerProps}
                >
                    <Icon type="settings" size="square_sm" />
                </Box>
            )}
        </CardOpener>
    )
}
