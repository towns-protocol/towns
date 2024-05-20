import React, { useMemo } from 'react'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useDummyNodes } from './hooks/useDummyNodes'

export const CreateSpaceAnimation = () => {
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

    const steps = useMemo(
        () => [
            'Creating town onchain',
            'Decentralizing messages across nodes',
            'Creating first channel onchain',
        ],
        [],
    )

    return (
        <Stack gap centerContent padding>
            <Stack gap padding centerContent elevate background="level2" rounded="md" width="400">
                <NodeAnimationContext.Provider value={config}>
                    <NodeAnimationLoader skipPlaceholder showSparklingDots maxWidth="250" />
                </NodeAnimationContext.Provider>
                <Steps steps={steps} step={0} />
                <Disclaimer />
            </Stack>
        </Stack>
    )
}

const Steps = (props: { steps: string[]; step: number }) => {
    return (
        <Stack gap="sm" width="100%" padding="sm">
            {props.steps.map((step, index) => (
                <Step
                    key={step}
                    step={step}
                    state={index === props.step ? 'progress' : index < props.step ? 'done' : 'todo'}
                />
            ))}
        </Stack>
    )
}

const Step = (props: { step: string; state: 'progress' | 'done' | 'todo' }) => {
    return (
        <Stack horizontal gap padding="sm">
            <Box centerContent width="x4">
                {props.state === 'done' ? (
                    <Checkmark />
                ) : props.state === 'progress' ? (
                    <ButtonSpinner />
                ) : (
                    '•'
                )}
            </Box>
            <Box justifyContent="center">
                <Paragraph
                    color={props.state === 'todo' ? 'gray2' : 'default'}
                    fontWeight={props.state === 'done' ? 'strong' : 'normal'}
                >
                    {props.step}
                </Paragraph>
            </Box>
        </Stack>
    )
}

const Checkmark = () => (
    <Box centerContent width="x3" aspectRatio="1/1" borderRadius="full" background="positive">
        <Icon type="check" size="square_xs" />
    </Box>
)

const Disclaimer = () => (
    <Box horizontal padding gap background="level2" rounded="xs">
        <Box centerContent>
            <Icon type="alert" size="square_sm" color="gray2" />
        </Box>
        <Box grow>
            <Paragraph color="gray2" size="sm">
                This might take a bit longer than expected. Please stay on this page so tou
                don&apos;t lose your progress
            </Paragraph>
        </Box>
    </Box>
)
