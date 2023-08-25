import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TransitionLogo } from '@components/Logo/Logo'
import { MotionBox, Stack } from '@ui'

export const WelcomeLayout = (props: { children?: React.ReactNode }) => (
    <Stack centerContent scroll height="100vh" background="level1">
        <Stack padding justifyContent="end">
            <TransitionLogo />
        </Stack>
        <Stack padding>
            <Stack justifyContent="start" minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </Stack>
    </Stack>
)

export const PersistAndFadeWelcomeLogo = () => {
    const [isInit, setIsInit] = React.useState(false)
    useEffect(() => {
        if (!isInit) {
            setTimeout(() => {
                setIsInit(true)
            }, 250)
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
