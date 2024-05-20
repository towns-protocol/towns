import React, { useMemo } from 'react'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'
import { Stack } from '@ui'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { useDummyNodes } from './hooks/useDummyNodes'
import { RotatingText } from './components/RotatingText'

type Props = {
    mode:
        | AppProgressState.Joining
        | AppProgressState.InitializingWorkspace
        | AppProgressState.CreatingSpace
}

export const SetupAnimation = (props: Props) => {
    const { mode } = props
    const darkMode = useStore((state) => state.getTheme() === 'dark')

    const dummyNodes = useDummyNodes()
    const nodeUrl = dummyNodes[1].nodeUrl
    const backgroundColorString = useMemo(
        () => (darkMode ? 'hsla(255, 9%, 16%, 1)' : Figma.LightMode.Level1),
        [darkMode],
    )

    const config = useMemo(
        () => ({
            ...DEFAULT_CONFIG,
            nodeUrl,
            darkMode,
            backgroundColorString,
            nodeConnections: dummyNodes,
        }),
        [backgroundColorString, darkMode, dummyNodes, nodeUrl],
    )

    const rotateText = useMemo(
        () =>
            mode === AppProgressState.Joining
                ? [
                      'Minting town membership…',
                      'Connecting to a node…',
                      'Downloading message streams…',
                  ]
                : AppProgressState.InitializingWorkspace
                ? [
                      'Locating a node...',
                      'Downloading message streams...',
                      'Syncing streams across nodes...',
                  ]
                : [],
        [mode],
    )

    return (
        <Stack gap centerContent>
            <NodeAnimationContext.Provider value={config}>
                <NodeAnimationLoader skipPlaceholder animateIntro maxWidth="250" />
            </NodeAnimationContext.Provider>
            <RotatingText texts={rotateText} />
        </Stack>
    )
}
