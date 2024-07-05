import React, { useMemo } from 'react'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'

import { vars } from 'ui/styles/vars.css'
import { useDummyNodes } from './hooks/useDummyNodes'
import { SetupChecklist } from './SetupChecklist'

export const CreateSpaceAnimation = (props: { steps: string[]; step: number }) => {
    const { steps, step } = props
    const darkMode = useStore((state) => state.getTheme() === 'dark')
    const dummyNodes = useDummyNodes({ grayScale: true })
    const nodeUrl = dummyNodes[1].nodeUrl
    const backgroundColorString = useMemo(
        () => (darkMode ? Figma.DarkMode.Level2 : Figma.LightMode.Level2),
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

    return (
        <Stack gap centerContent padding>
            <Stack
                gap
                padding
                centerContent
                elevate
                background="level2"
                rounded="md"
                width="400"
                style={{ maxWidth: `calc(100% - 2 * ${vars.dims.baseline.x2})` }}
            >
                <NodeAnimationContext.Provider value={config}>
                    <NodeAnimationLoader skipPlaceholder showSparklingDots maxWidth="250" />
                </NodeAnimationContext.Provider>
                <SetupChecklist steps={steps} step={step} />
                <Disclaimer />
            </Stack>
        </Stack>
    )
}

const Disclaimer = () => (
    <Box horizontal padding gap background="level2" rounded="xs">
        <Box centerContent>
            <Icon type="alert" size="square_sm" color="gray2" />
        </Box>
        <Box grow justifyContent="center">
            <Paragraph color="gray2" size="sm">
                Give it a moment. Building a town takes a village.
            </Paragraph>
        </Box>
    </Box>
)
