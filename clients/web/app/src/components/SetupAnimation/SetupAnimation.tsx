import React, { useMemo } from 'react'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'
import { Box, Stack } from '@ui'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { JoinStep, usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDummyNodes } from './hooks/useDummyNodes'
import { RotatingText } from './components/RotatingText'
import { SetupChecklist } from './SetupChecklist'

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
    const someNodeUrl = dummyNodes[1].nodeUrl

    const { joinStep } = usePublicPageLoginFlow()

    const nodeUrl = useMemo(() => {
        if (mode === AppProgressState.Joining) {
            if (joinStep > JoinStep.JoinedTown) {
                return someNodeUrl
            } else {
                return 'none'
            }
        } else {
            return someNodeUrl
        }
    }, [joinStep, mode, someNodeUrl])

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
        () => [
            'Locating a node...',
            'Downloading message streams...',
            'Syncing streams across nodes...',
        ],
        [],
    )

    return (
        <Stack gap centerContent>
            <NodeAnimationContext.Provider value={config}>
                <NodeAnimationLoader skipPlaceholder animateIntro maxWidth="250" />
            </NodeAnimationContext.Provider>
            {mode === AppProgressState.InitializingWorkspace ? (
                <RotatingText texts={rotateText} />
            ) : (
                <JoiningChecklist />
            )}
        </Stack>
    )
}

const JoiningChecklist = () => {
    // the following steps are slightly misaligned with the actual steps
    // actual: 1.mint, 2.join default channel 3. done
    // "connecting" and "initializing workspace" are happening in parallel
    // the following steps are more relevant to the user:
    const steps = useMemo(
        () => ['Minting town membership', 'Connecting to a node', 'Initializing workspace'],
        [],
    )
    const { joinStep } = usePublicPageLoginFlow()

    const step = useMemo(() => {
        switch (joinStep) {
            case JoinStep.None:
                return 2
            case JoinStep.JoinedTown:
                return 0
            case JoinStep.JoinedDefaultChannel:
                return 1
            case JoinStep.Done:
                return 2
        }
    }, [joinStep])
    return (
        <Box width="300">
            <SetupChecklist steps={steps} step={step} />
        </Box>
    )
}
