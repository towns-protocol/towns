import { SpaceIdentifier, ZionClientEvent } from '../client/ZionClientTypes'
import { useEffect, useMemo, useState } from 'react'
import { RoomIdentifier } from '../types/room-identifier'
import { SpaceItem } from '../types/zion-types'
import { getAccountAddress } from '../types/user-identifier'
import { useMatrixCredentials } from './use-matrix-credentials'
import { useZionClient } from './use-zion-client'
import { useZionClientEvent } from './use-zion-client-event'
import { useZionContext } from '../components/ZionContextProvider'
import { useCasablancaCredentials } from './use-casablanca-credentials'
import { Permission } from '@river/web3'
import uniqBy from 'lodash/uniqBy'

type UseSpaceFromContractReturn = {
    spaces: SpaceIdentifier[]
    isLoading: boolean
    isError: boolean
}

export function useSpacesFromContract(): UseSpaceFromContractReturn {
    const matrixSpaces = useMatrixSpacesFromContract()
    const casablancaSpaces = useCasablancaSpacesFromContract()

    const spaces = useMemo(() => {
        return uniqBy([...matrixSpaces.spaces, ...casablancaSpaces.spaces], (s) => s.networkId)
    }, [matrixSpaces.spaces, casablancaSpaces.spaces])

    return {
        spaces,
        isLoading: matrixSpaces.isLoading || casablancaSpaces.isLoading,
        isError: matrixSpaces.isError || casablancaSpaces.isError,
    }
}

export function useCasablancaSpacesFromContract(): UseSpaceFromContractReturn {
    const { loggedInWalletAddress } = useCasablancaCredentials()
    const spaces = useSpacesFromContractWithAddress(loggedInWalletAddress)
    return spaces
}

export function useMatrixSpacesFromContract(): UseSpaceFromContractReturn {
    const { userId } = useMatrixCredentials()
    const myWalletAddress = useMemo(() => {
        return userId ? getAccountAddress(userId) : undefined
    }, [userId])
    const matrixSpaces = useSpacesFromContractWithAddress(myWalletAddress)

    return matrixSpaces
}

function useSpacesFromContractWithAddress(myWalletAddress?: string): UseSpaceFromContractReturn {
    const { spaceDapp } = useZionClient()
    const { spaces: spaceRooms } = useZionContext()
    const [{ isLoading, spaces, isError }, setSpaceIdentifiers] =
        useState<UseSpaceFromContractReturn>({
            isError: false,
            isLoading: true,
            spaces: [],
        })
    const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace)

    useEffect(() => {
        const getEntitledSpaceItems = async () => {
            if (!spaceDapp || !myWalletAddress) {
                return []
            }

            // get all the entitlement status for each space
            // create an array of promises to get all the entitlement status for each space
            const isEntitledPromises = spaceRooms.map((s: SpaceItem) =>
                spaceDapp.isEntitledToSpace(s.id.networkId, myWalletAddress, Permission.Read),
            )
            // Wait for all the promises to resolve
            const entitledSpaces = await Promise.all(isEntitledPromises)
            // Filter out the spaces that the user is not entitled to see
            const entitledSpaceItems = entitledSpaces
                .map((isEntitled, index) => {
                    if (isEntitled) {
                        return spaceRooms[index]
                    }
                    return undefined
                })
                .filter((x) => x !== undefined) as SpaceItem[]
            return entitledSpaceItems
        }

        const getSpaces = async () => {
            const spaceItems = await getEntitledSpaceItems()
            console.log('spaceItems', { spaceItems, myWalletAddress })
            if (!spaceDapp || spaceItems.length === 0) {
                setSpaceIdentifiers({
                    isError: false,
                    isLoading: false,
                    spaces: [],
                })
                return
            }

            /* get all the space info */
            // create an array of promises to get all the space info
            const getSpaceInfoPromises = spaceItems.map((s: SpaceItem) =>
                spaceDapp.getSpaceInfo(s.id.networkId),
            )
            // Wait for all the promises to resolve
            const entitledSpaces = await Promise.all(getSpaceInfoPromises)
            const spaces = entitledSpaces
                .map((s) => {
                    if (s) {
                        return {
                            key: s.networkId,
                            name: s.name,
                            networkId: s.networkId,
                            owner: s.owner,
                            disabled: s.disabled,
                        }
                    }
                    return undefined
                })
                .filter((x) => x !== undefined) as SpaceIdentifier[]

            // Return spaces that the user is entitled to see
            setSpaceIdentifiers({
                isError: false,
                isLoading: false,
                spaces,
            })
        }

        try {
            void getSpaces()
        } catch (e: unknown) {
            setSpaceIdentifiers({ isError: true, isLoading: false, spaces: [] })
        }
    }, [onNewSpace, spaceDapp, myWalletAddress, spaceRooms])

    return { spaces, isLoading, isError }
}

export function useSpaceFromContract(spaceId?: RoomIdentifier): {
    isLoading: boolean
    isError: boolean
    space: SpaceIdentifier | undefined
} {
    const { spaces, isLoading, isError } = useSpacesFromContract()
    return { isLoading, isError, space: spaces.find((x) => x.networkId === spaceId?.networkId) }
}
