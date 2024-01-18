import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { SpaceItem } from 'use-zion-client'
import { PATHS } from 'routes'
import { TestApp } from 'test/testUtils'
import { NoJoinedSpacesFallback } from './NoJoinedSpacesFallback'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

const getRoomDataSpy = vi.fn()
let spacesMock: SpaceItem[] = []

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof Lib
    return {
        ...actual,
        useZionClient: () => {
            return {
                ...actual.useZionClient(),
                client: {
                    getRoomData: getRoomDataSpy,
                },
            }
        },
        useZionContext: () => {
            return {
                ...actual.useZionContext(),
                casablancaClient: {},
                spaces: spacesMock,
            }
        },
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <NoJoinedSpacesFallback />
        </TestApp>
    )
}

describe('<SpaceHome />', () => {
    test('renders fallback content when no server space or contract space', async () => {
        spacesMock = []

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(screen.getByTestId('space-home-fallback-content')).toBeInTheDocument()
            },
            {
                timeout: 5000,
            },
        )
    })

    test('navigates to first space if it exists', async () => {
        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        getRoomDataSpy.mockReturnValue({
            membership: 'join',
        })

        spacesMock = [
            {
                id: '123',
                name: '123',
                avatarSrc: '',
            },
        ]

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(`/${PATHS.SPACES}/123/`)
            },
            {
                timeout: 5000,
            },
        )
    })
})
