import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
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

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof import('use-towns-client')

    return {
        ...actual,
        useTownsContext: () => ({
            ...actual.useTownsContext(),
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
            isAuthenticated: true,
        }),
    }
})

describe.skip('<AllRoutes />', () => {
    test('renders register form when user needs onboarding', async () => {
        vi.spyOn(Lib, 'useTownsContext').mockImplementationOnce(() => {
            return {
                ...Lib.useTownsContext(),
            }
        })
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('register-form')).toBeInTheDocument()
        })
    })
})
