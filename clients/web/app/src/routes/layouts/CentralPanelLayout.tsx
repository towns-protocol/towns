import { Allotment } from 'allotment'
import { useOutlet } from 'react-router'
import React from 'react'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useDevice } from 'hooks/useDevice'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'

export const CentralPanelLayout = (props: { children: React.ReactNode }) => {
    const { children } = props
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])
    const outlet = useOutlet()
    const { isMobile } = useDevice()

    return isMobile ? (
        <>
            <Stack height="100svh" paddingBottom="safeAreaInsetBottom">
                <TouchLayoutHeader />
                <Box grow centerContent position="relative">
                    <Box absoluteFill>{children}</Box>
                </Box>
            </Stack>
            {outlet && outlet}
        </>
    ) : (
        <Stack minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    <Box grow centerContent position="relative" height="100%">
                        <Box absoluteFill>{children}</Box>
                    </Box>
                </Allotment.Pane>
                {outlet && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 840}>
                        {outlet}
                    </Allotment.Pane>
                )}
            </Allotment>
        </Stack>
    )
}
