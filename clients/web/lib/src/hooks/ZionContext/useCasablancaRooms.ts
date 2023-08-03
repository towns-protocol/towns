import { Client as CasablancaClient } from '@towns/sdk'
import { useEffect, useState } from 'react'
import { Room } from '../../types/zion-types'

export function useCasablancaRooms(client?: CasablancaClient): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>({})

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        //const updateState = (roomId: string) => {
        //
        //}

        const setInitialState = () => {
            setRooms({})
        }

        // initial state
        setInitialState()

        // subscribe to changes

        return () => {
            setRooms({})
        }
    }, [client])
    return rooms
}
