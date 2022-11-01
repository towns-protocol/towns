import React from 'react'
import { Box, Button, IconButton, Theme, Typography } from '@mui/material'
import { CircleOutlined } from '@mui/icons-material'

interface Props {
    onClick: () => void
    label: string
}

export const SidebarItemButton = (props: Props) => {
    return (
        <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            sx={{
                pl: (theme: Theme) => theme.spacing(2),
            }}
        >
            <IconButton
                size="medium"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{
                    pr: (theme: Theme) => theme.spacing(1),
                }}
                onClick={props.onClick}
            >
                <CircleOutlined />
            </IconButton>
            <Button onClick={props.onClick}>
                <Typography
                    noWrap
                    variant="body1"
                    component="div"
                    sx={{
                        pr: (theme: Theme) => theme.spacing(1),
                    }}
                >
                    {props.label}
                </Typography>
            </Button>
        </Box>
    )
}
