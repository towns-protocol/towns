import React from 'react'
import { NavLink } from 'react-router-dom'

import { useServerVersions } from 'use-zion-client'
import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { Stack } from '@ui'
import { PATHS } from 'routes'
import { useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'

export const VersionsPage = () => {
    const { homeserverUrl } = useMatrixHomeServerUrl()

    const { isFetched, isSuccess, isError, serverVersions } = useServerVersions({ homeserverUrl })

    return (
        <VersionsPageLayout>
            <div data-testid="isFetched">{`isFetched: ${JSON.stringify(isFetched)}`}</div>
            <div data-testid="isSuccess">{`isSuccess: ${JSON.stringify(isSuccess)}`}</div>
            <div data-testid="isError">{`isError: ${JSON.stringify(isError)}`}</div>
            <div data-testid="release_version">{`release_version: ${JSON.stringify(
                serverVersions,
            )}`}</div>
        </VersionsPageLayout>
    )
}

/**
 * Structure shared between home and loading to keep logo position consistent
 */
export const VersionsPageLayout = (props: { children?: React.ReactNode }) => (
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

export default VersionsPage
