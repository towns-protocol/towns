/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as RouterDom from 'react-router-dom'
import { TestApp } from 'test/testUtils'
import InviteLinkLanding from './InviteLinkLanding'

const SPACE_ID = 'some-room-id'

const onChainSpaceInfo = {
    address: '0x111',
    networkId: SPACE_ID,
    name: 'test space',
    owner: '0x222',
    disabled: false,
}

vi.mock('hooks/useSpaceInfoFromPathname', () => {
    return {
        useSpaceIdFromPathname: () => SPACE_ID,
    }
})

vi.mock('react-router-dom', async () => {
    return {
        ...((await vi.importActual('react-router-dom')) as typeof RouterDom),
        useSearchParams: () => [
            {
                get: () => true,
            },
        ],
    }
})

vi.mock('use-towns-client', async () => {
    return {
        ...((await vi.importActual('use-towns-client')) as typeof Lib),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <InviteLinkLanding />
        </TestApp>
    )
}

describe('<InviteLinkLanding />', () => {
    test('renders town info', async () => {
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('town-info')).toBeInTheDocument()
        })
    })

    test('renders not found', async () => {
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: undefined,
        })
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('not-found')).toBeInTheDocument()
        })
    })
})
