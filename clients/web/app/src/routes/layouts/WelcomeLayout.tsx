import React from 'react'
import { TransitionLogo } from '@components/Logo/Logo'
import { Box, MotionBox, Paragraph, Stack, Text } from '@ui'

export const WelcomeLayout = (props: {
    children?: React.ReactNode
    debugText?: string
    showProgress?: number
}) => (
    <Stack centerContent scroll height="100vh" background="level1" width="100vw">
        <Stack padding justifyContent="end" alignItems="center">
            <TransitionLogo />

            {props.showProgress !== undefined && (
                <WelcomeProgressBar progress={props.showProgress} />
            )}
        </Stack>
        <Stack padding>
            <Stack justifyContent="start" minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </Stack>

        {props.debugText && (
            <Box paddingTop="safeAreaInsetTop" position="topLeft" key={props.debugText}>
                <Box paddingTop="lg" paddingX="xs">
                    <Paragraph color="gray2" size="xs" textTransform="uppercase">
                        {props.debugText}
                    </Paragraph>
                </Box>
            </Box>
        )}
    </Stack>
)

const WelcomeProgressBar = (props: { progress: number }) => {
    const { progress } = props
    return (
        <Stack gap centerContent paddingTop="lg">
            <Text color="default" size="md" fontWeight="medium">
                Setting up local workspace
            </Text>
            <Box border="textDefault" height="x1" rounded="xs" overflow="hidden" width="200">
                <MotionBox
                    width="100%"
                    height="100%"
                    background="inverted"
                    initial={{
                        scaleX: 0,
                        originX: 0,
                    }}
                    animate={{
                        scaleX: progress,
                    }}
                    transition={{ duration: 0.1 }}
                />
            </Box>
        </Stack>
    )
}
