import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { describe, expect, test } from 'vitest'
import { TestApp } from 'test/testUtils'
import { CreateSpaceForm } from '../CreateSpaceForm'

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

        await screen.findByText(/please choose who can join/gi)
    })

    test('Step 1: cannot proceed forward if "Token holders" is selected but no tokens have been selected', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })
        const tokenRadio = screen.getByText('Token holders')
        fireEvent.click(tokenRadio)
        fireEvent.click(next)

        await screen.findByText(/select at least one token/gi)
    })

    test('Retains state if moving to next step and then going back', async () => {
        render(<Wrapper />)
        const next = screen.getByRole('button', { name: 'Next' })
        let everyoneRadio = screen.getByDisplayValue('everyone')

        fireEvent.click(everyoneRadio)
        fireEvent.click(next)

        await waitFor(() => expect(everyoneRadio).not.toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: 'Prev' }))

        everyoneRadio = await screen.findByDisplayValue('everyone')
        expect(everyoneRadio).toBeChecked()
    })
})
