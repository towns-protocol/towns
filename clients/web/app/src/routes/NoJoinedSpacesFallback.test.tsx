import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { TestApp } from 'test/testUtils'
import { NoJoinedSpacesFallback } from './NoJoinedSpacesFallback'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

const getRoomDataSpy = vi.fn()
const spacesSpy = vi.fn()

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof Lib
    return {
        ...actual,
        useZionClient: () => {
            return {
                client: {
                    getRoomData: getRoomDataSpy,
                    matrixClient: {
                        isInitialSyncComplete: () => true,
                    },
                },
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
        spacesSpy.mockReturnValue([])
        vi.spyOn(Lib, 'useZionContext').mockImplementation((() => {
            return {
                spaces: [],
            }
        }) as unknown as typeof Lib.useZionContext)

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

        vi.spyOn(Lib, 'useZionContext').mockImplementation((() => {
            return {
                spaces: [
                    {
                        id: {
                            slug: '123',
                            networkId: '123',
                        },
                    },
                ],
            }
        }) as unknown as typeof Lib.useZionContext)

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith('/spaces/123')
            },
            {
                timeout: 5000,
            },
        )
    })
})
