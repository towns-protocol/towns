import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestApp } from 'test/testUtils'
import { TipMenu } from './TipMenu'
import type { TipOption } from './types'

const TestTipMenu = () => {
    const [tipValue, setTipValue] = React.useState<TipOption | undefined>()

    return (
        <TestApp>
            <TipMenu
                tipValue={tipValue}
                setTipValue={setTipValue}
                confirmRenderer={<div data-testid="confirm-renderer">Confirm Screen</div>}
            />
        </TestApp>
    )
}

describe('TipMenu', () => {
    it('should render tip options', async () => {
        render(<TestTipMenu />)

        await waitFor(() => {
            expect(screen.getByText('Tip Amount')).toBeInTheDocument()
        })
        expect(screen.getByText('Tip Amount')).toBeInTheDocument()
        expect(screen.getByText('$1')).toBeInTheDocument()
        expect(screen.getByText('$0.25')).toBeInTheDocument()
    })

    it('should show confirm screen when tip option is selected', async () => {
        render(<TestTipMenu />)

        const oneDollarButton = screen.getByText('$1')
        await userEvent.click(oneDollarButton)

        await waitFor(() => {
            expect(screen.getByTestId('confirm-renderer')).toBeInTheDocument()
        })

        // Tip amount and options should no longer be visible
        expect(screen.queryByText('Tip Amount')).not.toBeInTheDocument()
        expect(screen.queryByText('$0.25')).not.toBeInTheDocument()
    })
})
