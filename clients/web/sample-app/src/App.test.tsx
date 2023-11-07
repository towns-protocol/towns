import { describe, expect, test } from 'vitest'

import { render, screen } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'

describe('Accordion test', () => {
    test('should render', () => {
        render(
            <React.StrictMode>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </React.StrictMode>,
        )

        expect(screen.getByText(/Environment/i)).toBeDefined()
    })
})
