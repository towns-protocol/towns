import React, { useCallback } from 'react'
import {
    useContractSpaceInfo,
    useMuteSettings,
    useMyMembership,
    useSpaceData,
    useSpaceMembers,
} from 'use-towns-client'
import { Membership } from '@towns-protocol/sdk'
import { Box, Dot, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useShowHasUnreadBadgeForOtherSpaces } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { NodeStatusButton } from '@components/NodeConnectionStatusPanel/ConnectionStatusButton'
import { PointsButton } from '@components/TopBar/PointsButton'

type Props = {
    onDisplayMainPanel: () => void
}

export const TouchLayoutHeader = (props: Props) => {
    const space = useSpaceData()
    const { memberIds } = useSpaceMembers()
    const currentSpaceId = space?.id
    const { data: spaceInfo } = useContractSpaceInfo(currentSpaceId)

    const hasUnread = useShowHasUnreadBadgeForOtherSpaces(currentSpaceId)

    const { spaceIsMuted } = useMuteSettings({
        spaceId: currentSpaceId,
    })

    const { openPanel } = usePanelActions()
    const onTokenClick = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.TOWN_INFO)
    }, [openPanel])

    const myMembership = useMyMembership(space?.id)

    return (
        <Box position="relative" paddingX="sm" paddingTop="sm" paddingBottom="md">
            <Stack
                horizontal
                justifyContent="center"
                alignItems="center"
                paddingX="sm"
                width="100%"
                gap="sm"
            >
                <Box position="relative">
                    <IconButton
                        icon="bottomAlignedEllipsis"
                        size="square_md"
                        color="default"
                        padding="xs"
                        background="level2"
                        onClick={() => props.onDisplayMainPanel()}
                    />
                    {hasUnread && <Dot position="topRight" />}
                </Box>

                {space && myMembership === Membership.Join ? (
                    <Stack
                        position="relative"
                        overflowX="hidden"
                        gap="sm"
                        padding="sm"
                        width="100%"
                        onClick={onTokenClick}
                    >
                        <Stack horizontal gap="sm" alignItems="center">
                            <Text truncate fontWeight="strong" color="default" size="lg">
                                {space.name}
                            </Text>

                            {spaceIsMuted && (
                                <Icon type="muteActive" color="default" size="square_xs" />
                            )}
                        </Stack>
                        <Paragraph truncate color="gray2" size="sm">
                            {`${memberIds.length} member${memberIds.length > 1 ? `s` : ``}`}
                            {spaceInfo?.shortDescription ? ` · ${spaceInfo?.shortDescription}` : ``}
                        </Paragraph>
                    </Stack>
                ) : (
                    <Box grow />
                )}
                <NodeStatusButton />
                <BugReportButton />
                {space && (
                    <IconButton
                        icon="info"
                        color="gray1"
                        size="square_sm"
                        padding="xs"
                        background="none"
                        onClick={onTokenClick}
                    />
                )}
                <PointsButton />
            </Stack>
        </Box>
    )
}
