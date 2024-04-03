import { Address, useLinkedWallets, useMyUserId } from 'use-towns-client'
import { useEffect, useState } from 'react'
import { useAbstractAccountAddress } from './useAbstractAccountAddress'

export function useIsSmartAccountLinked() {
    const myUserId = useMyUserId()

    const [isLinkWalletQueryEnabled, setIsLinkWalletQueryEnabled] = useState(true)

    const {
        data: linkedWallets,
        isLoading: isLoadingLinkedWallets,
        error: linkedWalletsError,
    } = useLinkedWallets({ enabled: isLinkWalletQueryEnabled })

    const {
        data: abstractAccountAddress,
        isLoading: isLoadingAbstractAccount,
        error: abstractAccountAddressError,
    } = useAbstractAccountAddress({
        rootKeyAddress: myUserId as Address | undefined,
    })
    const [result, setResult] = useState<{
        isLoading: boolean
        error: unknown | undefined
        data: boolean | undefined
    }>({
        isLoading: true,
        error: undefined,
        data: undefined,
    })

    useEffect(() => {
        if (linkedWalletsError) {
            console.error('Error fetching linked wallets', linkedWalletsError)
            setResult({ isLoading: false, error: linkedWalletsError, data: undefined })
            return
        }
        if (abstractAccountAddressError) {
            console.error('Error fetching abstract account address', abstractAccountAddressError)
            setResult({ isLoading: false, error: abstractAccountAddressError, data: undefined })
            return
        }
        if (isLoadingLinkedWallets || isLoadingAbstractAccount) {
            setResult({ isLoading: true, error: undefined, data: undefined })
            return
        }
        if (abstractAccountAddress && linkedWallets) {
            setIsLinkWalletQueryEnabled(false)
            setResult({
                isLoading: false,
                error: undefined,
                data: linkedWallets.includes(abstractAccountAddress),
            })
            return
        }
        setResult({
            isLoading: true,
            error: undefined,
            data: undefined,
        })
    }, [
        linkedWalletsError,
        abstractAccountAddressError,
        isLoadingLinkedWallets,
        isLoadingAbstractAccount,
        abstractAccountAddress,
        linkedWallets,
    ])

    return result
}
