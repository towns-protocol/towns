import { ZionClient } from '../../client/ZionClient'
import { Room } from 'matrix-js-sdk'
import { MutableRefObject, useCallback, useEffect, useState } from 'react'
import { useMatrixStore } from '../../store/use-matrix-store'

export const useSyncEventHandler = (matrixClientRef: MutableRefObject<ZionClient | undefined>) => {
    const [syncInfo, setSyncInfo] = useState<unknown>()
    const { setAllRooms } = useMatrixStore()

    useEffect(() => {
        if (matrixClientRef.current) {
            const rooms = matrixClientRef.current.getRooms()
            if (process.env.REACT_APP_VERY_VERBOSE) {
                printRooms(rooms)
            }
            setAllRooms(rooms)
        }
    }, [matrixClientRef, setAllRooms, syncInfo])

    const handleSyncAll = useCallback(function () {
        // Force a sync by mutating the state.
        setSyncInfo({})
    }, [])

    return handleSyncAll
}

function printRooms(rooms: Room[]): void {
    for (const r of rooms) {
        printRoom(r)
    }
}

function printRoom(room: Room): void {
    if (room) {
        console.log(
            `    Room[${room.roomId}] = { name: "${
                room.name
            }", membership: ${room.getMyMembership()} }`,
        )
    } else {
        console.log(`"room" is undefined. Cannot print.`)
    }
}
