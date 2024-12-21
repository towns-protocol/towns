import React, { useCallback } from 'react'
import { useConnectivity, useRiverPoints } from 'use-towns-client'
import clsx from 'clsx'
import { Box, Paragraph } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { BeaverHead } from './BeaverHead/BeaverHead'

export const PointsButton = () => {
    const { openPanel, closePanel, isPanelOpen } = usePanelActions()
    const { loggedInWalletAddress: wallet } = useConnectivity()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: wallet,
    })
    const { data, isLoading } = useRiverPoints(abstractAccountAddress as `0x${string}`)
    const onClick = useCallback(() => {
        isPanelOpen(CHANNEL_INFO_PARAMS.RIVER_POINTS)
            ? closePanel()
            : openPanel(CHANNEL_INFO_PARAMS.RIVER_POINTS)
    }, [isPanelOpen, closePanel, openPanel])

    if (!data) {
        return null
    }

    return (
        <Box
            centerContent
            horizontal
            hoverable
            className={clsx({
                [shimmerClass]: isLoading,
            })}
            background="level2"
            borderRadius="sm"
            height="x4"
            paddingX="sm"
            gap="xs"
            cursor="pointer"
            onClick={onClick}
        >
            <BeaverHead isActive={!!data?.isActive} />
            <Paragraph color="gray1" size="sm">
                {data?.riverPoints}
            </Paragraph>
        </Box>
    )
}
