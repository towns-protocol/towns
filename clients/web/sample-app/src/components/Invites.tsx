import React from 'react'
import { List, ListItem, ListItemText, Typography } from '@mui/material'
import { InviteData, useInvites } from 'use-zion-client'
import { Theme } from '@mui/system'

interface Props {
    title: string
    onClickInvite: (invite: InviteData) => void
}

export function Invites(props: Props): JSX.Element {
    const invites = useInvites()
    const { onClickInvite } = props

    return invites.length > 0 ? (
        <>
            <Typography noWrap variant="h6" component="div" sx={spacingStyle}>
                {props.title}
            </Typography>
            <List>
                {invites.map((r) => (
                    <ListItem button key={r.id.streamId} onClick={() => onClickInvite(r)}>
                        <ListItemText>{r.name}</ListItemText>
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
