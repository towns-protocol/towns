import React from 'react'
import { NavLink } from 'react-router-dom'

import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { Stack, Text } from '@ui'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const SiteHome = () => (
    <SiteHomeLayout>
        <Text strong>
            <b>Connect your wallet to continue</b>
        </Text>
        <LoginComponent />
    </SiteHomeLayout>
)

/**
 * Structure shared between home and loading to keep logo position consistent
 */
export const SiteHomeLayout = (props: { children?: React.ReactNode }) => (
    <Stack centerContent grow height="100%" gap="lg">
        <NavLink to="/register">
            <TransitionLogo />
        </NavLink>
        <FadeIn>
            <Stack centerContent minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </FadeIn>
    </Stack>
)

export default SiteHome
