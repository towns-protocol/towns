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
import {
    CreateSpaceInfo,
    Membership,
    RoomIdentifier,
    RoomVisibility,
    useIntegratedSpaceManagement,
    useWeb3Context,
} from 'use-zion-client'
import { useCallback, useMemo, useState } from 'react'
import { chain as ChainType, useBalance } from 'wagmi'
import { useAsyncButtonCallback } from '../hooks/use-async-button-callback'
import { ethers } from 'ethers'

interface Props {
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export const CreateSpaceForm = (props: Props) => {
    const { chain, accounts, getProvider } = useWeb3Context()
    const [spaceName, setSpaceName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Private)
    const { createSpaceWithZionTokenEntitlement } = useIntegratedSpaceManagement()
    const { onClick } = props

    const disableCreateButton = useMemo(() => spaceName.length === 0, [spaceName.length])

    const onChangespaceName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSpaceName(event.target.value)
    }, [])

    const onClickFundLocalHostWallet = useCallback(
        (accountId: string) => {
            const afunc = async () => {
                const privateKey =
                    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // anvil default funded address #1
                const provider = getProvider()
                const chainId = (await provider?.getNetwork())?.chainId
                const wallet = new ethers.Wallet(privateKey, provider)
                const amount = 0.1
                const tx = {
                    from: wallet.address,
                    to: accountId,
                    value: ethers.utils.parseEther(amount.toString()),
                    gasLimit: 1000000,
                    chainId: chainId,
                }
                console.log('tx', tx)
                const result = await wallet.sendTransaction(tx)
                console.log(result)
            }
            void afunc()
        },
        [getProvider],
    )

    const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
        setVisibility(event.target.value as RoomVisibility)
    }, [])

    const onClickCreateSpace = useAsyncButtonCallback(async () => {
        const createSpaceInfo: CreateSpaceInfo = {
            name: spaceName,
            visibility,
        }
        const roomId = await createSpaceWithZionTokenEntitlement(createSpaceInfo)
        if (roomId) {
            onClick(roomId, Membership.Join)
        }
    }, [spaceName, visibility])

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
            <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
                CREATE SPACE
            </Typography>

            <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                ChainId: {chain ? chain?.id : 'Not connected'}
            </Typography>
            <Box display="grid">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                        Space name:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="Name of the space"
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
                    <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                        Visibility:
                    </Typography>
                    <Box minWidth="120px">
                        <FormControl fullWidth>
                            <InputLabel id="visibility-select-label"></InputLabel>
                            <Select
                                labelId="visibility-select-label"
                                id="visibility-select"
                                value={visibility}
                                onChange={onChangeVisibility}
                            >
                                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                ></Box>
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onClickCreateSpace}
                        disabled={disableCreateButton}
                    >
                        Create
                    </Button>
                </Box>
                {(chain?.id === ChainType.localhost.id ||
                    chain?.id === ChainType.foundry.id ||
                    chain?.id === ChainType.hardhat.id) &&
                    accounts.map((accountId) => (
                        <AccountDisplay
                            accountId={accountId}
                            onClickFundWallet={onClickFundLocalHostWallet}
                            key={accountId}
                        />
                    ))}
            </Box>
        </Box>
    )
}

const AccountDisplay = (props: {
    accountId: string
    onClickFundWallet: (accountId: string) => void
}) => {
    const { accountId, onClickFundWallet } = props
    const balance = useBalance({ addressOrName: accountId, watch: true })
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            marginTop="20px"
            padding="10px"
            border="1px dashed grey"
        >
            <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                (DEBUG)
            </Typography>
            <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                Account: {accountId}
            </Typography>
            <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
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
                onClick={() => onClickFundWallet(accountId)}
                disabled={false}
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
