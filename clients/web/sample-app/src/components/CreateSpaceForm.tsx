import { Box, Button, Chip, Paper, TextField, Theme, Typography } from '@mui/material'
import { Address, useBalance, useNetwork } from 'wagmi'
import { foundry, hardhat, localhost } from 'wagmi/chains'
import {
    CreateSpaceInfo,
    Membership,
    TransactionStatus,
    getDynamicPricingModule,
    useCasablancaStore,
    useConnectivity,
    useCreateSpaceTransaction,
    useTownsClient,
    useTownsContext,
} from 'use-towns-client'
import {
    MembershipStruct,
    NoopRuleData,
    Permission,
    getTestGatingNFTContractAddress,
    mintMockNFT,
} from '@river-build/web3'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { useGetEmbeddedSigner } from '@towns/privy'
import { MembershipRequirement, SpaceRoleSettings } from 'routes/SpaceRoleSettings'
import { ChainSwitchingButton } from './Buttons/ChainSwitchingButton'

interface Props {
    onClick: (roomId: string, membership: Membership) => void
}

type FormValues = {
    spaceName: string
    price: number
    limit: number
    membershipRequirement: MembershipRequirement
}

export const CreateSpaceForm = (props: Props) => {
    const { baseChain: chain } = useTownsContext()
    const chainId = chain.id
    const chainName = chain.name
    const { loggedInWalletAddress } = useConnectivity()
    const { chain: walletChain } = useNetwork()
    const { authStatus: casablancaAuthStatus } = useCasablancaStore()
    const { spaceDapp } = useTownsClient()
    const getSigner = useGetEmbeddedSigner()

    const [formValue, setFormValue] = useState<FormValues>({
        spaceName: '',
        price: 0,
        limit: 1000,
        membershipRequirement: MembershipRequirement.Everyone,
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

    function updateMembershipRequirement(membershipRequirement: MembershipRequirement) {
        updateFormValue('membershipRequirement', membershipRequirement)
    }

    const {
        isLoading,
        data: txData,
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

    const [councilNftAddress, setCouncilNftAddress] = useState<`0x${string}`>()

    useEffect(() => {
        let cancel = false

        ;(async () => {
            if (!cancel) {
                try {
                    const address = await getTestGatingNFTContractAddress()
                    if (!cancel) {
                        setCouncilNftAddress(address)
                    }
                } catch (error) {
                    if (!cancel) {
                        console.error('Error fetching data:', error)
                    }
                }
            }
        })()

        return () => {
            cancel = true
        }
    }, [])

    const onClickCreateSpace = useCallback(async () => {
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
                break
            default:
                throw new Error('Unhandled membership requirement')
        }

        const createSpaceInfo: CreateSpaceInfo = {
            name: formValue.spaceName,
        }
        const signer = await getSigner()

        if (!signer) {
            console.error('Cannot create space. No signer.')
            return undefined
        }
        if (!spaceDapp) {
            console.error('Cannot create space. No spaceDapp.')
            return undefined
        }
        const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)

        const requirements: MembershipStruct = {
            settings: {
                name: 'Member',
                symbol: 'MEMBER',
                price: formValue.price,
                maxSupply: formValue.limit,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule.module,
            },
            permissions: memberPermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
            },
        }

        await createSpaceTransactionWithRole(createSpaceInfo, requirements, signer)
    }, [
        formValue.membershipRequirement,
        formValue.spaceName,
        formValue.price,
        formValue.limit,
        getSigner,
        spaceDapp,
        createSpaceTransactionWithRole,
        councilNftAddress,
    ])

    useEffect(() => {
        if (transactionStatus === TransactionStatus.Success && txData && txData.spaceId) {
            onClick(txData.spaceId, Membership.Join)
        }
    }, [onClick, txData, transactionStatus])

    console.log('CreateSpaceForm', 'states', {
        isLoading,
        roomId: txData,
        error,
        transactionHash,
        transactionStatus,
        chainId,
        councilNftAddress,
        MembershipRequirement,
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
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                App/Wallet Chain: {chainName} ({chainId}) /{' '}
                {walletChain ? `${walletChain.name} (${walletChain.id})` : 'Not connected'}
            </Typography>
            <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                Casablanca: {casablancaAuthStatus}
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
                    loggedInWalletAddress && (
                        <LocalhostWalletInfo accountId={loggedInWalletAddress} />
                    )}
            </Box>
        </Box>
    )
}

const LocalhostWalletInfo = (props: { accountId: Address }) => {
    const { baseProvider: provider, baseChain: chain, baseConfig: config } = useTownsContext()
    const chainId = chain.id
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
                            const mintTx = await mintMockNFT(provider, config, wallet, accountId)
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
        [balance, chainId, config, provider],
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
