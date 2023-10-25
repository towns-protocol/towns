import React from 'react'
import TestRenderer from 'react-test-renderer'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toJsonTree } from 'utils/test_util'
import { TooltipBox as Box } from './TooltipBox'
import { ZLayerProvider } from '../ZLayer/ZLayerProvider'

describe('Box', () => {
    it('should render', () => {
        const component = TestRenderer.create(<Box />)
        const tree = toJsonTree(component)
        expect(tree.type).toBe('div')
    })

    it('should display default tooltip on hover', async () => {
        render(
            <ZLayerProvider>
                <Box data-testid="box" tooltip="help" />
            </ZLayerProvider>,
        )
        const box = screen.getByTestId('box')
        userEvent.hover(box)

        await waitFor(() => {
            expect(screen.getByText('help')).toBeInTheDocument()
        })

        userEvent.unhover(box)

        await waitFor(() => {
            expect(screen.queryByText('help')).not.toBeInTheDocument()
        })
    })

    it('should display clickable tooltip on click', async () => {
        render(
            <ZLayerProvider>
                <Box data-testid="box" tooltip="help" tooltipOptions={{ trigger: 'click' }} />
            </ZLayerProvider>,
        )
        const box = screen.getByTestId('box')

        userEvent.click(box)

        await waitFor(() => {
            expect(screen.getByText('help')).toBeInTheDocument()
        })
    })
})
