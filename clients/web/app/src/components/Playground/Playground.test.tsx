import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import React from 'react'
import { Playground } from './Playground'

describe('#Playground', () => {
    test('should render mock data', async () => {
        render(<Playground />)
        const match = await screen.findAllByText(/beavis/)
        expect(match.length).toBe(2)
    })
})
