import React from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import {} from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
    }
})

const Wrapper = (props: { children: JSX.Element }) => {
    return <TestApp>{props.children}</TestApp>
}

const UserComponent = (props: { userId: string; allowUnknown?: boolean }) => {
    const { userId } = props
    const { lookupUser } = Lib.useUserLookupContext()

    // silly but for testing only
    const user = props.allowUnknown ? lookupUser(userId, true) : lookupUser(userId)
    return (
        <div>
            {user ? (
                <div data-testid="user-card">
                    <span>hello</span>
                    <h2>{user?.username}</h2>
                    <h3>{getPrettyDisplayName(user)}</h3>
                    <pre>{JSON.stringify(user)}</pre>
                </div>
            ) : (
                <div data-testid="not-found">Not Found</div>
            )}
        </div>
    )
}

const setupDefaultUserNames = () => {
    const { result } = renderHook(() => Lib.useUserLookupStore())
    act(() => {
        result.current.setUser(
            '0x1234',
            {
                userId: '0x1234',
                username: 'joseph',
                usernameConfirmed: true,
                usernameEncrypted: true,
                displayName: 'Joseph Beuys',
                displayNameEncrypted: false,
                ensAddress: undefined,
                memberOf: ['spaceId'],
                nft: undefined,
            },
            'spaceId',
            'channelId',
        )
    })
}

describe('setting and updating a username', () => {
    test('renders hello', async () => {
        vi.spyOn(Lib, 'useTownsContext').mockImplementationOnce(() => {
            return {
                ...Lib.useTownsContext(),
            }
        })

        setupDefaultUserNames()
        render(
            <Wrapper>
                <UserComponent userId="0x1234" />
            </Wrapper>,
        )

        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument()
        })

        const { result } = renderHook(() => Lib.useUserLookupStore())
        act(() => {
            result.current.setUser(
                '0x1234',
                {
                    userId: '0x1234',
                    username: 'joseph',
                    usernameConfirmed: true,
                    usernameEncrypted: true,
                    displayName: 'Joseph Beuys',
                    displayNameEncrypted: false,
                    ensAddress: undefined,
                    memberOf: ['spaceId'],
                    nft: undefined,
                },
                'spaceId',
                'channelId',
            )
        })

        await waitFor(() => {
            expect(screen.getByText('joseph')).toBeInTheDocument()
        })

        act(() => {
            result.current.setUser(
                '0x1234',
                {
                    userId: '0x1234',
                    username: 'joseph2',
                    usernameConfirmed: true,
                    usernameEncrypted: true,
                    displayName: 'Joseph Beuys',
                    displayNameEncrypted: false,
                    ensAddress: undefined,
                    memberOf: ['spaceId'],
                    nft: undefined,
                },
                'spaceId',
                'channelId',
            )
        })

        await waitFor(() => {
            expect(screen.getByText('joseph2')).toBeInTheDocument()
        })

        act(() => {
            result.current.setUser(
                '0x000',
                {
                    userId: '0x1234',
                    username: 'jbeuys',
                    usernameConfirmed: true,
                    usernameEncrypted: true,
                    displayName: 'Joseph Beuys',
                    displayNameEncrypted: false,
                    ensAddress: undefined,
                    memberOf: ['spaceId'],
                    nft: undefined,
                },
                'spaceId',
                'channelId',
            )
        })
    })
})

describe('stable unknown lookup', () => {
    test('renders nothing for unknown users', async () => {
        setupDefaultUserNames()
        render(<UserComponent userId="0x6666" />)
        const userText = screen.queryByText('0x6666')
        expect(screen.getByTestId('not-found')).toBeInTheDocument()
        expect(userText).not.toBeInTheDocument()
    })

    test('renders userId for unknown users if allowUnknown flag is present', async () => {
        setupDefaultUserNames()
        render(<UserComponent allowUnknown userId="0x6666" />)
        expect(screen.getByTestId('user-card')).toBeInTheDocument()
        expect(screen.getByText('0x6666')).toBeInTheDocument()
    })

    test('memoize unknown users', async () => {
        const { result } = renderHook(() => Lib.useUserLookupContext())
        act(() => {
            const user1 = result.current.lookupUser('0xnobody', true)
            const user2 = result.current.lookupUser('0xnobody', true)
            const user3 = result.current.lookupUser('0xanother', true)
            expect(user1).toBe(user2)
            expect(user1).not.toBe(user3)
        })
    })
})
