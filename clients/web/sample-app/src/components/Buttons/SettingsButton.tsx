import React from 'react'
import { IconButton, Theme, Tooltip } from '@mui/material'

import Settings from '@mui/icons-material/Settings'

interface Props {
    onClick: () => void
}

export function SettingsButton(props: Props): JSX.Element {
    return (
        <Tooltip title="Settings">
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
                <Settings />
            </IconButton>
        </Tooltip>
    )
}
