import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as Router from 'react-router'
import { Membership } from '@river-build/sdk'
import { PATHS } from 'routes'
import { TestApp } from 'test/testUtils'
import { addressFromSpaceId } from 'ui/utils/utils'
import { SpaceHome } from './SpaceHome'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
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
    hasLoadedMemberships: false,
}

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId="some-stream-id">
                <SpaceHome />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<SpaceHome />', () => {
    test('routes to spaces/:id/threads when no channel groups', async () => {
        const serverSpaceData = {
            ...mockSpaceData,
            channelGroups: [],
            membership: Membership.Join,
        }
        // <SpaceHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return serverSpaceData
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    `/${PATHS.SPACES}/${addressFromSpaceId('some-stream-id')}/threads/`,
                )
            },
            {
                timeout: 4000,
            },
        )
    })

    test('routes to first channel when channels exist', async () => {
        const serverSpaceData = {
            ...mockSpaceData,
            membership: Membership.Join,
        }
        // <SpaceHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return serverSpaceData
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    `/${PATHS.SPACES}/${addressFromSpaceId(
                        'some-stream-id',
                    )}/channels/some-channel-stream-id/`,
                )
            },
            {
                timeout: 4000,
            },
        )
    })
})
