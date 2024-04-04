/* eslint-disable @typescript-eslint/ban-ts-comment */
import 'fake-indexeddb/auto'
import { describe, expect, test } from 'vitest'

import { render, screen } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { TestApp } from './App'

process.on('uncaughtException', function (error) {
    console.log(`uncaughtException`, error)
})

process.on('unhandledRejection', function (reason, p) {
    console.log(`unhandledRejection`, reason, p)
    //call handler here
})
describe('Accordion test', () => {
    test('should render', () => {
        render(
            <React.StrictMode>
                <BrowserRouter>
                    <TestApp />
                </BrowserRouter>
            </React.StrictMode>,
        )

        expect(screen.getAllByText(/Environment/i)).toBeDefined()
    })
})
