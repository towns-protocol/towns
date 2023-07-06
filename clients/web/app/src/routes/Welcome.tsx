import React, { Suspense } from 'react'
import { NavLink } from 'react-router-dom'
import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { Stack } from '@ui'
import { PATHS } from 'routes'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const Welcome = () => (
    <WelcomeLayout>
        <>
            <Suspense>
                <FadeIn>
                    <LoginComponent />
                </FadeIn>
            </Suspense>
        </>
    </WelcomeLayout>
)

// shared structure w/ LoadingScreen so logo position is consistent
export const WelcomeLayout = (props: { children?: React.ReactNode }) => (
    <Stack centerContent grow height="100%" gap="lg" background="level1">
        <Stack height="200" justifyContent="end">
            <NavLink to={`/${PATHS.REGISTER}`}>
                <TransitionLogo />
            </NavLink>
        </Stack>
        <Stack height="200">
            <FadeIn>
                <Stack centerContent minHeight="height_xl" gap="lg">
                    {props.children}
                </Stack>
            </FadeIn>
        </Stack>
    </Stack>
)
