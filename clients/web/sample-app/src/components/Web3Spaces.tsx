import React from 'react'
import { Button, List, ListItem, ListItemText } from '@mui/material'

import { SpaceIdentifier, useSpacesFromContract } from 'use-towns-client'
import { useNavigate } from 'react-router-dom'

export function Web3Spaces(): JSX.Element {
    const { spaces, isLoading, isError } = useSpacesFromContract()
    const navigate = useNavigate()

    const onListItemClick = (space: SpaceIdentifier) => {
        navigate(`/spaces/${space.networkId}/`)
    }
    return (
        <>
            {isLoading && <div>Loading...</div>}
            {isError && <div>Error</div>}
            <List>
                {spaces.map((space) => (
                    <ListItem key={space.key}>
                        <Button onClick={() => onListItemClick(space)}>
                            <ListItemText>{space.name}</ListItemText>
                        </Button>
                        {space.networkId}
                    </ListItem>
                ))}
            </List>
        </>
    )
}
