/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Membership } from '../../types/zion-types'
import { ClientEvent, MatrixClient, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import isEqual from 'lodash/isEqual'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import { create } from 'zustand'
import { Client as CasablancaClient } from '@river/sdk'
import { useSpacesIds_Matrix } from './useSpaceIds_Matrix'
import { useSpacesIds_Casablanca } from './useSpaceIds_Casablanca'

export type SpaceIdStore = {
    spaceIds: RoomIdentifier[]
}

export type SpaceIdStoreInterface = SpaceIdStore & {
    setSpaceIds: (fn: (prev: SpaceIdStore) => SpaceIdStore) => void
}

export const useSpaceIdStore = create<SpaceIdStoreInterface>((set) => ({
    spaceIds: [],
    setSpaceIds: (fn: (prevState: SpaceIdStore) => SpaceIdStore) => {
        set((state) => fn(state))
    },
}))

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds(
    matrixClient: MatrixClient | undefined,
    casablancaClient: CasablancaClient | undefined,
): {
    invitedToIds: RoomIdentifier[]
} {
    const { setSpaceIds } = useSpaceIdStore()

    const { spaceIds: matrixSpaceIds, invitedToIds: matrixInvitedToIds } =
        useSpacesIds_Matrix(matrixClient)
    const { spaceIds: casablancaSpaceIds, invitedToIds: casablancaInvitedToIds } =
        useSpacesIds_Casablanca(casablancaClient)

    const invitedToIds = useMemo(() => {
        console.log(`useSpacesIds::setInviteIds`)
        return [...matrixInvitedToIds, ...casablancaInvitedToIds]
    }, [casablancaInvitedToIds, matrixInvitedToIds])

    useEffect(() => {
        const newSpaceIds = [...matrixSpaceIds, ...casablancaSpaceIds]
        setSpaceIds((prev) => {
            if (isEqual(prev.spaceIds, newSpaceIds)) {
                return prev
            }
            console.log(`useSpacesIds::setSpaceIds aggregated`, {
                prev: prev.spaceIds,
                newSpaceIds,
            })
            return { spaceIds: newSpaceIds }
        })
    }, [casablancaSpaceIds, matrixSpaceIds, setSpaceIds])

    return { invitedToIds }
}
