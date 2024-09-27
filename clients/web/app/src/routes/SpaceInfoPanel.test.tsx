/* eslint-disable @typescript-eslint/ban-ts-comment */
import 'fake-indexeddb/auto'
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as Router from 'react-router'
import { BigNumber } from 'ethers'
import { TestApp, getWalletAddress } from 'test/testUtils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { SpaceInfoPanel } from './SpaceInfoPanel'

const ownerUser = {
    userId: getWalletAddress(),
    username: 'beavis',
    usernameConfirmed: true,
    usernameEncrypted: false,
    displayName: 'beavis',
    displayNameEncrypted: false,
    avatarUrl: 'https://example.com',
}

const generateSpaceData = (networkId: string) => {
    const streamId = networkId
    const roomIdentifier = streamId
    const spaceData = {
        id: roomIdentifier,
        name: 'tacos are cool',
        avatarSrc: '',
        channelGroups: [],
        membership: Lib.Membership.Join,
        isLoadingChannels: false,
        hasLoadedMemberships: false,
        shortDescription: 'my short description',
        longDescription: 'my long, long, long description',
    }

    const onChainSpaceInfo = {
        address: getWalletAddress(),
        networkId: roomIdentifier,
        name: spaceData.name,
        owner: ownerUser.userId,
        disabled: false,
        shortDescription: spaceData.shortDescription,
        longDescription: spaceData.longDescription,
        createdAt: BigNumber.from(0).toString(),
        tokenId: BigNumber.from(0).toString(),
        uri: 'https://example.com',
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

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    return {
        ...actual,
        useSpaceMembers: () => ({ memberIds: [ownerUser.userId] }),
        useAllKnownUsers: () => ({ users: [ownerUser] }),
        useGetRootKeyFromLinkedWallet: () => ({ data: ownerUser.userId }),
        useUser: (userId: string) => {
            const u = actual.useUser(userId)
            // can't seem to add owner to mocked members, workaround:
            return userId === ownerUser.userId ? ownerUser : u
        },
    }
})

const Wrapper = ({ roomIdentifier }: { roomIdentifier: string }) => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId={roomIdentifier}>
                <SpaceInfoPanel />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<SpaceInfoPanel />', () => {
    beforeEach(() => {
        vi.resetAllMocks()

        vi.mock('framer-motion', async () => {
            return {
                AnimatePresence: ({ children }: { children: JSX.Element }) => children,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                motion: (c: any) => c,
            }
        })

        vi.mock('ui/styles/atoms.css', () => ({
            atoms: Object.assign(() => {}, {
                properties: new Set([]),
            }),
            boxClass: '',
            containerWithGapClass: '',
        }))

        vi.mock('@components/SpaceIcon', () => ({
            SpaceIcon: () => <div />,
            InteractiveSpaceIcon: () => <div />,
        }))
    })

    afterAll(() => {
        vi.resetAllMocks()
    })

    test('renders correct basic details', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')

        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            useSpaceData: spaceData,
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-container')
        screen.getByText(spaceData.name)

        expect(screen.getByTestId('owner')).toHaveTextContent(getPrettyDisplayName(ownerUser))

        screen.getByText(/1 member/gi)
    })

    test('does not render about section if user cannot edit and room does not have long description', async () => {
        // no-topic is matched in mocks/handlers.ts
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('no-topic')
        const spaceDataWithoutLongDescription = {
            ...spaceData,
            longDescription: '',
        }

        const onChainSpaceInfoWithoutLongDescription = {
            ...onChainSpaceInfo,
            longDescription: '',
        }

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: false,
            error: undefined,
        })

        vi.spyOn(Lib, 'useIsSpaceOwner').mockReturnValue({
            isLoading: false,
            isOwner: false,
            error: undefined,
        })

        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceDataWithoutLongDescription)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfoWithoutLongDescription,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-container')
        expect(screen.queryByTestId('upload-image-button')).toBeNull()
        expect(screen.queryByTestId('about-section')).toBeNull()
    })

    test('renders about section if user can edit, but no room topic exists yet', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('no-topic')
        const spaceDataWithoutLongDescription = {
            ...spaceData,
            longDescription: '',
        }

        const onChainSpaceInfoWithoutLongDescription = {
            ...onChainSpaceInfo,
            longDescription: '',
        }

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useIsSpaceOwner').mockReturnValue({
            isLoading: false,
            isOwner: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceDataWithoutLongDescription)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfoWithoutLongDescription,
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
        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useIsSpaceOwner').mockReturnValue({
            isLoading: false,
            isOwner: false,
            error: undefined,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('about-section')
        await screen.findByText(/my long, long, long description/gi)
    })

    test('renders edit UI when user has permission to edit', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')

        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useIsSpaceOwner').mockReturnValue({
            isLoading: false,
            isOwner: true,
            error: undefined,
        })
        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            chainId: 5,
        })
        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        await screen.findByTestId('upload-image-button')
    })

    test('user with permission is able to edit description', async () => {
        const { roomIdentifier, spaceData, onChainSpaceInfo } = generateSpaceData('abcd')
        // @ts-ignore
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useIsSpaceOwner').mockReturnValue({
            isLoading: false,
            isOwner: true,
            error: undefined,
        })

        vi.spyOn(Lib, 'useTownsClient').mockReturnValue({
            // @ts-ignore
            client: {
                isAccountAbstractionEnabled: () => true,
            },
            chainId: 5,
        })

        vi.spyOn(Lib, 'useSpaceData').mockReturnValue(spaceData)
        // @ts-ignore
        vi.spyOn(Lib, 'useContractSpaceInfo').mockReturnValue({
            data: onChainSpaceInfo,
        })

        render(<Wrapper roomIdentifier={roomIdentifier} />)
        const container = await screen.findByTestId('about-section')
        await within(container).findByTestId('edit-button')
    })
})
