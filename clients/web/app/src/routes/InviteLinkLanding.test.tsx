import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import * as RouterDom from 'react-router-dom'
import { TestApp } from 'test/testUtils'
import InviteLinkLanding from './InviteLinkLanding'

const SPACE_ID = 'some-room-id'

// mock the fetch fn in useContractSpaceInfo
let getSpaceInfoMock: ReturnType<Lib.ISpaceDapp['getSpaceInfo']> = Promise.resolve({
    address: '0x111',
    networkId: SPACE_ID,
    name: 'test space',
    owner: '0x222',
    disabled: false,
})

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

vi.mock('use-zion-client', async () => {
    return {
        ...((await vi.importActual('use-zion-client')) as typeof Lib),
        useSpaceDapp: () => ({
            getSpaceInfo: () => getSpaceInfoMock,
        }),
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
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('town-info')).toBeInTheDocument()
        })
    })

    test('renders not found', async () => {
        getSpaceInfoMock = Promise.resolve(undefined)
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('town-info')).toBeInTheDocument()
        })
    })
})
