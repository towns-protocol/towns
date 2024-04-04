import { useEffect, useRef } from 'react'
import { useLinkCallerToRootKey, useTransactionStore } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useIsSmartAccountLinked } from 'hooks/useIsSmartAccountLinked'
import { useAuth } from 'hooks/useAuth'
import { useEnvironment } from 'hooks/useEnvironmnet'

/**
 * Automatically link the smart account to the caller if the user is authenticated and the smart account is not linked.
 * Attempt a single time
 * remove this https://linear.app/hnt-labs/issue/HNT-5662/remove-auto-smart-account-linking-from-app
 */
export function AutoLinkSmartAccount() {
    const { data: isSmartAccountLinked, isLoading: isSmartAccountLinkedLoading } =
        useIsSmartAccountLinked()
    const { isAuthenticated } = useAuth()
    const linkAttempted = useRef(false)
    const { linkCallerToRootKeyTransaction } = useLinkCallerToRootKey()
    const getSigner = useGetEmbeddedSigner()
    const transactions = useTransactionStore()
    const { accountAbstractionConfig } = useEnvironment()

    useEffect(() => {
        if (!accountAbstractionConfig) {
            return
        }
        if (!isAuthenticated) {
            return
        }
        if (linkAttempted.current) {
            return
        }
        if (isSmartAccountLinked || isSmartAccountLinkedLoading) {
            return
        }
        if (
            Object.values(transactions).some(
                (tx) => tx.status === 'pending' || tx.status === 'potential',
            )
        ) {
            return
        }
        async function link() {
            const signer = await getSigner()
            if (!signer) {
                return
            }
            linkAttempted.current = true

            setTimeout(async () => {
                try {
                    const result = await linkCallerToRootKeyTransaction(signer)
                    console.log('[AutoLinkSmartAccount] Linked smart account', result)
                } catch (error) {
                    console.warn('[AutoLinkSmartAccount] Error linking smart account', error)
                }
            }, 20_000)
        }

        link()
    }, [
        accountAbstractionConfig,
        getSigner,
        isAuthenticated,
        isSmartAccountLinked,
        isSmartAccountLinkedLoading,
        linkCallerToRootKeyTransaction,
        transactions,
    ])

    return null
}
