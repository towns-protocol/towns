import { Button, Divider, Theme, Typography } from '@mui/material'
import { useGetEmbeddedSigner } from '@towns/privy'
import React, { useCallback } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
    useSpaceContext,
    useSpaceData,
    useSpaceFromContract,
    useTownsClient,
} from 'use-towns-client'

export const Spaces = () => {
    const { channelSlug } = useParams()
    const { joinTown } = useTownsClient()
    const { spaceId } = useSpaceContext()
    const space = useSpaceData()
    const getSigner = useGetEmbeddedSigner()

    const onClickJoinSpace = useCallback(async () => {
        const signer = await getSigner()
        if (spaceId && signer) {
            await joinTown(spaceId, signer)
        } else {
            console.error('No spaceId')
        }
    }, [joinTown, getSigner, spaceId])

    // console.log("SPACE CONTENT", space?.id.networkId, channelSlug);
    if (space && channelSlug) {
        return (
            <>
                <Divider />
                <Outlet />
            </>
        )
    } else if (space) {
        return (
            <>
                <h1>{space.name}</h1>
                <h3>id: {space.id}</h3>
                <Divider />
                <Outlet />
            </>
        )
    } else if (spaceId) {
        return (
            <>
                <h1>Unknown space Id</h1>
                <h3>id: {spaceId}</h3>
                <Divider />
                <MissingSpaceInfo spaceId={spaceId} onJoinRoom={onClickJoinSpace} />
            </>
        )
    } else {
        return <>No Space id!</>
    }
}

const MissingSpaceInfo = (props: { spaceId: string; onJoinRoom: () => void }) => {
    const { space: spaceOnChainInfo } = useSpaceFromContract(props.spaceId)
    return spaceOnChainInfo ? (
        <>
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                onchain space networkId: {spaceOnChainInfo.networkId}
            </Typography>
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                onchain spaceName: {spaceOnChainInfo.name}
            </Typography>
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                onchain space owner: {spaceOnChainInfo.owner}
            </Typography>
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                onchain space disabled: {spaceOnChainInfo.disabled}
            </Typography>
            <Button variant="contained" onClick={props.onJoinRoom}>
                Join Room
            </Button>
        </>
    ) : (
        <>
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                We don&apos;t have any information for this room, would you like to attempt to join?
            </Typography>
            <Button variant="contained" onClick={props.onJoinRoom}>
                Join Room
            </Button>
        </>
    )
}

const messageStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}
