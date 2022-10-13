import { List, ListItem, ListItemText } from '@mui/material'

import { useSpacesFromContract } from 'use-zion-client'

export function Web3Spaces(): JSX.Element {
    const spaces = useSpacesFromContract()
    return (
        <List>
            {spaces.map((space) => (
                <ListItem key={space.key}>
                    <ListItemText>{space.name}</ListItemText>
                </ListItem>
            ))}
        </List>
    )
}
