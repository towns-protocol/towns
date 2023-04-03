import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Snackbar,
    Theme,
    Typography,
} from '@mui/material'
import {
    LoginStatus,
    useCasablancaStore,
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
    const { getIsWalletRegisteredWithMatrix } = useZionClient()
    const { loginStatus: matrixLoginStatus, loginError: matrixLoginError } = useMatrixStore()
    const { loginError: casablancaLoginError } = useCasablancaStore()
    const { isConnected } = useWeb3Context()
    const [walletRegisteredWithMatrix, setWalletRegisteredWithMatrix] = useState<boolean>(false)

    const onCloseAlert = useCallback(function () {
        setShowError(undefined)
    }, [])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                if (matrixLoginStatus === LoginStatus.LoggedOut && isConnected) {
                    const isRegistered = await getIsWalletRegisteredWithMatrix()
                    if (!cancelled) {
                        setWalletRegisteredWithMatrix(isRegistered)
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
    }, [getIsWalletRegisteredWithMatrix, matrixLoginStatus, isConnected])

    useEffect(() => {
        if (matrixLoginError?.message) {
            setShowError(matrixLoginError.message)
        } else if (casablancaLoginError?.message) {
            setShowError(casablancaLoginError.message)
        } else {
            setShowError('')
        }
    }, [casablancaLoginError, matrixLoginError])

    return (
        <div className={styles.container}>
            <Box sx={{ display: 'grid' }}>
                <HomeServerSelection />
                <WalletInfo />
                {isConnected && (
                    <NetworkInfo walletRegisteredWithMatrix={walletRegisteredWithMatrix} />
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

function NetworkInfo(props: { walletRegisteredWithMatrix: boolean }) {
    const { walletRegisteredWithMatrix } = props
    const { isConnected } = useWeb3Context()
    const { loginWithWalletToMatrix, registerWalletWithMatrix, loginWithWalletToCasablanca } =
        useZionClient()
    const { loginStatus: matrixLoginStatus } = useMatrixStore()
    const { loginStatus: casablancaLoginStatus } = useCasablancaStore()

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

    const onLoginCasablanca = useCallback(
        async function () {
            loginWithWalletToCasablanca(loginMsgToSign)
        },
        [loginWithWalletToCasablanca],
    )

    const registerButton = useMemo(() => {
        if (isConnected) {
            if (matrixLoginStatus === LoginStatus.Registering) {
                return <CircularProgress size={56} />
            } else if (matrixLoginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onRegisterNewWallet}
                    >
                        Register new wallet (matrix)
                    </Button>
                )
            } else {
                return (
                    <Typography variant="h6" component="span">
                        Matrix Login Status: {matrixLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [isConnected, matrixLoginStatus, onRegisterNewWallet])

    const casablancaButton = useMemo(() => {
        if (isConnected) {
            if (casablancaLoginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (casablancaLoginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onLoginCasablanca}
                    >
                        Login (casablanca)
                    </Button>
                )
            } else {
                return (
                    <Typography variant="h6" component="span">
                        Casablanca Login Status: {casablancaLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [casablancaLoginStatus, isConnected, onLoginCasablanca])

    const signInButton = useMemo(() => {
        if (isConnected) {
            if (matrixLoginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (matrixLoginStatus === LoginStatus.LoggedOut) {
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
                return (
                    <Typography variant="h6" component="span">
                        Matrix Login Status: {matrixLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [isConnected, matrixLoginStatus, onLoginWithWallet])

    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    marginTop: '20px',
                    alignItems: 'Center',
                }}
            >
                <Chip
                    label="Matrix"
                    sx={{
                        borderRadius: 0,
                    }}
                />
                <Paper elevation={3} sx={{ padding: '20px' }}>
                    {!walletRegisteredWithMatrix && registerButton}
                    {walletRegisteredWithMatrix && signInButton}
                </Paper>
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    marginTop: '20px',
                    alignItems: 'Center',
                }}
            >
                <Chip
                    label="Casablanca"
                    sx={{
                        borderRadius: 0,
                    }}
                />
                <Paper elevation={3} sx={{ padding: '20px' }}>
                    {casablancaButton}
                </Paper>
            </Box>
        </>
    )
}

function HomeServerSelection() {
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
        </>
    )
}

function WalletInfo() {
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
    const { disconnect } = useDisconnect()

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

    const myChains = [
        {
            id: 31337,
            name: 'localhost',
        },
        {
            id: 5,
            name: 'goerli',
        },
        {
            id: 11155111,
            name: 'sepolia',
        },
    ]

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
                                    {myChains.map((chain) => (
                                        <MenuItem
                                            key={chain.id.toString()}
                                            value={chain.id.toString()}
                                        >
                                            {chain.name} ({chain.id.toString()})
                                        </MenuItem>
                                    ))}
                                    {chains.find((chain) => chain.id === activeChain.id) ===
                                        undefined && (
                                        <MenuItem
                                            key={activeChain.id.toString()}
                                            value={activeChain.id.toString()}
                                        >
                                            {activeChain.name} ({activeChain.id.toString()})
                                        </MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                )}
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Chip
                        label="Wallet"
                        sx={{
                            borderRadius: 0,
                        }}
                    />

                    <Paper elevation={3} sx={{ padding: '20px' }}>
                        {activeChain?.id === 1 && <ENSInfo address={address} />}

                        <Typography variant="h6" component="p">
                            {`Address: ${address}`}
                        </Typography>

                        <Typography variant="h6" component="p" sx={{ marginTop: '20px' }}>
                            Wallet Status: Connected to {connector?.name}
                        </Typography>

                        <Button
                            variant="outlined"
                            color="primary"
                            sx={{ margin: '20px' }}
                            onClick={() => disconnect()}
                        >
                            Disconnect Wallet
                        </Button>
                    </Paper>
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
