import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { Box, RadioSelect } from '@ui'
import {
    TransitionContainer,
    useAppOverlayContent,
} from '@components/AppProgressOverlay/AppProgressOverlay'

export const PageProgressOverlay = () => {
    const [mode, setMode] = useState<AppProgressState>(AppProgressState.LoadingAssets)
    const content = useAppOverlayContent(mode, true)
    return (
        <Box absoluteFill>
            <Box absoluteFill centerContent background="level1">
                <AnimatePresence mode="sync">
                    {mode !== AppProgressState.None ? (
                        <TransitionContainer key={content.key}>
                            {content.element}
                        </TransitionContainer>
                    ) : (
                        <></>
                    )}
                </AnimatePresence>
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
                            AppProgressState.None,
                        ]}
                        onChange={(v) => setMode(v.target.value as AppProgressState)}
                    />
                </Box>
            </Box>
        </Box>
    )
}
