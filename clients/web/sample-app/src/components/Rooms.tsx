import { List, ListItem, ListItemText, Typography } from '@mui/material'
import { Membership, RoomIdentifier, isRoom, useMatrixStore } from 'use-zion-client'

import { useMemo } from 'react'
import { Theme } from '@mui/system'

interface Props {
    title: string
    membership: Membership
    onClickRoom: (id: RoomIdentifier, membership: Membership) => void
    isSpace: boolean
}

export function Rooms(props: Props): JSX.Element {
    const { rooms } = useMatrixStore()
    const { isSpace, membership, onClickRoom } = props
    const foundRooms = useMemo(() => {
        if (rooms) {
            return Object.values(rooms).filter(
                (room) =>
                    isRoom(room) && room.membership === membership && room.isSpaceRoom === isSpace,
            )
        }
        return []
    }, [isSpace, membership, rooms])
    return foundRooms.length > 0 ? (
        <>
            <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
                {props.title}
            </Typography>
            <List>
                {foundRooms.map((r) => (
                    <ListItem button key={r.id.slug} onClick={() => onClickRoom(r.id, membership)}>
                        <ListItemText>{r.name + ' hi'}</ListItemText>
                    </ListItem>
                ))}
            </List>
        </>
    ) : (
        <></>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
