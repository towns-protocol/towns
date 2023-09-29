import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    TextField,
    Theme,
    Typography,
} from '@mui/material'
import { Address, useBalance, useNetwork } from 'wagmi'
import { foundry, hardhat, localhost } from 'wagmi/chains'
import {
    CreateSpaceInfo,
    Membership,
    RoomIdentifier,
    RoomVisibility,
    SpaceProtocol,
    TransactionStatus,
    useCasablancaStore,
    useCreateSpaceTransaction,
    useMatrixStore,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import { Permission, getMemberNftAddress, getPioneerNftAddress, mintMockNFT } from '@river/web3'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { MembershipRequirement, SpaceRoleSettings } from 'routes/SpaceRoleSettings'
import { useEnvironment } from 'hooks/use-environment'
import { createTokenEntitlmentStruct } from 'utils/contractHelpers'
import { ChainSwitchingButton } from './Buttons/ChainSwitchingButton'

interface Props {
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

type FormValues = {
    spaceName: string
    price: number
    limit: number
    membershipRequirement: MembershipRequirement
    visibility: RoomVisibility
    protocol: SpaceProtocol
}

export const CreateSpaceForm = (props: Props) => {
    const { chain, accounts } = useWeb3Context()
    const { chainName, chainId } = useEnvironment()
    const { chain: walletChain } = useNetwork()
    const { loginStatus: matrixLoginStatus } = useMatrixStore()
    const { loginStatus: casablancaLoginStatus } = useCasablancaStore()
    const { blip } = useZionClient()
    const { signer } = useWeb3Context()

    const [formValue, setFormValue] = useState<FormValues>({
        spaceName: '',
        price: 0,
        limit: 1000,
        membershipRequirement: MembershipRequirement.Everyone,
        visibility: RoomVisibility.Public,
        protocol: SpaceProtocol.Casablanca,
    })

    function updateFormValue<P extends keyof FormValues>(property: P, value: FormValues[P]) {
        setFormValue((prevFormValue: FormValues) => ({
            ...prevFormValue,
            [property]: value,
        }))
    }

    function updateName(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('spaceName', event.target.value)
    }

    function updatePrice(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('price', Number(event.target.value))
    }

    function updateLimit(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('limit', Number(event.target.value))
    }

    function updateProtocol(event: SelectChangeEvent<SpaceProtocol>) {
        updateFormValue('protocol', event.target.value as SpaceProtocol)
    }

    function updateMembershipRequirement(membershipRequirement: MembershipRequirement) {
        updateFormValue('membershipRequirement', membershipRequirement)
    }

    function updateVisibility(event: SelectChangeEvent<RoomVisibility>) {
        updateFormValue('visibility', event.target.value as RoomVisibility)
    }

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
        () => formValue.spaceName.length === 0 || isLoading,
        [isLoading, formValue.spaceName.length],
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

    const onClickCreateSpace = useCallback(async () => {
        let tokenAddresses: string[] = []
        const memberPermissions: Permission[] = [Permission.Read, Permission.Write]
        // let everyonePermissions: Permission[] = []
        switch (formValue.membershipRequirement) {
            case MembershipRequirement.Everyone:
                break
            case MembershipRequirement.MemberNFT:
                if (!councilNftAddress) {
                    console.error('Cannot create space. No council NFT address.')
                    return undefined
                }
                tokenAddresses = [councilNftAddress]
                break
            case MembershipRequirement.PioneerNFT:
                if (!pioneerNftAddress) {
                    console.error('Cannot create space. No Pioneer NFT address.')
                    return undefined
                }
                tokenAddresses = [pioneerNftAddress]
                break
            default:
                throw new Error('Unhandled membership requirement')
        }

        const createSpaceInfo: CreateSpaceInfo = {
            name: formValue.spaceName,
            visibility: formValue.visibility,
            spaceProtocol: formValue.protocol,
        }
        if (!signer) {
            console.error('Cannot create space. No signer.')
            return undefined
        }
        const requirements = {
            name: 'Member',
            price: formValue.price,
            limit: formValue.limit,
            currency: ethers.constants.AddressZero,
            feeRecipient: await signer.getAddress(),
            permissions: memberPermissions,
            requirements: {
                everyone: tokenAddresses.length === 0,
                tokens: tokenAddresses.map((addr) =>
                    createTokenEntitlmentStruct({ contractAddress: addr }),
                ),
                users: [],
            },
        }

        await createSpaceTransactionWithRole(createSpaceInfo, requirements)
    }, [formValue, signer, createSpaceTransactionWithRole, councilNftAddress, pioneerNftAddress])

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
        chainId,
        councilNftAddress,
        pioneerNftAddress,
        MembershipRequirement,
    })

    const onBlipSync = useCallback(() => {
        blip()
    }, [blip])

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
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                App/Wallet Chain: {chainName} ({chainId}) /{' '}
                {walletChain ? `${walletChain.name} (${walletChain.id})` : 'Not connected'}
            </Typography>
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                Casablanca: {casablancaLoginStatus}
            </Typography>
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                Matrix: {matrixLoginStatus}
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
                        defaultValue={formValue.spaceName}
                        onChange={updateName}
                    />
                </Box>

                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Price:
                    </Typography>
                    <TextField
                        id="price-to-mint"
                        label="Price to Mint"
                        variant="filled"
                        defaultValue={formValue.price}
                        onChange={updatePrice}
                    />
                </Box>

                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Limit:
                    </Typography>
                    <TextField
                        id="limit"
                        label="Limit"
                        variant="filled"
                        defaultValue={formValue.limit}
                        onChange={updateLimit}
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
                                value={formValue.visibility}
                                onChange={updateVisibility}
                            >
                                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
                                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Protocol:
                    </Typography>
                    <Box minWidth="120px">
                        <FormControl fullWidth>
                            <InputLabel id="protocol-select-label" />
                            <Select
                                labelId="protocol-select-label"
                                id="protocol-select"
                                value={formValue.protocol}
                                onChange={updateProtocol}
                            >
                                <MenuItem value={SpaceProtocol.Matrix}>Matrix</MenuItem>
                                <MenuItem value={SpaceProtocol.Casablanca}>Casablanca</MenuItem>
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
                    <SpaceRoleSettings onChangeValue={updateMembershipRequirement} />
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                />
                <Box display="flex" flexDirection="column" alignItems="center">
                    <ChainSwitchingButton
                        variant="contained"
                        color="primary"
                        disabled={disableCreateButton}
                        onClick={onClickCreateSpace}
                    >
                        Create
                    </ChainSwitchingButton>
                </Box>
                {(chain?.id === localhost.id ||
                    chain?.id === foundry.id ||
                    chain?.id === hardhat.id) &&
                    accounts.map((accountId) => (
                        <LocalhostWalletInfo accountId={accountId} key={accountId} />
                    ))}
                {(chain?.id === localhost.id ||
                    chain?.id === foundry.id ||
                    chain?.id === hardhat.id) && (
                    <Box
                        display="grid"
                        flexDirection="column"
                        alignItems="center"
                        marginTop="20px"
                        padding="20px"
                    >
                        <Button variant="contained" color="primary" onClick={onBlipSync}>
                            River Debug, Tirgger Blip Sync
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

const LocalhostWalletInfo = (props: { accountId: Address }) => {
    const { provider } = useWeb3Context()
    const { chainId } = useEnvironment()
    const { accountId } = props
    const balance = useBalance({
        address: accountId,
        watch: true,
        onError: (error) => {
            console.log('Error', error)
        },
    })
    const txInProgress = useRef(false)

    const onClickFundWallet = useCallback(
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
                        if (chainId === 31337 && provider) {
                            // only support localhost anvil testing
                            const mintTx = await mintMockNFT(chainId, provider, wallet, accountId)
                            await mintTx.wait()
                            console.log('fundWallet minted MockNFT', { walletAddress: accountId })
                        }
                    } catch (error) {
                        console.error('fundWallet failed', error)
                    } finally {
                        txInProgress.current = false
                        balance.refetch()
                    }
                }
                fundWallet()
            } else {
                console.log('fundWallet in progress')
            }
        },
        [balance, chainId, provider],
    )

    return (
        <Box display="grid" flexDirection="column" alignItems="center" marginTop="20px">
            <Chip
                label="DEBUG"
                sx={{
                    borderRadius: 0,
                }}
            />
            <Paper elevation={3} sx={{ padding: '20px' }}>
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
            </Paper>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}
