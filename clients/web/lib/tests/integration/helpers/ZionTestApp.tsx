/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react'
import { useConnect } from 'wagmi'
import { ZionOnboardingOpts, SpaceProtocol } from '../../../src/client/ZionClientTypes'
import { ZionContextProvider } from '../../../src/components/ZionContextProvider'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { foundry } from 'wagmi/chains'
interface Props {
    provider: ZionTestWeb3Provider
    primaryProtocol?: SpaceProtocol
    onboardingOpts?: ZionOnboardingOpts
    defaultSpaceId?: string
    defaultSpaceName?: string
    defaultSpaceAvatarSrc?: string
    initialSyncLimit?: number
    chainId?: number
    children: JSX.Element
}

export const ZionTestApp = (props: Props) => {
    const {
        provider,
        primaryProtocol: inPrimaryProtocol,
        onboardingOpts: inOnboardingOpts,
        defaultSpaceId,
        defaultSpaceName,
        defaultSpaceAvatarSrc,
        initialSyncLimit,
        children,
    } = props
    // pull environment variables from the process
    const primaryProtocol =
        inPrimaryProtocol ?? (process.env.PRIMARY_PROTOCOL as SpaceProtocol) ?? SpaceProtocol.Matrix
    const homeServerUrl = process.env.HOMESERVER!
    const casablancaServerUrl = process.env.CASABLANCA_SERVER_URL!
    const onboardingOpts: ZionOnboardingOpts = inOnboardingOpts
        ? inOnboardingOpts
        : {
              showWelcomeSpash: true,
          }
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
    })

    return (
        <ZionContextProvider
            primaryProtocol={primaryProtocol}
            homeServerUrl={homeServerUrl}
            casablancaServerUrl={casablancaServerUrl}
            onboardingOpts={onboardingOpts}
            signer={provider.wallet}
            defaultSpaceId={defaultSpaceId}
            defaultSpaceName={defaultSpaceName}
            defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
            initialSyncLimit={initialSyncLimit}
            chain={foundry}
        >
            <ZionWalletAutoConnect children={children} />
        </ZionContextProvider>
    )
}

interface AutoConnectProps {
    children: JSX.Element
}

/// in the tests we make a custom provider that wraps our random wallet
/// go ahead and connect to the wallet automatically, so we don't have to do it in every test
const ZionWalletAutoConnect = (props: AutoConnectProps) => {
    const { connect, connectors, error, status, data } = useConnect()
    const connected = useRef(false)
    // automatically connect to the wallet if it's available
    useEffect(() => {
        if (connectors.length > 0 && !connected.current) {
            connected.current = true
            console.log('ZionTestApp: connecting to wallet')
            connect({ connector: connectors[0] })
        }
    }, [connect, connectors])
    // log state
    useEffect(() => {
        console.log('ZionTestApp: wallet connection status', {
            error,
            status,
            data,
        })
    }, [error, status, data])
    return <>{props.children}</>
}
