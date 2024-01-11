import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TransitionLogo } from '@components/Logo/Logo'
import { Box, MotionBox, Paragraph, Stack } from '@ui'

export const WelcomeLayout = (props: { children?: React.ReactNode; debugText?: string }) => (
    <Stack centerContent scroll height="100vh" background="level1" width="100vw">
        <Stack padding justifyContent="end">
            <TransitionLogo />
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

export const PersistAndFadeWelcomeLogo = () => {
    const [isInit, setIsInit] = React.useState(false)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined
        if (!isInit) {
            timeoutId = setTimeout(() => {
                setIsInit(true)
            }, 250)
        }
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [isInit])
    return (
        <AnimatePresence>
            {!isInit && (
                <MotionBox absoluteFill zIndex="tooltips" pointerEvents="none">
                    <MotionBox
                        absoluteFill
                        background="level1"
                        initial={{
                            opacity: 1,
                        }}
                        exit={{
                            opacity: 0,
                            transition: {
                                ease: 'easeIn',
                                delay: 0.6,
                                duration: 0.2,
                            },
                        }}
                    />
                    <MotionBox absoluteFill>
                        <WelcomeLayout />
                    </MotionBox>
                </MotionBox>
            )}
        </AnimatePresence>
    )
}
