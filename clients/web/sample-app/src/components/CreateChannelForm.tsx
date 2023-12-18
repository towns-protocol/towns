import { Box, TextField, Theme, Typography } from '@mui/material'
import {
    CreateChannelInfo,
    Membership,
    RoomIdentifier,
    TransactionStatus,
    useCreateChannelTransaction,
    useRoles,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BigNumber } from 'ethers'
import { useGetEmbeddedSigner } from '@towns/privy'
import { ChannelRoleSettings, RolesSettings } from 'routes/ChannelRoleSettings'

import { useAsyncButtonCallback } from '../hooks/use-async-button-callback'
import { ChainSwitchingButton } from './Buttons/ChainSwitchingButton'

interface Props {
    parentSpaceId: RoomIdentifier
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export function CreateChannelForm(props: Props): JSX.Element {
    const [channelName, setChannelName] = useState<string>('')
    const [roles, setRoles] = useState<RolesSettings>({})
    const { spaceRoles } = useRoles(props.parentSpaceId.streamId)
    const { onClick, parentSpaceId } = props
    const {
        isLoading,
        data: roomId,
        transactionHash,
        transactionStatus,
        error,
        createChannelTransaction,
    } = useCreateChannelTransaction()

    const disableCreateButton = useMemo(() => channelName.length === 0, [channelName.length])

    const onChangeChannelName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setChannelName(event.target.value)
    }, [])

    const onChangeRoles = useCallback((roles: RolesSettings) => {
        setRoles(roles)
    }, [])

    const getSigner = useGetEmbeddedSigner()

    const onClickCreateChannel = useAsyncButtonCallback(async () => {
        const signer = await getSigner()
        if (!signer) {
            console.error('No signer')
            return
        }
        const createRoomInfo: CreateChannelInfo = {
            name: channelName,
            parentSpaceId: parentSpaceId,
            roleIds: [],
        }

        // Use the roles from the parent space to create the channel
        if (spaceRoles) {
            for (const r of spaceRoles) {
                if (roles[r.name]?.isSelected) {
                    console.log(`Adding role ${r.name} to channel`)
                    createRoomInfo.roleIds.push(BigNumber.from(r.roleId).toNumber())
                }
            }
        }

        await createChannelTransaction(createRoomInfo, signer)
    }, [createChannelTransaction, onClick, parentSpaceId, channelName])

    useEffect(() => {
        if (transactionStatus === TransactionStatus.Success && roomId) {
            onClick(roomId, Membership.Join)
        }
    }, [onClick, roomId, transactionStatus])

    console.log('CreateChannelForm', 'states', {
        isLoading,
        roomId,
        error,
        transactionHash,
        transactionStatus,
    })

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{
                p: (theme: Theme) => theme.spacing(8),
            }}
        >
            <Typography noWrap variant="h6" component="div" sx={spacingStyle}>
                CREATE CHANNEL
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Channel name:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="Name of the channel"
                        variant="filled"
                        onChange={onChangeChannelName}
                    />
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(1, 1fr)"
                    marginTop="20px"
                >
                    <ChannelRoleSettings
                        spaceId={parentSpaceId.streamId}
                        onChangeValue={onChangeRoles}
                    />
                </Box>
                <Box />
                <Box display="flex" flexDirection="column" alignItems="center">
                    <ChainSwitchingButton
                        variant="contained"
                        color="primary"
                        disabled={disableCreateButton}
                        onClick={onClickCreateChannel}
                    >
                        Create
                    </ChainSwitchingButton>
                </Box>
            </Box>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
