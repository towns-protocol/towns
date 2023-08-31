/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import * as Zion from 'use-zion-client'
import { BrowserRouter } from 'react-router-dom'
import matchers from '@testing-library/jest-dom/matchers'
import * as router from 'react-router'
import { TestApp, mockUseConnectivity } from 'test/testUtils'
import { RegisterForm } from './RegisterForm'

expect.extend(matchers)

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as any),
    }
})

// useAuth deps
vi.mock('use-zion-client', async () => {
    return {
        ...((await vi.importActual('use-zion-client')) as any),
        useConnectivity: () => mockUseConnectivity(),
    }
})

vi.mock('hooks/useAuth', () => {
    return {
        useAuth: () => ({
            register: () => Promise.resolve(),
            loggedInWalletAddress: '0x1234',
            isConnected: true,
        }),
    }
})

const Mock = ({ children }: any) => {
    return <TestApp Router={BrowserRouter}>{children}</TestApp>
}

describe('#RegisterForm', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('for new registrations, renders the form without prepopulating fields', () => {
        render(
            <Mock>
                <RegisterForm isEdit={false} />
            </Mock>,
        )
        const walletField: HTMLInputElement = screen.getByLabelText(/connected wallet/i)
        const displayNameField: HTMLInputElement = screen.getByLabelText(/display name/i)
        const submit: HTMLButtonElement = screen.getByText(/next/i)

        expect(walletField.value).toBe('0x1234')
        expect(displayNameField.value).toBe('')
        //@ts-ignore TODO: extend types for matchers https://markus.oberlehner.net/blog/using-testing-library-jest-dom-with-vitest/
        expect(submit).toBeDisabled('disabled')
    })

    test('for editing existing user, renders the form with prepopulated fields', async () => {
        vi.spyOn(Zion, 'useMyProfile').mockReturnValue({
            userId: 'abcd',
            displayName: 'gandalf',
            avatarUrl: 'gandalf.jpg',
            lastPresenceTs: 0,
            currentlyActive: true,
        })

        render(
            <Mock>
                <RegisterForm isEdit />
            </Mock>,
        )
        const walletField: HTMLInputElement = screen.getByLabelText(/connected wallet/i)
        const displayNameField: HTMLInputElement = screen.getByLabelText(/display name/i)
        const submit: HTMLButtonElement = screen.getByText(/next/i)

        // should be testing the avatars/ RadioSelect but not b/c there are errors from vanilla-extract/framer-motion
        // const avatarRadios = screen.getAllByTestId('avatar-radio')
        // fireEvent.click(avatarRadios[0])

        expect(walletField.value).toBe('0x1234')
        expect(displayNameField.value).toBe('gandalf')
        //@ts-ignore TODO: extend types for matchers https://markus.oberlehner.net/blog/using-testing-library-jest-dom-with-vitest/
        expect(submit).toBeDisabled('disabled')
    })

    test('it should allow to submit once the required fields are populated', async () => {
        // // dunno if this is a vitest or react-router thing, but if you just try to spy
        // // on the method w/out mocking the module (at top of this file), then you get errors
        const spy = vi.fn()
        vi.spyOn(router, 'useNavigate').mockReturnValue(spy)
        render(
            <Mock>
                <RegisterForm isEdit={false} />
            </Mock>,
        )
        const displayNameField: HTMLInputElement = screen.getByLabelText(/display name/i)
        const submit: HTMLButtonElement = screen.getByText(/next/i)
        // userEvent b/c fireEvent doesn't trigger react-hook-form onChange
        await userEvent.type(displayNameField, 'dude')

        expect(displayNameField.value).toBe('dude')
        expect(submit).not.toBeDisabled()

        fireEvent.click(submit)
        await waitFor(async () => await expect(spy).toHaveBeenCalledOnce())
    })

    test('it should navigate to town invite link if came from invite link', async () => {
        vi.stubGlobal('location', {
            pathname: '/t/1234/',
            search: '?invite',
        })
        const spy = vi.fn()
        vi.spyOn(router, 'useNavigate').mockReturnValue(spy)
        render(
            <Mock>
                <RegisterForm isEdit={false} />
            </Mock>,
        )
        const displayNameField: HTMLInputElement = screen.getByLabelText(/display name/i)
        const submit: HTMLButtonElement = screen.getByText(/next/i)
        // userEvent b/c fireEvent doesn't trigger react-hook-form onChange
        await userEvent.type(displayNameField, 'dude')

        expect(displayNameField.value).toBe('dude')
        expect(submit).not.toBeDisabled()

        fireEvent.click(submit)
        await waitFor(
            async () =>
                await expect(spy).toHaveBeenCalledWith(
                    {
                        pathname: '/t/1234/',
                        search: '?invite',
                    },
                    {
                        replace: true,
                    },
                ),
        )
    })

    test.skip('it should upload to CF only when registering and user has not uploaded an image already', () => {
        // TODO
    })
})
