import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Membership, SpaceData, useMyMembership, useSpaceMembers } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { PATHS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Box, Icon, IconName, Paragraph, Stack } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
import { FadeIn } from '@components/Transitions'
import { OpenInEtherscan } from '@components/Tooltips/OpenInEtherscan'
import { useCreateLink } from 'hooks/useCreateLink'
import { baseScanUrl } from '@components/Web3/utils'
import * as styles from './SpaceSideBar.css'

export const SpaceSideBarHeader = (props: {
    headerRef: React.RefObject<HTMLElement>
    space: SpaceData
    opaqueHeaderBar: boolean
    scrollOffset: number
}) => {
    const { opaqueHeaderBar, space } = props
    const { chainId } = useEnvironment()

    const { memberIds } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id.networkId)
    const myMembership = useMyMembership(space.id)

    const membersCount = memberIds.length

    const navigate = useNavigate()

    const onMembersClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/members`)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `${baseScanUrl(chainId)}/address/${spaceInfo?.address}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

    const { createLink } = useCreateLink()

    const onTokenClick = useEvent(() => {
        const path = createLink({
            spaceId: space.id.networkId,
            panel: 'townInfo',
        })

        if (path) {
            navigate(path)
        }
    })

    const hasName = space && myMembership === Membership.Join && !!space.name
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
                    <Box
                        cursor="pointer"
                        padding="xs"
                        color={{ hover: 'default', default: 'gray2' }}
                        tooltip="Town Settings"
                        tooltipOptions={{ immediate: true }}
                        onClick={onTokenClick}
                    >
                        <Icon type="settings" size="square_sm" />
                    </Box>
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
                borderBottom={opaqueHeaderBar ? 'accent' : 'none'}
            >
                <Stack
                    position="absolute"
                    bottom="none"
                    background="level1"
                    boxShadow="medium"
                    height="x8"
                    width="100%"
                    pointerEvents="none"
                    style={{ opacity: 1 - props.scrollOffset }}
                />
                <Stack horizontal height="x8">
                    <Box width="x7" shrink={false} />
                    <Box grow position="relative">
                        <Box
                            absoluteFill
                            justifyContent="center"
                            cursor="pointer"
                            onClick={onTokenClick}
                        >
                            {hasName && (
                                <Paragraph
                                    strong
                                    truncate
                                    size={isSmall ? 'md' : 'lg'}
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

            <>
                <Stack paddingX="md" gap="sm" insetX="xs">
                    <SidebarPill
                        icon="people"
                        label="Members"
                        labelRight={hasMembers ? membersCount : 'fetching...'}
                        onClick={onMembersClick}
                    />
                    <Box
                        tooltip={<OpenInEtherscan />}
                        tooltipOptions={{ placement: 'horizontal', align: 'end' }}
                    >
                        <SidebarPill
                            icon="document"
                            label="Address"
                            labelRight={
                                !hasAddress
                                    ? `fetching...`
                                    : isSmall
                                    ? `${spaceInfo?.address.slice(
                                          0,
                                          4,
                                      )}..${spaceInfo?.address.slice(-2)}`
                                    : shortAddress(spaceInfo?.address)
                            }
                            onClick={onAddressClick}
                        />
                    </Box>
                </Stack>
            </>
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
            hoverable
            background="level2"
            gap="sm"
            rounded="lg"
            paddingX="md"
            height="height_lg"
            alignItems="center"
            cursor="pointer"
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
