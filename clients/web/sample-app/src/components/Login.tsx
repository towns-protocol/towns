import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Snackbar,
    Theme,
    Typography,
} from '@mui/material'
import {
    LoginStatus,
    useMatrixStore,
    useWeb3Context,
    useZionClient,
    useZionContext,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { makeStyles } from '@mui/styles'
import {
    useAccount,
    useConnect,
    useDisconnect,
    useEnsAvatar,
    useEnsName,
    useNetwork,
    useSwitchNetwork,
} from 'wagmi'
import { useSampleAppStore } from 'store/store'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`
const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`

export function Login(): JSX.Element {
    const styles = useStyles()
    const [showError, setShowError] = useState<string | undefined>(undefined)
    const { getIsWalletRegisteredWithMatrix, loginWithWalletToMatrix, registerWalletWithMatrix } =
        useZionClient()
    const { loginStatus, loginError } = useMatrixStore()
    const { isConnected } = useWeb3Context()
    const { disconnect } = useDisconnect()

    const [walletRegistered, setWalletRegistered] = useState<boolean>(true)

    const onLoginWithWallet = useCallback(
        async function () {
            loginWithWalletToMatrix(loginMsgToSign)
        },
        [loginWithWalletToMatrix],
    )

    const onRegisterNewWallet = useCallback(
        async function () {
            registerWalletWithMatrix(registerWalletMsgToSign)
        },
        [registerWalletWithMatrix],
    )

    const onCloseAlert = useCallback(function () {
        setShowError(undefined)
    }, [])

    useEffect(() => {
        if (loginError?.message) {
            setShowError(loginError.message)
        } else {
            setShowError('')
        }
    }, [loginError])

    const registerButton = useMemo(() => {
        if (isConnected) {
            if (loginStatus === LoginStatus.Registering) {
                return <CircularProgress size={56} />
            } else if (loginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onRegisterNewWallet}
                    >
                        Register new wallet
                    </Button>
                )
            } else {
                return <div>login status: {loginStatus}</div>
            }
        }
        return undefined
    }, [isConnected, loginStatus, onRegisterNewWallet])

    const signInButton = useMemo(() => {
        if (isConnected) {
            if (loginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (loginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onLoginWithWallet}
                    >
                        Sign in with wallet
                    </Button>
                )
            } else {
                return <div>login status: {loginStatus}</div>
            }
        }
        return undefined
    }, [isConnected, loginStatus, onLoginWithWallet])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                if (loginStatus === LoginStatus.LoggedOut && isConnected) {
                    const isRegistered = await getIsWalletRegisteredWithMatrix()
                    if (!cancelled) {
                        setWalletRegistered(isRegistered)
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (reason: any) {
                if (!cancelled) {
                    setShowError(reason)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [getIsWalletRegisteredWithMatrix, loginStatus, isConnected])

    return (
        <div className={styles.container}>
            <Box sx={{ display: 'grid' }}>
                <Profile />
                <Box
                    sx={{
                        display: 'grid',
                        marginTop: '20px',
                        alignItems: 'Center',
                    }}
                >
                    {!walletRegistered && registerButton}
                    {walletRegistered && signInButton}
                </Box>
                {isConnected && (
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={() => disconnect()}
                    >
                        Disconnect Wallet
                    </Button>
                )}
            </Box>
            <Snackbar
                open={showError ? true : false}
                autoHideDuration={5000}
                onClose={onCloseAlert}
            >
                <Alert severity="error" onClose={onCloseAlert}>
                    {showError}
                </Alert>
            </Snackbar>
        </div>
    )
}

export function Profile() {
    const { homeServerUrl } = useZionContext()
    const { saveHomeServerUrl } = useSampleAppStore()
    const servers = useRef(['http://localhost:8008', 'https://node1.towns.com'])
    if (homeServerUrl && !servers.current.includes(homeServerUrl)) {
        servers.current.push(homeServerUrl)
    }

    const onChangeHomeServerUrl = useCallback(
        (event: SelectChangeEvent) => {
            saveHomeServerUrl(event.target.value as string)
            // hard reload the app, somehow the matrix client
            // hangs on to the old url in crypto, so if you sign in after
            // switching it tries to upload keys to the wrong server
            window.location.reload()
        },
        [saveHomeServerUrl],
    )

    return (
        <>
            <Box
                display="grid"
                alignItems="center"
                gridTemplateColumns="repeat(2, 1fr)"
                marginTop="20px"
            >
                <Typography noWrap variant="h6" component="div">
                    homeServer:
                </Typography>
                <Box minWidth="120px">
                    <FormControl fullWidth>
                        <InputLabel id="encrypted-select-label" />
                        <Select
                            labelId="encrypted-select-label"
                            id="encrypted-select"
                            value={homeServerUrl}
                            onChange={onChangeHomeServerUrl}
                        >
                            {servers.current.map((server) => (
                                <MenuItem key={server} value={server}>
                                    {server}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
            <ProfileContent />
        </>
    )
}

function ProfileContent() {
    const onConnnectCb = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params: { address: any; connector: any; isReconnected: any }) => {
            console.log(
                'Login.tsx::onConnected',
                params.address,
                params.connector,
                params.isReconnected,
            )
        },
        [],
    )
    const onDisconnectCb = useCallback(() => {
        console.log('Login.tsx::onDisconnected')
    }, [])
    const { address, connector, isConnected } = useAccount({
        onConnect: onConnnectCb,
        onDisconnect: onDisconnectCb,
    })
    const { chain: activeChain, chains } = useNetwork()
    const { connect, connectors, error, isLoading, pendingConnector } = useConnect()

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            console.log('switched to network', chain)
        },
    })

    const onChangeChainDropDown = useCallback(
        (event: SelectChangeEvent) => {
            switchNetwork?.(parseInt(event.target.value))
        },
        [switchNetwork],
    )

    console.log('!!Profile', {
        address,
        connector,
        isConnected,
        activeChain,
        chains,
    })

    if (isConnected) {
        return (
            <>
                {activeChain && (
                    <Box
                        display="grid"
                        alignItems="center"
                        gridTemplateColumns="repeat(2, 1fr)"
                        marginTop="20px"
                    >
                        <Typography noWrap variant="h6" component="div">
                            Chain:
                        </Typography>
                        <Box minWidth="120px">
                            <FormControl fullWidth>
                                <InputLabel id="chain-select-label" />
                                <Select
                                    labelId="chain-select-label"
                                    id="chain-select"
                                    value={activeChain.id.toString()}
                                    onChange={onChangeChainDropDown}
                                >
                                    <MenuItem key="31337" value="31337">
                                        Localhost (31337)
                                    </MenuItem>
                                    <MenuItem key="5" value="5">
                                        Goerli (5)
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                )}
                {activeChain?.id === 1 && <ENSInfo address={address} />}
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`Address: ${address}`}
                    </Typography>
                </Box>
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        Status: Connected to {connector?.name}
                    </Typography>
                </Box>
            </>
        )
    }
    return (
        <Box
            display="grid"
            alignItems="center"
            gridTemplateColumns="repeat(2, 1fr)"
            marginTop="20px"
        >
            <Typography variant="h6" component="span">
                Connect with:
            </Typography>
            {connectors.map((connector) => (
                <Button
                    variant="contained"
                    color="primary"
                    sx={{ margin: '10px' }}
                    disabled={!connector.ready}
                    key={connector.id}
                    onClick={() => connect({ connector })}
                >
                    {connector.name}
                    {!connector.ready && ' (unsupported)'}
                    {isLoading && connector.id === pendingConnector?.id && ' (connecting)'}
                </Button>
            ))}
            {error && <div>{error.message}</div>}
        </Box>
    )
}

function ENSInfo(props: { address: `0x${string}` | undefined }): JSX.Element {
    const { address } = props
    const { data: ensAvatar } = useEnsAvatar({ address })
    const { data: ensName } = useEnsName({ address })

    return (
        <>
            {ensAvatar && (
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`ENS Avatar: ${ensAvatar}`}
                    </Typography>
                </Box>
            )}
            {ensName && (
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`ENS Name: ${ensName}`}
                    </Typography>
                </Box>
            )}
        </>
    )
}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        backgroundColor: theme.palette.common.white,
        borderRadius: '25px',
        padding: theme.spacing(8),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
}))
