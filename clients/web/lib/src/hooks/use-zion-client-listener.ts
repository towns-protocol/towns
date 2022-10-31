import { useCallback, useEffect, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { ZionClient } from '../client/ZionClient'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { ZionOnboardingOpts } from 'client/ZionClientTypes'
import { LoginStatus } from './login'

export const useZionClientListener = (
    matrixServerUrl: string,
    initialSyncLimit: number,
    onboardingOpts?: ZionOnboardingOpts,
    disableEncryption?: boolean,
    signer?: ethers.Signer,
) => {
    const { provider, chain } = useWeb3Context()
    const { deviceId, isAuthenticated, userId, setLoginStatus } = useMatrixStore()
    const { accessToken, setAccessToken } = useCredentialStore()
    const [clientRef, setClientRef] = useState<ZionClient>()
    const clientSingleton = useRef<ZionClient>()
    const chainId = chain?.id

    if (!clientSingleton.current) {
        clientSingleton.current = new ZionClient(
            {
                matrixServerUrl,
                initialSyncLimit,
                onboardingOpts,
                disableEncryption,
                web3Provider: provider,
                web3Signer: signer ?? provider?.getSigner(),
            },
            chainId,
        )
    }

    const startClient = useCallback(async () => {
        if (!accessToken || !userId || !deviceId) {
            console.error('startClient: accessToken, userId, or deviceId is undefined')
            return
        }
        if (!chainId) {
            console.error('startClient: chainId is undefined')
            return
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const client = clientSingleton.current!
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
        try {
            await client.startClient({ userId, accessToken, deviceId }, chainId)
            setClientRef(client)
            console.log('******* client started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logout()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setLoginStatus(LoginStatus.LoggedOut)
            setAccessToken('')
        }
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
    }, [accessToken, chainId, deviceId, setAccessToken, setLoginStatus, userId])

    useEffect(() => {
        if (isAuthenticated) {
            void (async () => await startClient())()
            console.log(`Matrix client listener started`)
        } else {
            setClientRef(undefined)
            console.log('Matrix client listener stopped')
        }
    }, [isAuthenticated, startClient])

    return {
        client: clientRef,
    }
}
