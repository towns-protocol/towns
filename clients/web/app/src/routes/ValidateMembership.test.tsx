import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { Route, Routes } from 'react-router'
import { TestApp } from 'test/testUtils'
import { PATHS } from 'routes'
import { spaceRoomIdentifier } from 'test/testMocks'
import { ValidateMembership } from './ValidateMembership'

const ValidSpaceContent = () => <>Valid space content</>

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib

    return {
        ...actual,
        useTownsContext: () => ({
            ...actual.useTownsContext(),
            client: {},
            clientStatus: {
                isRemoteDataLoaded: true,
                isLocalDataLoaded: true,
            },
        }),
    }
})

const mockSpaceData: Lib.SpaceData = {
    id: 'some-stream-id',
    name: 'test space',
    avatarSrc: 'test',
    channelGroups: [
        {
            label: 'group 1',
            channels: [
                {
                    id: 'some-channel-stream-id',
                    label: 'general',
                },
            ],
        },
    ],
    membership: '',
    isLoadingChannels: false,
    hasLoadedMemberships: true,
}

const Wrapper = ({
    initialEntries = [`/${PATHS.SPACES}/${spaceRoomIdentifier}`],
}: {
    initialEntries?: string[]
}) => {
    return (
        <TestApp initialEntries={initialEntries}>
            <Lib.SpaceContextProvider spaceId={spaceRoomIdentifier}>
                <Routes>
                    <Route element={<ValidateMembership />}>
                        <Route
                            path={`${PATHS.SPACES}/:spaceSlug`}
                            element={<ValidSpaceContent />}
                        />
                    </Route>
                </Routes>
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<ValidateMembership />', () => {
    test('shows not found message when town does not exist', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => undefined)
        vi.spyOn(Lib, 'useSpaceDataStore').mockImplementation(() => ({
            spaceDataMap: {}, // loaded spaces
        }))

        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('town-not-found-box')).toBeInTheDocument()
        })
    })

    test('shows content when space is found and user is a member', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => ({
            ...mockSpaceData,
            membership: Lib.Membership.Join,
        }))

        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByText(/valid space content/gi)).toBeInTheDocument()
        })
    })

    test('does not show content when space is found and user is not a member', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => undefined)
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.queryByText(/valid space content/gi)).not.toBeInTheDocument()
        })
    })
})
