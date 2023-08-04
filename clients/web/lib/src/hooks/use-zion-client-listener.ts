import { useCallback, useEffect, useRef, useState } from 'react'
import { MatrixClient, MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { bin_fromHexString, Client as CasablancaClient, SignerContext } from '@river/sdk'
import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { isMatrixError } from './use-zion-client'
import { MatrixCredentials, useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider } = useWeb3Context()
    const { setLoginStatus: setMatrixLoginStatus } = useMatrixStore()
    const { setLoginStatus: setCasablancaLoginStatus } = useCasablancaStore()
    const {
        matrixCredentialsMap,
        setMatrixCredentials,
        casablancaCredentialsMap,
        setCasablancaCredentials,
    } = useCredentialStore()
    const matrixCredentials = matrixCredentialsMap[opts.matrixServerUrl]
    const casablancaCredentials = casablancaCredentialsMap[opts.casablancaServerUrl ?? '']
    const [matrixClient, setMatrixClient] = useState<MatrixClient>()
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const clientSingleton = useRef<ZionClient>()

    if (!clientSingleton.current) {
        clientSingleton.current = new ZionClient({
            ...opts,
            web3Provider: provider,
        })
    }

    const startMatrixClient = useCallback(async () => {
        if (!clientSingleton.current || !matrixCredentials) {
            console.log(
                'Matrix client listener not started: clientSingleton.current, chainId, accessToken, userId, or deviceId is undefined.',
                {
                    singleton: clientSingleton.current !== undefined,
                    matrixCredentials: matrixCredentials !== null,
                },
            )
            setMatrixClient(undefined)
            return
        }
        // in the standard flow we should already be logged in, but if we're loading
        // credentials from local host, this aligns the login status with the credentials
        setMatrixLoginStatus(LoginStatus.LoggedIn)
        const client = clientSingleton.current
        // make sure we're not re-starting the client
        if (client.auth?.accessToken === matrixCredentials.accessToken) {
            console.log('startMatrixClient: called again with same access token')
            return
        }
        console.log('******* start client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setMatrixClient(undefined)
        // start it up!
        try {
            const matrixClient = await startMatrixClientWithRetries(client, matrixCredentials)
            setMatrixClient(matrixClient)
            console.log('******* Matrix client listener started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logoutFromMatrix()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setMatrixLoginStatus(LoginStatus.LoggedOut)
            setMatrixCredentials(opts.matrixServerUrl, null)
        }
    }, [matrixCredentials, opts.matrixServerUrl, setMatrixLoginStatus, setMatrixCredentials])

    const startCasablancaClient = useCallback(async () => {
        if (!clientSingleton.current || !casablancaCredentials) {
            console.log('casablanca client listener not yet started:', {
                singleton: clientSingleton.current !== undefined,
                casablancaCredentials: casablancaCredentials !== null,
            })
            setCasablancaClient(undefined)
            return
        }

        const client = clientSingleton.current
        const pk = casablancaCredentials.privateKey.slice(2)
        if (pk === client.signerContext?.signerPrivateKey()) {
            console.log('startCasablancaClient: called again with same access token')
            return
        }
        console.log('******* start casablanca client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setCasablancaClient(undefined)
        // start it up!
        // TODO(HNT-1380): transition to final signing model
        try {
            const context: SignerContext = {
                signerPrivateKey: () => pk,
                creatorAddress: bin_fromHexString(casablancaCredentials.creatorAddress),
                delegateSig: casablancaCredentials.delegateSig
                    ? bin_fromHexString(casablancaCredentials.delegateSig)
                    : undefined,
                deviceId: casablancaCredentials.deviceId,
            }
            const casablancaClient = await client.startCasablancaClient(context)
            setCasablancaClient(casablancaClient)
            setCasablancaLoginStatus(LoginStatus.LoggedIn)
            console.log('******* Casablanca client listener started *******')
        } catch (e) {
            console.log('******* casablanca client encountered exception *******', e)
            try {
                await client.logoutFromCasablanca()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setCasablancaLoginStatus(LoginStatus.LoggedOut)
            setCasablancaCredentials(opts.casablancaServerUrl ?? '', null)
        }
    }, [
        casablancaCredentials,
        opts.casablancaServerUrl,
        setCasablancaCredentials,
        setCasablancaLoginStatus,
    ])

    useEffect(() => {
        void (async () => await startMatrixClient())()
    }, [startMatrixClient])

    useEffect(() => {
        void (async () => await startCasablancaClient())()
    }, [startCasablancaClient])

    return {
        client: matrixClient || casablancaClient ? clientSingleton.current : undefined,
        clientSingleton: clientSingleton.current,
        matrixClient,
        casablancaClient,
    }
}

async function startMatrixClientWithRetries(
    client: ZionClient,
    matrixCredentials: MatrixCredentials,
): Promise<MatrixClient | undefined> {
    const dummyMatrixEvent = new MatrixEvent()
    let retryCount = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const matrixClient = await client.startMatrixClient({
                userId: matrixCredentials.userId,
                accessToken: matrixCredentials.accessToken,
                deviceId: matrixCredentials.deviceId,
            })
            if (retryCount > 0) {
                console.log(`startMatrixClientWithRetries succeeded after ${retryCount} retries`)
            }
            // succeeded, return
            return matrixClient
        } catch (err) {
            if (isMatrixError(err)) {
                const retryDelay = MatrixScheduler.RETRY_BACKOFF_RATELIMIT(
                    dummyMatrixEvent,
                    Math.max(retryCount, 4), // don't ever want to bail if this is a legit error, signing out will clear the cache
                    err,
                )
                console.log(`MatrixError`, {
                    retryDelay,
                    retryCount,
                    code: err.errcode,
                    data: err.data,
                    err,
                })
                if (retryDelay >= 0) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                    retryCount++
                    console.log('Retrying startMatrixClientWithRetries after delay: ', {
                        retryDelay,
                        retryCount,
                    })
                } else {
                    throw err
                }
            } else {
                // Not a MatrixError, just give up
                console.error('Not a retryable startup error', err)
                throw err
            }
        }
    }
}
