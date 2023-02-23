import React from 'react'
import { NavLink } from 'react-router-dom'
import { Stack } from '@ui'
import { TransitionLogo } from '@components/Logo/Logo'
import { PATHS } from 'routes'
import { FadeIn } from '@components/Transitions'

// shared structure w/ WelcomeLayout so logo position is consistent
export const LoadingScreen = () => (
    <Stack absoluteFill centerContent>
        <Stack centerContent grow height="100%" gap="lg">
            <NavLink to={`/${PATHS.REGISTER}`}>
                <TransitionLogo />
            </NavLink>
            <FadeIn>
                <Stack centerContent minHeight="height_xl" gap="lg" />
            </FadeIn>
        </Stack>
    </Stack>
)
