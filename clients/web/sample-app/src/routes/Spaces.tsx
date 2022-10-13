import { ArrowRight } from '@mui/icons-material'
import { Box, Divider, Link, Theme } from '@mui/material'
import { useCallback } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useSpaceData } from 'use-zion-client'

export const Spaces = () => {
    const { channelSlug } = useParams()
    const navigate = useNavigate()
    const space = useSpaceData()

    const onClickSpace = useCallback(() => {
        if (!space) {
            return
        }
        navigate(`/spaces/${space.id.slug}`)
    }, [navigate, space])

    // console.log("SPACE CONTENT", space?.id.matrixRoomId, channelSlug);
    if (space && channelSlug) {
        return (
            <>
                <Box
                    display="flex"
                    flexDirection="row"
                    alignItems="left"
                    sx={{
                        pl: (theme: Theme) => theme.spacing(0),
                        mb: (theme: Theme) => theme.spacing(1),
                    }}
                    onClick={onClickSpace}
                >
                    <ArrowRight />
                    <Link>{space.name}</Link>
                </Box>
                <Divider />
                <Outlet />
            </>
        )
    } else if (space) {
        return (
            <>
                <h1>{space.name}</h1>
                <h3>id: {space.id.matrixRoomId}</h3>
                <Divider />
                <Outlet />
            </>
        )
    } else {
        return <>Space not found!</>
    }
}
