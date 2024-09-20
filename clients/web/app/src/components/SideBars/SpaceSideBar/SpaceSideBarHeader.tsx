import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    SpaceData,
    useContractSpaceInfo,
    useMyMembership,
    useSpaceMembers,
} from 'use-towns-client'
import { Link } from 'react-router-dom'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { PATHS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Box, Icon, IconButton, Paragraph, Stack } from '@ui'
import { getInviteUrl } from 'ui/utils/utils'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { useCreateLink } from 'hooks/useCreateLink'
import { baseScanUrl } from '@components/Web3/utils'
import { useDevice } from 'hooks/useDevice'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { SECOND_MS } from 'data/constants'
import { Analytics } from 'hooks/useAnalytics'
import * as styles from './SpaceSideBar.css'

export const SpaceSideBarHeader = (props: {
    headerRef: React.RefObject<HTMLElement>
    space: SpaceData
    opaqueHeaderBar: boolean
}) => {
    const { opaqueHeaderBar, space } = props
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id

    const { memberIds } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id)
    const myMembership = useMyMembership(space.id)

    const membersCount = memberIds.length

    const navigate = useNavigate()

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

    const size = useSizeContext()
    const isSmall = size.lessThan(200)
    const { isReduceMotion } = useDevice()

    return (
        <>
            <Stack
                horizontal
                height="x6"
                zIndex="uiAbove"
                pointerEvents="none"
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
                    <IconButton
                        icon="etherscan"
                        tooltip="Open Contract details"
                        onClick={onAddressClick}
                    />
                </Box>
            </Stack>

            {/* interactive header */}

            <Stack
                centerContent
                data-common="hey"
                paddingTop="lg"
                paddingBottom="sm"
                position="relative"
                width="100%"
                className={styles.spaceIconContainer}
                onClick={onTokenClick}
            >
                {space ? (
                    <InteractiveSpaceIcon
                        key={!isReduceMotion ? space.id : undefined}
                        size="sideBar"
                        spaceId={space.id}
                        address={spaceInfo?.address}
                        spaceName={space.name}
                    />
                ) : (
                    <Box background="level1" rounded="md" width="x17" aspectRatio="1/1" />
                )}
            </Stack>

            {/* sticky bar */}

            <Stack
                width="100%"
                position="sticky"
                top="sm"
                zIndex="ui"
                height="x4"
                justifyContent="center"
                ref={props.headerRef}
            >
                <Box
                    style={
                        opaqueHeaderBar
                            ? { opacity: 1, transition: `opacity 220ms` }
                            : { opacity: 0 }
                    }
                    position="absolute"
                    bottom="-sm"
                    background="level2"
                    boxShadow="medium"
                    height="x6"
                    width="100%"
                    pointerEvents="none"
                    roundedTop="sm"
                />

                <Box justifyContent="center" height="x3" cursor="pointer" onClick={onTokenClick}>
                    <Stack horizontal height="x4">
                        <Box width="x7" shrink={false} />
                        <Box grow position="relative">
                            <Box absoluteFill justifyContent="center">
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
                </Box>
            </Stack>

            <Stack paddingX gap="md" insetX="xs" paddingY="xs">
                <Paragraph textAlign="center" color="cta2" size="sm">
                    <Link
                        to={`/${PATHS.SPACES}/${space.id}/members`}
                        data-testid="all-town-members-list-button"
                    >
                        {hasMembers
                            ? `${membersCount} member${membersCount > 1 ? 's' : ''}`
                            : 'fetching members...'}
                    </Link>
                </Paragraph>
                <ShareTownLinkButton spaceId={space.id} />
            </Stack>
        </>
    )
}

const ShareTownLinkButton = (props: { spaceId: string }) => {
    const { spaceId } = props
    const [, copy] = useCopyToClipboard()
    const inviteUrl = getInviteUrl({ spaceId })
    const [copyDisplay, setCopyDisplay] = useState(false)
    const text = !copyDisplay ? `Share Town Link` : 'Town link copied'

    const onCopyClick = useCallback(() => {
        copy(inviteUrl)
        setCopyDisplay(true)
        Analytics.getInstance().track('clicked on share town link')
    }, [copy, inviteUrl])

    useEffect(() => {
        if (copyDisplay) {
            const timeout = setTimeout(() => {
                setCopyDisplay(false)
            }, 3 * SECOND_MS)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [copyDisplay])

    return (
        <Box
            horizontal
            hoverable
            centerContent
            gap="sm"
            height="x5"
            borderRadius="lg"
            background="level2"
            transition="default"
            cursor="pointer"
            data-testid="share-town-link-button"
            onClick={onCopyClick}
        >
            {!copyDisplay ? (
                <Icon type="link" size="square_md" padding="xxs" />
            ) : (
                <Icon type="check" size="square_md" padding="xxs" />
            )}
            <Paragraph size="sm">{text}</Paragraph>
        </Box>
    )
}
