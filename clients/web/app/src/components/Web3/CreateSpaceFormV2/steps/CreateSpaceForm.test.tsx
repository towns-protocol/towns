import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { describe, expect, test, vi } from 'vitest'
import { act } from 'react-dom/test-utils'
import { TestApp } from 'test/testUtils'
import { CreateSpaceForm } from '../CreateSpaceForm'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { EVERYONE, TOKEN_HOLDERS } from '../constants'

vi.mock('react-router-dom', () => ({
    ...vi.importActual('react-router-dom'),
    useSearchParams: () => {
        return [
            {
                get: () => undefined,
            },
        ]
    },
}))

const Wrapper = () => {
    return (
        <TestApp>
            <CreateSpaceForm />
        </TestApp>
    )
}

describe('CreateSpaceStep1', () => {
    test('renders the form', async () => {
        render(<Wrapper />)
        const title = screen.getByText('Create Space')
        expect(title).toBeInTheDocument()
    })

    test('Step 1: does not contain prev button', async () => {
        render(<Wrapper />)
        expect(screen.queryByRole('button', { name: 'Prev' })).not.toBeInTheDocument()
    })

    test('Step 1: cannot proceed forward if no option is selected', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })

        fireEvent.click(next)

        await screen.findByText(/please choose who can join/i)
    })

    test('Step 1: cannot proceed forward if "Token holders" is selected but no tokens have been selected', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })
        const tokenRadio = screen.getByText('Token holders')
        fireEvent.click(tokenRadio)
        fireEvent.click(next)

        await screen.findByText(/select at least one token/i)
    })

    test('Retains state if moving to next step and then going back', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })
        let everyoneRadio = screen.getByDisplayValue(EVERYONE)

        fireEvent.click(everyoneRadio)
        fireEvent.click(next)

        await waitFor(() => expect(everyoneRadio).not.toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: 'Prev' }))

        everyoneRadio = await screen.findByDisplayValue(EVERYONE)
        expect(everyoneRadio).toBeChecked()
    })

    test('Step 2: if tokens are selected, can delete all but 1 token', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })
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
        fireEvent.click(next)

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
    })

    test('Step 2: cannot proceed if no space name or space icon', async () => {
        act(() => {
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
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))
        await screen.findByTestId('space-icon')

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => {
            return screen.findByText(/please choose an icon for your space./i)
        })
        await waitFor(async () => {
            return screen.findByText(/please enter a name for your space./i)
        })
    })
})
