import React, { useState } from 'react'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { Box, RadioSelect } from '@ui'
import { useAppOverlayContent } from '@components/AppProgressOverlay/AppProgressOverlay'

export const PageProgressOverlay = () => {
    const [mode, setMode] = useState<AppProgressState>(AppProgressState.LoadingAssets)

    return (
        <Box absoluteFill>
            <Box absoluteFill centerContent background="level1">
                {useAppOverlayContent(mode, false).element}
            </Box>
            <Box padding alignItems="start" justifyContent="center" gap="sm" flexGrow="x1">
                <Box padding gap background="level2" rounded="sm" zIndex="above">
                    <RadioSelect
                        name="animationType"
                        defaultValue={mode}
                        options={[
                            AppProgressState.LoadingAssets,
                            AppProgressState.LoggingIn,
                            AppProgressState.Joining,
                            AppProgressState.InitializingWorkspace,
                            AppProgressState.CreatingSpace,
                        ]}
                        onChange={(v) => setMode(v.target.value as AppProgressState)}
                    />
                </Box>
            </Box>
        </Box>
    )
}
