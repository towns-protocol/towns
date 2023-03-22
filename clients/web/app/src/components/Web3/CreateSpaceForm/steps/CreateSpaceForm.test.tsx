import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { act } from 'react-dom/test-utils'
import * as zionClient from 'use-zion-client'
import * as router from 'react-router'
import { PATHS } from 'routes'
import { TestApp, mockUseMatrixCredentials } from 'test/testUtils'
import { SpacesNew } from 'routes/SpacesNew'
import { UseMockCreateSpaceReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import * as useRequireTransactionNetwork from 'hooks/useRequireTransactionNetwork'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { EVERYONE, TOKEN_HOLDERS } from '../constants'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as Record<string, unknown>),
    }
})

vi.mock('use-zion-client', async () => {
    return {
        ...((await vi.importActual('use-zion-client')) as Record<string, unknown>),
        useZionClient: () => ({
            spaceDapp: {
                getSpaceInfo: () => {
                    return {
                        address: '0x111',
                        networkId: 'some-room-id',
                        name: 'test space',
                        owner: '0x222',
                        disabled: false,
                    }
                },
            },
        }),
        useOnTransactionEmitted: (callback: (args: zionClient.EmittedTransaction) => void) => {
            callback({
                isSuccess: true,
                hash: '0x777',
                data: {
                    spaceId: {
                        networkId: 'some-room-id',
                        slug: 'some-room-id',
                        protocol: zionClient.SpaceProtocol.Matrix,
                    },
                },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                type: 'createSpace',
            })
        },
        // useAuth deps
        useMatrixCredentials: () => mockUseMatrixCredentials(),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <SpacesNew />
        </TestApp>
    )
}

const { createTransactionSpy: createSpaceTransactionWithRoleSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('createSpaceTransactionWithRole')

const useMockedCreateSpaceTransaction = (
    ...args: (typeof zionClient.useCreateSpaceTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateSpaceReturn

describe('<CreateSpaceForm />', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test('renders the form', async () => {
        render(<Wrapper />)
        const title = screen.getByText('Create a Town')
        expect(title).toBeInTheDocument()
    }, 10000)

    test('Step 1: does not contain prev button', async () => {
        render(<Wrapper />)
        expect(screen.queryByRole('button', { name: 'Prev' })).not.toBeInTheDocument()
    }, 10000)

    test('Step 1: cannot proceed forward if no option is selected', async () => {
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')
        fireEvent.click(nextButton)

        await screen.findByText(/please choose who can join/i)
    }, 10000)

    test('Step 1: cannot proceed forward if "Token holders" is selected but no tokens have been selected', async () => {
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')
        const tokenRadio = screen.getByText('Token holders')
        fireEvent.click(tokenRadio)
        fireEvent.click(nextButton)

        await screen.findByText(/select at least one token/i)
    }, 10000)

    test('Retains state if moving to next step and then going back', async () => {
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        let everyoneRadio = screen.getByDisplayValue(EVERYONE)

        fireEvent.click(everyoneRadio)
        fireEvent.click(nextButton)

        await waitFor(() => expect(everyoneRadio).not.toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: 'Prev' }))

        everyoneRadio = await screen.findByDisplayValue(EVERYONE)
        expect(everyoneRadio).toBeChecked()
    }, 10000)

    // Evan 2.2.23 Doesn't fail in local, still fails in CI
    test.skip('Step 2: if tokens are selected, can delete all but 1 token', async () => {
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        const tokenRadio = screen.getByDisplayValue(TOKEN_HOLDERS)
        fireEvent.click(tokenRadio)
        await waitFor(() => {
            expect(screen.getByDisplayValue(TOKEN_HOLDERS)).toBeChecked()
        })

        let checkboxes = await screen.findAllByTestId('checkbox-tokens')

        fireEvent.click(checkboxes[0])
        fireEvent.click(checkboxes[1])
        fireEvent.click(checkboxes[2])

        // going to step 2
        fireEvent.click(nextButton)

        const tokenContainer = await screen.findByTestId('step-2-avatars')

        let tokens = await within(tokenContainer).findAllByRole('button')
        expect(tokens).toHaveLength(3)

        tokens.forEach((t) => {
            fireEvent.click(t)
        })

        await waitFor(async () => {
            tokens = await within(tokenContainer).findAllByRole('button')
            expect(tokens).toHaveLength(1)
        })

        // now go back to step 1 and make sure token is still selected
        fireEvent.click(screen.getByRole('button', { name: 'Prev' }))

        await waitFor(() => {
            expect(screen.getByDisplayValue(TOKEN_HOLDERS)).toBeChecked()
        })

        expect(useCreateSpaceFormStore.getState().step1.tokens.length).toBe(1)
        checkboxes = await screen.findAllByTestId('checkbox-tokens')
        const match = checkboxes.find(
            (t) =>
                (t as HTMLInputElement).value ===
                useCreateSpaceFormStore.getState().step1.tokens[0],
        )

        expect(match).toBeChecked()
    }, 10000)

    test('Step 2: cannot proceed if no space name', async () => {
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceName: null,
                },
            })
        })
        render(<Wrapper />)

        const nextButton = screen.getByTestId('create-space-next-button')
        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')

        fireEvent.click(nextButton)

        await waitFor(async () => {
            return screen.findByText(/Town name is required./i)
        })
    }, 10000)

    test('Step 3: successfully creates space and navigates to it', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        const navigateSpy = vi.fn()
        vi.spyOn(router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceName: 'sample space',
                },
            })
        })

        // render
        const { unmount } = render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await waitFor(async () => {
            await screen.findByText('Creating Space')
        })

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    `/${PATHS.SPACES}/some-room-id/getting-started`,
                )
            },
            { timeout: 10000 },
        )
        unmount()

        await waitFor(() => {
            return expect(useCreateSpaceFormStore.getState().step1.membershipType).toBeNull()
        })
    }, 10000)

    test('Step 3: handles space creation error and shows error message', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(() =>
            useMockedCreateSpaceTransaction('failedWithTransactionContext'),
        )

        const navigateSpy = vi.fn()
        vi.spyOn(router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await screen.findByText(/There was an error with the transaction/i)

        expect(navigateSpy).not.toHaveBeenCalled()
    }, 10000)

    test('Step 3: cannot perform mint action if on the wrong network', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: false,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        expect(nextButton).toBeDisabled()
        expect(screen.getByText(/switch to/gi)).toBeInTheDocument()
    }, 10000)

    test('If space membership is for everyone, token permissions should be [] and everyone permissions should be [Read,Write]', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        vi.spyOn(router, 'useNavigate').mockReturnValue(() => vi.fn())
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        // form state when user has selected everyone (no tokens) //
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await waitFor(async () => {
            await screen.findByText('Creating Space')
        })

        await waitFor(async () => {
            return expect(createSpaceTransactionWithRoleSpy).toHaveBeenCalledWith(
                {
                    name: 'sample space',
                    visibility: 'public',
                },
                'Member',
                [], // tokens
                [], // token permissions
                [zionClient.Permission.Read, zionClient.Permission.Write], // everyone permissions
            )
        })
    }, 10000)

    // Evan 2.2.23 Doesn't fail in local, still fails in CI
    test.skip('If space membership is for token holders, token permissions should be [Read,Write] and everyone permissions should be []', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        vi.spyOn(router, 'useNavigate').mockReturnValue(() => vi.fn())
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        // form state when user has selected tokens
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: TOKEN_HOLDERS,
                    tokens: ['0x123'],
                },
                step2: {
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-form-name-field')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(screen.getByTestId('create-space-next-button'))

        await waitFor(async () => {
            await screen.findByText('Creating Space')
        })

        await waitFor(
            async () => {
                return expect(createSpaceTransactionWithRoleSpy).toHaveBeenCalledWith(
                    {
                        name: 'sample space',
                        visibility: 'public',
                    },
                    'Member',
                    ['0x123'], // tokens
                    [zionClient.Permission.Read, zionClient.Permission.Write], // token permissions
                    [], // everyone permissions
                )
            },
            {
                timeout: 10000,
            },
        )
    }, 10000)
})
