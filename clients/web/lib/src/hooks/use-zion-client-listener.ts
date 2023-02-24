import { MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { isMatrixError } from './use-zion-client'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { useSigner } from 'wagmi'
import { useWeb3Context } from '../components/Web3ContextProvider'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider, chain } = useWeb3Context()
    const { setLoginStatus } = useMatrixStore()
    const { matrixCredentialsMap, setMatrixCredentials } = useCredentialStore()
    const matrixCredentials = matrixCredentialsMap[opts.matrixServerUrl]
    const [clientRef, setClientRef] = useState<ZionClient>()
    const clientSingleton = useRef<ZionClient>()
    const chainId = chain?.id
    const { data: wagmiSigner } = useSigner()

    const { userId, accessToken, deviceId } = useMemo(() => {
        return {
            accessToken: matrixCredentials?.accessToken,
            userId: matrixCredentials?.userId,
            deviceId: matrixCredentials?.deviceId,
        }
    }, [matrixCredentials?.accessToken, matrixCredentials?.deviceId, matrixCredentials?.userId])

    if (!clientSingleton.current) {
        const _signer = opts.web3Signer || wagmiSigner
        const _provider = opts.web3Provider || provider
        if (_signer) {
            clientSingleton.current = new ZionClient(
                {
                    ...opts,
                    web3Provider: _provider,
                    web3Signer: _signer,
                },
                chainId,
            )
        }
    }

    const startClient = useCallback(async () => {
        if (!clientSingleton.current || !accessToken || !userId || !deviceId || !chainId) {
            console.error(
                'Matrix client listener not started: clientSingleton.current, chainId, accessToken, userId, or deviceId is undefined.',
            )
            setClientRef(undefined)
            return
        }
        // in the standard flow we should already be logged in, but if we're loading
        // credentials from local host, this aligns the login status with the credentials
        setLoginStatus(LoginStatus.LoggedIn)
        const client = clientSingleton.current
        // make sure we're not re-starting the client
        if (client.auth?.accessToken === accessToken) {
            if (client.chainId != chainId) {
                console.warn("ChainId changed, we're not handling this yet")
            } else {
                console.warn('startClient: called again with same access token')
            }
            return
        }
        console.log('******* start client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setClientRef(undefined)
        // start it up!
        try {
            await startMatrixClientWithRetries({
                client,
                chainId,
                userId,
                deviceId,
                accessToken,
            })
            setClientRef(client)
            console.log('******* Matrix client listener started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logout()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setLoginStatus(LoginStatus.LoggedOut)
            setMatrixCredentials(opts.matrixServerUrl, null)
        }
    }, [
        accessToken,
        chainId,
        deviceId,
        opts.matrixServerUrl,
        setLoginStatus,
        setMatrixCredentials,
        userId,
    ])

    useEffect(() => {
        void (async () => await startClient())()
    }, [startClient])

    return {
        client: clientRef,
        clientSingleton: clientSingleton.current,
    }
}

async function startMatrixClientWithRetries(args: {
    client: ZionClient
    chainId: number
    userId: string
    accessToken: string
    deviceId: string
}): Promise<void> {
    const dummyMatrixEvent = new MatrixEvent()
    let retryCount = 0
    let isSuccess = false
    while (!isSuccess) {
        try {
            await args.client.startMatrixClient(
                {
                    userId: args.userId,
                    accessToken: args.accessToken,
                    deviceId: args.deviceId,
                },
                args.chainId,
            )
            if (retryCount > 0) {
                console.log(`startMatrixClientWithRetries succeeded after ${retryCount} retries`)
            }
            // succeeded, return
            isSuccess = true
        } catch (err) {
            if (isMatrixError(err)) {
                const retryDelay = MatrixScheduler.RETRY_BACKOFF_RATELIMIT(
                    dummyMatrixEvent,
                    retryCount,
                    err,
                )
                if (retryDelay >= 0) {
                    console.log(`MatrixError`, { retryDelay, err })
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                    retryCount++
                    continue
                }
                console.log(`MatrixError reached limit, giving up`, retryCount, retryDelay, err)
            } else {
                // Not a MatrixError, just give up
                console.error('Not a MatrixError', err)
                throw err
            }
        }
    }
}
