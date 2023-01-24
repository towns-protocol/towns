import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { describe, expect, test, vi } from 'vitest'
import { act } from 'react-dom/test-utils'
import { MemoryRouter } from 'react-router-dom'
import * as zionClient from 'use-zion-client'
import * as router from 'react-router'
import { TestApp } from 'test/testUtils'
import { SpacesNew } from 'routes/SpacesNew'
import { UseMockCreateSpaceReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
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
                getSpaceFactoryEventsContractInfo: () => {
                    return {
                        abi: 'some abi',
                        address: '0x',
                    }
                },
            },
        }),
    }
})

vi.mock('../CreateSpaceListener', () => {
    return {
        CreateSpaceEventListener: () => {
            React.useEffect(() => {
                useCreateSpaceFormStore.getState().setMintedTokenAddress('0x1234')
            }, [])
            return null
        },
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
    ...args: typeof zionClient.useCreateSpaceTransaction['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateSpaceReturn

describe('CreateSpaceStep1', () => {
    test('renders the form', async () => {
        render(<Wrapper />)
        const title = screen.getByText('Create Space')
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

    // I cannot get this to fail locally but it alwas fails on CI
    // TODO: investigate VList
    test.skip('Step 2: if tokens are selected, can delete all but 1 token', async () => {
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        const tokenRadio = screen.getByDisplayValue(TOKEN_HOLDERS)
        fireEvent.click(tokenRadio)
        await waitFor(() => {
            expect(screen.getByDisplayValue(TOKEN_HOLDERS)).toBeChecked()
        })

        const checkboxes = await screen.findAllByRole('checkbox')

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
    }, 10000)

    test('Step 2: cannot proceed if no space name or space icon', async () => {
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceIconUrl: null,
                    spaceName: null,
                },
            })
        })
        render(<Wrapper />)

        const nextButton = screen.getByTestId('create-space-next-button')
        fireEvent.click(nextButton)
        await screen.findByTestId('space-icon')

        fireEvent.click(nextButton)

        await waitFor(() => {
            return screen.findByText(/please choose an icon for your space./i)
        })
        await waitFor(async () => {
            return screen.findByText(/please enter a name for your space./i)
        })
    }, 10000)

    test('Step 3: successfully creates space and navigates to it', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        const navigateSpy = vi.fn()
        vi.spyOn(router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceIconUrl: 'http://whatever.com?jpg',
                    spaceName: 'sample space',
                },
            })
        })

        // render
        const { unmount } = render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-icon')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await waitFor(async () => {
            await screen.findByText('Creating Space')
        })

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith('/spaces/some-room-id/getting-started')
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

        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceIconUrl: 'http://whatever.com?jpg',
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-icon')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await screen.findByText('There was an error with the transaction. Please try again')

        expect(navigateSpy).not.toHaveBeenCalled()
    }, 10000)

    test('If space membership is for everyone, token permissions should be [] and everyone permissions should be [Read,Write]', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        vi.spyOn(router, 'useNavigate').mockReturnValue(() => vi.fn())

        // form state when user has selected everyone (no tokens) //
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: EVERYONE,
                    tokens: [],
                },
                step2: {
                    spaceIconUrl: 'http://whatever.com?jpg',
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-icon')
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

    // always fails in CI, cannot reproduce locally
    // TODO: investigate VList
    test.skip('If space membership is for token holders, token permissions should be [Read,Write] and everyone permissions should be []', async () => {
        vi.spyOn(zionClient, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        vi.spyOn(router, 'useNavigate').mockReturnValue(() => vi.fn())

        // form state when user has selected tokens
        await act(() => {
            useCreateSpaceFormStore.setState({
                step1: {
                    membershipType: TOKEN_HOLDERS,
                    tokens: ['0x123'],
                },
                step2: {
                    spaceIconUrl: 'http://whatever.com?jpg',
                    spaceName: 'sample space',
                },
            })
        })

        // render
        render(<Wrapper />)
        const nextButton = screen.getByTestId('create-space-next-button')

        fireEvent.click(nextButton)
        await screen.findByTestId('space-icon')
        fireEvent.click(nextButton)

        // on 3rd step
        await screen.findByTestId('space-form-3')
        fireEvent.click(nextButton)

        await waitFor(async () => {
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
        })
    }, 10000)
})
