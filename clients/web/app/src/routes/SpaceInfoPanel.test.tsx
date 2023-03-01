/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { TestApp, address1, address2 } from 'test/testUtils'
import * as useHasPermission from 'hooks/useHasPermission'
import { SpaceInfoPanel } from './SpaceInfoPanel'

const ownerUser = {
    userId: 'gto',
    displayName: 'beavis',
    avatarUrl: 'https://example.com',
    presence: 'online',
    lastPresenceTs: 0,
    currentlyActive: true,
}

const roomIdentifier = {
    protocol: Lib.SpaceProtocol.Matrix,
    slug: 'some-slug',
    networkId: 'some-network',
}
const spaceData = {
    id: roomIdentifier,
    name: 'tacos are cool',
    avatarSrc: '',
    channelGroups: [],
    membership: Lib.Membership.Join,
}

const onChainSpaceInfo = {
    address: address1,
    networkId: roomIdentifier.networkId,
    name: spaceData.name,
    owner: address2,
    disabled: false,
}

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

vi.mock('use-zion-client', async () => {
    return {
        ...((await vi.importActual('use-zion-client')) as typeof Lib),
        useSpaceData: () => spaceData,
        useSpaceMembers: () => ({ members: [ownerUser] }),
    }
})

vi.mock('hooks/useContractSpaceInfo', async () => {
    return {
        useContractSpaceInfo: () => ({
            data: onChainSpaceInfo,
        }),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId={roomIdentifier}>
                <SpaceInfoPanel />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<SpaceHome />', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test('renders correct basic details', async () => {
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
                getRoomTopic: () => Promise.reject(),
            },
            chainId: 5,
        })

        render(<Wrapper />)
        await screen.findByTestId('upload-image-container')
        screen.getByText(spaceData.name)
        screen.getByText(/beavis/gi)
        screen.getByText(/1 member/gi)
    })

    test('does not render about section if user cannot edit and room does not have topic', async () => {
        // @ts-ignore
        vi.spyOn(useHasPermission, 'useHasPermission').mockReturnValue({
            data: false,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
                getRoomTopic: () => Promise.reject(),
            },
            chainId: 5,
        })

        render(<Wrapper />)
        await screen.findByTestId('upload-image-container')
        expect(screen.queryByTestId('upload-image-button')).toBeNull()
        expect(screen.queryByTestId('about-section')).toBeNull()
    })

    test('renders about section if user can edit, but no room topic exists yet', async () => {
        // @ts-ignore
        vi.spyOn(useHasPermission, 'useHasPermission').mockReturnValue({
            data: true,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
                getRoomTopic: () => Promise.reject(),
            },
            chainId: 5,
        })

        render(<Wrapper />)
        await screen.findByTestId('upload-image-container')
        await screen.findByText(/add a description/gi)
    })

    test('renders about section when the room has a topic and user cannot edit', async () => {
        // @ts-ignore
        vi.spyOn(useHasPermission, 'useHasPermission').mockReturnValue({
            data: false,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
                getRoomTopic: () => Promise.resolve('my special space'),
            },
            chainId: 5,
        })
        render(<Wrapper />)
        await screen.findByTestId('about-section')
        await screen.findByText(/my special space/gi)
    })

    test('renders edit UI when user has permission to edit', async () => {
        // @ts-ignore
        vi.spyOn(useHasPermission, 'useHasPermission').mockReturnValue({
            data: true,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })
        render(<Wrapper />)
        await screen.findByTestId('upload-image-button')
    })

    test('user with permission is able to edit and submit description', async () => {
        // @ts-ignore
        vi.spyOn(useHasPermission, 'useHasPermission').mockReturnValue({
            data: true,
        })
        const setTopicSpy = vi.fn()

        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
            setRoomTopic: setTopicSpy,
        })
        render(<Wrapper />)
        const editButton = await screen.findByTestId('edit-description-button')
        fireEvent.click(editButton)
        const saveButton = await screen.findByTestId('save-button')
        const textArea = await screen.findByTestId('edit-description-textarea')
        fireEvent.change(textArea, { target: { value: 'new description' } })
        fireEvent.click(saveButton)
        await waitFor(() => {
            expect(setTopicSpy).toBeCalledWith(spaceData.id, 'new description')
        })
        await waitFor(() => {
            expect(editButton).not.toBeInTheDocument()
        })
    })
})
