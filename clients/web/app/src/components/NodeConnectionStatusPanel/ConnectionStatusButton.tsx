import React, { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { Box, Icon } from '@ui'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { SECOND_MS } from 'data/constants'
import * as styles from './ConnectionStatusButton.css'
import { useConnectionStatus } from './hooks/useConnectionStatus'

export const NodeStatusButton = () => {
    const { closePanel, openPanel, isPanelOpen } = usePanelActions()
    const isActive = isPanelOpen(CHANNEL_INFO_PARAMS.NODE_STATUS)

    const onClick = useCallback(() => {
        if (isPanelOpen(CHANNEL_INFO_PARAMS.NODE_STATUS)) {
            closePanel()
        } else {
            openPanel(CHANNEL_INFO_PARAMS.NODE_STATUS)
        }
    }, [closePanel, isPanelOpen, openPanel])

    const { connectionStatus } = useConnectionStatus()
    const [isFlashing, setIsFlashing] = useState(() => connectionStatus === 'syncing')

    useEffect(() => {
        if (connectionStatus === 'syncing') {
            setIsFlashing(true)
        } else {
            const timeout = setTimeout(() => {
                setIsFlashing(false)
            }, SECOND_MS * 3)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [connectionStatus])

    const statusColor = connectionStatus === 'disconnected' ? '#FFAA29' : '#21E078'

    return (
        <>
            <Box
                hoverable
                centerContent
                cursor="pointer"
                tooltip={isActive ? undefined : 'Node Connection'}
                tooltipOptions={{ placement: 'horizontal' }}
                padding="line"
                background="level2"
                alignSelf="center"
                rounded="sm"
                width="x4"
                height="x4"
                onClick={onClick}
            >
                <Icon
                    className={clsx([styles.satelite, { [styles.flashing]: isFlashing }])}
                    style={{ ['--dot-color']: statusColor } as React.CSSProperties}
                    size="square_sm"
                    type={isActive ? 'sateliteFill' : 'satelite'}
                />
            </Box>
        </>
    )
}
