import React from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    SpaceData,
    useContractSpaceInfo,
    useMyMembership,
    useSpaceMembers,
} from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { PATHS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Box, Icon, IconName, Paragraph, Stack } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
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
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id

    const { memberIds } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id)
    const myMembership = useMyMembership(space.id)

    const membersCount = memberIds.length

    const navigate = useNavigate()

    const onMembersClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${space.id}/members`)
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
            spaceId: space.id,
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

    return (
        <>
            <Stack
                horizontal
                height="x6"
                zIndex="uiAbove"
                pointerEvents={opaqueHeaderBar ? 'auto' : 'none'}
                className={styles.spaceHeader}
                justifyContent="spaceBetween"
            >
                <Box centerContent width="x6" pointerEvents="auto">
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
                <Box centerContent width="x6" pointerEvents="auto">
                    <AnimatePresence>
                        <CopySpaceLink
                            spaceId={space.id}
                            background="none"
                            color={{ hover: 'default', default: 'gray2' }}
                        />
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
                onClick={onTokenClick}
            >
                {space ? (
                    <InteractiveSpaceIcon
                        key={space.id}
                        size="sm"
                        spaceId={space.id}
                        address={spaceInfo?.address}
                        spaceName={space.name}
                    />
                ) : (
                    <Box background="level1" rounded="md" width="x17" aspectRatio="1/1" />
                )}
                <Box height="x2" />
            </Stack>

            <Stack
                width="100%"
                position="sticky"
                top="none"
                zIndex="ui"
                height="x6"
                ref={props.headerRef}
            >
                <Box
                    style={{ opacity: opaqueHeaderBar ? 1 : 0 }}
                    position="absolute"
                    bottom="none"
                    background="level2"
                    boxShadow="medium"
                    height="x6"
                    width="100%"
                    pointerEvents="none"
                    roundedTop="sm"
                />
                <Stack horizontal height="x6">
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
            <Box width="x3">
                <Icon type={props.icon} size="square_md" padding="xxs" insetLeft="xxs" />
            </Box>
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
