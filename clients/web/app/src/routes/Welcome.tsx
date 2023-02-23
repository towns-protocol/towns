import React, { Suspense } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { Stack, Text } from '@ui'
import { PATHS } from 'routes'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const Welcome = () => (
    <WelcomeLayout>
        <Text strong>
            <b>Connect your wallet to continue</b>
        </Text>
        <Suspense>
            <motion.div
                initial={{
                    height: 0,
                    opacity: 0,
                }}
                animate={{ opacity: 1, height: 'auto' }}
            >
                <LoginComponent />
            </motion.div>
        </Suspense>
    </WelcomeLayout>
)

// shared structure w/ LoadingScreen so logo position is consistent
export const WelcomeLayout = (props: { children?: React.ReactNode }) => (
    <Stack centerContent grow height="100%" gap="lg">
        <NavLink to={`/${PATHS.REGISTER}`}>
            <TransitionLogo />
        </NavLink>
        <FadeIn>
            <Stack centerContent minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </FadeIn>
    </Stack>
)
