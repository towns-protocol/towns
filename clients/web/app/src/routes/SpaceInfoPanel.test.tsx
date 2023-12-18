/* eslint-disable @typescript-eslint/ban-ts-comment */
import 'fake-indexeddb/auto'
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { TestApp, getWalletAddress } from 'test/testUtils'
import * as useContractSpaceInfoHook from 'hooks/useContractSpaceInfo'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { SpaceInfoPanel } from './SpaceInfoPanel'

const ownerUser = {
    userId: getWalletAddress(),
    username: 'beavis',
    usernameConfirmed: true,
    displayName: 'beavis',
    avatarUrl: 'https://example.com',
}

const generateSpaceData = (networkId: string) => {
    const streamId = networkId
    const roomIdentifier = {
        streamId,
    }
    const spaceData = {
        id: roomIdentifier,
        name: 'tacos are cool',
        avatarSrc: '',
        channelGroups: [],
        membership: Lib.Membership.Join,
        isLoadingChannels: false,
    }

    const onChainSpaceInfo = {
        address: getWalletAddress(),
        networkId: roomIdentifier.streamId,
        name: spaceData.name,
        owner: ownerUser.userId,
        disabled: false,
    }

    return {
        roomIdentifier,
        spaceData,
        onChainSpaceInfo,
    }
}

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof Lib
    return {
        ...actual,
        useSpaceMembers: () => ({ memberIds: [ownerUser.userId] }),
        useAllKnownUsers: () => ({ users: [ownerUser] }),
        useUser: (userId: string) => {
            const u = actual.useUser(userId)
            // can't seem to add owner to mocked members, workaround:
            return userId === ownerUser.userId ? ownerUser : u
        },
    }
})

const Wrapper = ({ roomIdentifier }: { roomIdentifier: Lib.RoomIdentifier }) => {
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
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')

        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            useSpaceData: spaceData,
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-container')
        screen.getByText(spaceData.name)

        expect(screen.getByTestId('owner')).toHaveTextContent(
            getPrettyDisplayName(ownerUser).displayName,
        )

        screen.getByText(/1 member/gi)
    })

    test('does not render about section if user cannot edit and room does not have topic', async () => {
        // no-topic is matched in mocks/handlers.ts
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('no-topic')

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: false,
            error: undefined,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-container')
        expect(screen.queryByTestId('upload-image-button')).toBeNull()
        expect(screen.queryByTestId('about-section')).toBeNull()
    })

    test('renders about section if user can edit, but no room topic exists yet', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('no-topic')

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-container')
        await screen.findByText(/add a description/gi)
    })

    test('renders about section when the room has a topic and user cannot edit', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: false,
            error: undefined,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })
        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('about-section')
        await screen.findByText(/my special space/gi)
    })

    test('renders edit UI when user has permission to edit', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })
        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })
        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-button')
    })

    test('user with permission is able to edit and submit description', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')
        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useZionClient').mockReturnValue({
            // @ts-ignore
            client: {
                getUser: () => ownerUser,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(useContractSpaceInfoHook, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        const editButton = await screen.findByTestId('edit-description-button')
        fireEvent.click(editButton)
        const saveButton = await screen.findByTestId('save-button')
        const textArea = await screen.findByTestId('edit-description-textarea')
        fireEvent.change(textArea, { target: { value: 'new description' } })
        fireEvent.click(saveButton)

        // TODO: verify that the description was updated. Probably need to use https://mswjs.io/docs/api/response/once
        // to mock the first request as one description, then let subsequent requests be the updated description.
        // await waitFor(() => {
        //     expect(saveButton).not.toBeInTheDocument()
        // })
        // await waitFor(() => {
        //     expect(/new description/gi).toBeInTheDocument()
        // })
    })
})
