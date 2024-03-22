import React from 'react'
import { Box, CssBaseline, Divider, Drawer, Toolbar } from '@mui/material'
import { InviteData } from 'use-towns-client'
import { Outlet, useNavigate } from 'react-router-dom'

import { Invites } from './Invites'
import { SidebarNewItemButton } from './Buttons/SidebarNewItemButton'
import { SidebarItemButton } from './Buttons/SidebarItemButton'
import { AppDrawerSpaces } from './AppDrawerSpaces'
import { DebugBar } from './DebugBar'

const drawerWidth = 240

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won"t need it on your project.
     */
    window?: () => Window
}

export function AppDrawer(props: Props): JSX.Element {
    const navigate = useNavigate()

    const onClickSpace = (spaceId: string) => {
        console.log('onClickSpace', spaceId)
        navigate('/spaces/' + spaceId + '/')
    }

    const onClickThreads = (spaceId: string) => {
        console.log('onClickThreads', spaceId)
        navigate('/spaces/' + spaceId + '/threads/')
    }

    const onClickMentions = (spaceId: string) => {
        console.log('onClickMentions', spaceId)
        navigate('/spaces/' + spaceId + '/mentions/')
    }

    const onClickChannel = (spaceId: string, channelId: string) => {
        console.log('onClickChannel', spaceId, channelId)
        navigate('/spaces/' + spaceId + '/channels/' + channelId + '/')
    }

    const onClickInvite = (invite: InviteData) => {
        if (invite.spaceParentId) {
            navigate('/spaces/' + invite.spaceParentId + '/channels/' + invite.id)
        } else {
            navigate('/spaces/' + invite.id)
        }
    }

    const onClickCreateSpace = () => {
        navigate('/spaces/new')
    }

    const onClickMe = () => {
        navigate('/')
    }

    const onClickStreams = () => {
        navigate('/streams')
    }

    const onWeb3Click = () => {
        navigate('/web3')
    }

    const onLinkedWalletsClick = () => {
        navigate('/wallet-linking')
    }

    const onLoginsClick = () => {
        navigate('/logins')
    }

    const drawer = (
        <div>
            <Toolbar />
            <Divider />
            <AppDrawerSpaces
                onClickSpace={onClickSpace}
                onClickThreads={onClickThreads}
                onClickMentions={onClickMentions}
                onClickChannel={onClickChannel}
            />
            <Divider />
            <SidebarNewItemButton label="Create A Town" onClick={onClickCreateSpace} />
            <Divider />
            <Invites title="Invites" onClickInvite={onClickInvite} />
            <SidebarItemButton label="Web 3" onClick={onWeb3Click} />
            <SidebarItemButton label="Linked Wallets" onClick={onLinkedWalletsClick} />
            <SidebarItemButton label="Logins" onClick={onLoginsClick} />
            <SidebarItemButton label="Me" onClick={onClickMe} />
            <SidebarItemButton label="Streams" onClick={onClickStreams} />
            <Divider />
            <DebugBar />
        </div>
    )

    return (
        <>
            <CssBaseline />
            <Box sx={{ display: 'flex' }}>
                <Drawer
                    open
                    variant="permanent"
                    anchor="left"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Box
                    component="main"
                    sx={{
                        alignSelf: 'right',
                        flexGrow: 1,
                        padding: '20px',
                        maxWidth: `calc(100% - ${drawerWidth}px)`, // Ensure content does not exceed the viewport width minus the drawer width
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </>
    )
}
