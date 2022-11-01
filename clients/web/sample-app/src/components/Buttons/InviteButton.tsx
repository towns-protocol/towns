import React from 'react'
import { IconButton, Theme, Tooltip } from '@mui/material'

import GroupAddIcon from '@mui/icons-material/GroupAdd'

interface Props {
    onClick: () => void
}

export function InviteButton(props: Props): JSX.Element {
    return (
        <Tooltip title="Invite">
            <IconButton
                size="medium"
                edge="start"
                color="inherit"
                aria-label="invite"
                sx={{
                    pr: (theme: Theme) => theme.spacing(1),
                }}
                onClick={() => props.onClick()}
            >
                <GroupAddIcon />
            </IconButton>
        </Tooltip>
    )
}
