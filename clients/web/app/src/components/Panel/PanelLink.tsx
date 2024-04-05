import React, { ReactNode, useCallback } from 'react'
import { Box, BoxProps } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS_VALUES } from 'routes'

export const PanelLink = (
    props: BoxProps & { panel: CHANNEL_INFO_PARAMS_VALUES; children: ReactNode },
) => {
    const { panel, ...boxProps } = props
    const { openPanel } = usePanelActions()

    const onClick = useCallback(() => {
        openPanel(panel)
    }, [openPanel, panel])

    return <Box cursor="pointer" onClick={onClick} {...boxProps} />
}
