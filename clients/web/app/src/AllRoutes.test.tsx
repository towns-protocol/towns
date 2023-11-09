import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import { TestApp } from 'test/testUtils'
import { AllRoutes } from 'AllRoutes'
const Wrapper = () => {
    return (
        <TestApp>
            <AllRoutes />
        </TestApp>
    )
}

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
})

describe('<AllRoutes />', () => {
    test('renders register form when user needs onboarding', async () => {
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('register-form')).toBeInTheDocument()
        })
    })
})

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof import('use-zion-client')

    return {
        ...actual,
        useZionContext: () => ({
            ...actual.useZionContext(),
            matrixOnboardingState: {
                kind: 'update-profile',
                bNeedsDisplayName: true,
                bNeedsAvatar: true,
            },
        }),
    }
})

vi.mock('hooks/useAuth', async () => {
    const actual = (await vi.importActual('hooks/useAuth')) as typeof import('hooks/useAuth')

    return {
        ...actual,
        useAuth: () => ({
            register: () => Promise.resolve(),
            loggedInWalletAddress: '0x1234',
            isConnected: true,
            isAuthenticatedAndConnected: true,
        }),
    }
})

describe('<AllRoutes />', () => {
    test('renders register form when user needs onboarding', async () => {
        vi.spyOn(Lib, 'useZionContext').mockImplementationOnce(() => {
            return {
                ...Lib.useZionContext(),
                matrixOnboardingState: {
                    kind: 'update-profile',
                    bNeedsDisplayName: true,
                    bNeedsAvatar: true,
                },
            }
        })
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('register-form')).toBeInTheDocument()
        })
    })
})
