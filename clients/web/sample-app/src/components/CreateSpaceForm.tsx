import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Theme,
    Typography,
} from '@mui/material'
import { Address, useBalance } from 'wagmi'
import { foundry, hardhat, localhost } from 'wagmi/chains'
import {
    CreateSpaceInfo,
    Membership,
    Permission,
    RoomIdentifier,
    RoomVisibility,
    TransactionStatus,
    getMemberNftAddress,
    getPioneerNftAddress,
    useCreateSpaceTransaction,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ethers } from 'ethers'
import { MembershipRequirement, SpaceRoleSettings } from 'routes/SpaceRoleSettings'

interface Props {
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export const CreateSpaceForm = (props: Props) => {
    const { chain, accounts, provider } = useWeb3Context()
    const { chainId } = useZionClient()
    const [spaceName, setSpaceName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Private)
    const [membershipRequirement, setMembershipRequirement] = useState<MembershipRequirement>(
        MembershipRequirement.Everyone,
    )
    const {
        isLoading,
        data: roomId,
        transactionHash,
        transactionStatus,
        error,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()
    const { onClick } = props

    const disableCreateButton = useMemo(
        () => spaceName.length === 0 || isLoading,
        [isLoading, spaceName.length],
    )

    const councilNftAddress = useMemo(() => {
        if (chainId) {
            return getMemberNftAddress(chainId)
        }
    }, [chainId])

    const pioneerNftAddress = useMemo(() => {
        if (chainId) {
            return getPioneerNftAddress(chainId)
        }
    }, [chainId])

    const onChangespaceName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSpaceName(event.target.value)
    }, [])

    const onChangeMembershipRequirement = useCallback(
        (membershipRequirement: MembershipRequirement) => {
            setMembershipRequirement(membershipRequirement)
        },
        [],
    )
    const txInProgress = useRef(false)

    const onClickFundLocalHostWallet = useCallback(
        (accountId: string) => {
            if (!txInProgress.current) {
                const fundWallet = async () => {
                    try {
                        txInProgress.current = true
                        const anvilKey =
                            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // anvil default funded address #1

                        const wallet = new ethers.Wallet(anvilKey, provider)

                        const amount = 0.1

                        const tx = {
                            from: wallet.address,
                            to: accountId,
                            value: ethers.utils.parseEther(amount.toString()),
                            gasLimit: 1000000,
                            chainId: chainId,
                        }
                        console.log('fundWallet tx', tx)
                        const result = await wallet.sendTransaction(tx)
                        console.log('fundWallet result', result)
                        const receipt = await result.wait()
                        console.log('fundWallet receipt', receipt)
                    } catch (error) {
                        console.error('fundWallet failed', error)
                    } finally {
                        txInProgress.current = false
                    }
                }
                fundWallet()
            } else {
                console.log('fundWallet in progress')
            }
        },
        [chainId, provider],
    )

    const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
        setVisibility(event.target.value as RoomVisibility)
    }, [])

    const onClickCreateSpace = useCallback(async () => {
        if (!councilNftAddress) {
            console.error('Cannot create space. No council NFT address.')
            return undefined
        }
        if (!pioneerNftAddress) {
            console.error('Cannot create space. No Pioneer NFT address.')
            return undefined
        }

        let tokenAddresses: string[] = []
        let tokenGrantedPermissions: Permission[] = []
        let everyonePermissions: Permission[] = []
        switch (membershipRequirement) {
            case MembershipRequirement.Everyone:
                everyonePermissions = [Permission.Read, Permission.Write]
                break
            case MembershipRequirement.MemberNFT:
                tokenAddresses = [councilNftAddress]
                tokenGrantedPermissions = [Permission.Read, Permission.Write]
                break
            case MembershipRequirement.PioneerNFT:
                tokenAddresses = [pioneerNftAddress]
                tokenGrantedPermissions = [Permission.Read, Permission.Write]
                break
            default:
                throw new Error('Unhandled membership requirement')
        }

        const createSpaceInfo: CreateSpaceInfo = {
            name: spaceName,
            visibility,
        }
        await createSpaceTransactionWithRole(
            createSpaceInfo,
            'Member',
            tokenAddresses,
            tokenGrantedPermissions,
            everyonePermissions,
        )
    }, [
        councilNftAddress,
        pioneerNftAddress,
        membershipRequirement,
        spaceName,
        visibility,
        createSpaceTransactionWithRole,
    ])

    useEffect(() => {
        if (transactionStatus === TransactionStatus.Success && roomId) {
            onClick(roomId, Membership.Join)
        }
    }, [onClick, roomId, transactionStatus])

    console.log('CreateSpaceForm', 'states', {
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
                p: (theme: Theme) => theme.spacing(1),
            }}
        >
            <Typography noWrap variant="h6" component="div" sx={spacingStyle}>
                CREATE SPACE
            </Typography>

            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                ChainId: {chain ? chain?.id : 'Not connected'}
            </Typography>
            <Box display="grid">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Space name:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="Name of the Town"
                        variant="filled"
                        onChange={onChangespaceName}
                    />
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Visibility:
                    </Typography>
                    <Box minWidth="120px">
                        <FormControl fullWidth>
                            <InputLabel id="visibility-select-label" />
                            <Select
                                labelId="visibility-select-label"
                                id="visibility-select"
                                value={visibility}
                                onChange={onChangeVisibility}
                            >
                                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
                                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(1, 1fr)"
                    marginTop="20px"
                >
                    <SpaceRoleSettings onChangeValue={onChangeMembershipRequirement} />
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                />
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={disableCreateButton}
                        onClick={onClickCreateSpace}
                    >
                        Create
                    </Button>
                </Box>
                {(chain?.id === localhost.id ||
                    chain?.id === foundry.id ||
                    chain?.id === hardhat.id) &&
                    accounts.map((accountId) => (
                        <AccountDisplay
                            accountId={accountId}
                            key={accountId}
                            onClickFundWallet={onClickFundLocalHostWallet}
                        />
                    ))}
            </Box>
        </Box>
    )
}

const AccountDisplay = (props: {
    accountId: Address
    onClickFundWallet: (accountId: string) => void
}) => {
    const { accountId, onClickFundWallet } = props
    const balance = useBalance({ address: accountId, watch: true })
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            marginTop="20px"
            padding="10px"
            border="1px dashed grey"
        >
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                (DEBUG)
            </Typography>
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                Account: {accountId}
            </Typography>
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                balance:{' '}
                {balance.isLoading
                    ? 'loading...'
                    : balance.isError
                    ? 'Error: ' + balance.error ?? '??'
                    : balance.data?.formatted + ' : ' + balance.data?.symbol}
            </Typography>
            <Button
                variant="contained"
                color="primary"
                disabled={false}
                onClick={() => onClickFundWallet(accountId)}
            >
                Fund Wallet ({accountId})
            </Button>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}
