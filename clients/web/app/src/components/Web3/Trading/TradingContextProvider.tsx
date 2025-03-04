import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { Connection as SolanaConnection, VersionedTransaction } from '@solana/web3.js'
import { base64ToUint8Array } from '@river-build/sdk'
import { TransactionStatus, queryClient, useTownsClient, useTownsContext } from 'use-towns-client'
import { Signer } from 'ethers'
import { bin_toHexString, bin_toString } from '@river-build/dlog'
import { env } from 'utils'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { popupToast } from '@components/Notifications/popupToast'
import { useSolanaWallet } from './useSolanaWallet'
import { tradingChains } from './tradingConstants'
import { generateApproveAmountCallData } from './hooks/erc20-utils'
import { createSendTokenTransferDataSolana } from './hooks/solana-utils'

type TokenInfo = {
    name: string
    symbol: string
    address: string
    amount: bigint
    decimals: number
}
export type SolanaTransactionRequest = {
    id: string
    type: 'solana'
    transactionData: string
    token: TokenInfo
    signature?: string
    status: TransactionStatus
    isBuy: boolean
    threadInfo: { channelId: string; messageId: string } | undefined
}

export type EvmTransactionRequest = {
    id: string
    type: 'evm'
    transaction: {
        toAddress: string
        callData: string
        fromAmount: string
        fromTokenAddress: string
        value: string
    }
    token: TokenInfo
    approvalAddress: string
    status: TransactionStatus
    isBuy: boolean
    threadInfo: { channelId: string; messageId: string } | undefined
}

export const isSolanaTransactionRequest = (
    request: EvmTransactionRequest | SolanaTransactionRequest | undefined,
): request is SolanaTransactionRequest => {
    return request?.type === 'solana'
}

export const isEvmTransactionRequest = (
    request: EvmTransactionRequest | SolanaTransactionRequest | undefined,
): request is EvmTransactionRequest => {
    return request?.type === 'evm'
}

const TradingContext = createContext<{
    sendSolanaTransaction: (transaction: SolanaTransactionRequest) => void
    sendEvmTransaction: (transaction: EvmTransactionRequest, signer: Signer) => void
    pendingEvmTransaction: EvmTransactionRequest | undefined
    pendingSolanaTransaction: SolanaTransactionRequest | undefined
    tokenTransferRollups: ReturnType<typeof useTokenTransferRollups>['tokenTransferRollups']
}>({
    sendSolanaTransaction: () => {},
    sendEvmTransaction: () => {},
    pendingEvmTransaction: undefined,
    pendingSolanaTransaction: undefined,
    tokenTransferRollups: {},
})

export const useTradingContext = () => {
    return useContext(TradingContext)
}

export const TradingContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { solanaWallet } = useSolanaWallet()
    const townsClient = useTownsClient()
    const [pendingSolanaTransaction, setPendingSolanaTransaction] = React.useState<
        SolanaTransactionRequest | undefined
    >(undefined)

    const [pendingEvmTransaction, setPendingEvmTransaction] =
        React.useState<EvmTransactionRequest>()

    const connection = useMemo(() => {
        if (!env.VITE_SOLANA_MAINNET_RPC_URL) {
            console.error('VITE_SOLANA_MAINNET_RPC_URL is not set')
            return undefined
        }
        return new SolanaConnection(env.VITE_SOLANA_MAINNET_RPC_URL)
    }, [])

    const { tokenTransferRollups } = useTokenTransferRollups()

    const sendSolanaTransaction = useCallback(
        async (transaction: SolanaTransactionRequest) => {
            if (!solanaWallet) {
                console.error('No Solana wallet')
                return
            }

            if (!connection) {
                console.error('No Solana connection')
                return
            }

            if (pendingSolanaTransaction) {
                console.error('No Solana connection')
                return
            }

            console.info('Sending Solana transaction:', transaction)
            setPendingSolanaTransaction(transaction)

            try {
                const versionedTransaction = VersionedTransaction.deserialize(
                    base64ToUint8Array(transaction.transactionData),
                )
                const signedTx = await solanaWallet.signTransaction(versionedTransaction)
                const rawTransaction = signedTx.serialize()
                const signature = await connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: true,
                    maxRetries: 5,
                })

                transaction.signature = signature
                setPendingSolanaTransaction(transaction)

                console.info('Solana Transaction sent:', signature)

                for (let i = 0; i < 30; i++) {
                    const txResult = await connection.getTransaction(signature, {
                        maxSupportedTransactionVersion: 0,
                    })
                    if (txResult) {
                        if (txResult.meta?.err) {
                            console.error('Solana Transaction failed:', txResult.meta?.err)
                            transaction.status = TransactionStatus.Failed
                            popupToast(({ toast }) => (
                                <StandardToast.Error
                                    message="Transaction failed"
                                    subMessage={txResult.meta?.err?.toString()}
                                    toast={toast}
                                />
                            ))
                        } else if (txResult.blockTime) {
                            if (txResult.meta && transaction.threadInfo) {
                                // send token transfer event, but don't fail the entire chain
                                // of events if it fails
                                try {
                                    const transferData = createSendTokenTransferDataSolana(
                                        txResult,
                                        transaction.token.address,
                                        solanaWallet.address,
                                        transaction.threadInfo.channelId,
                                        transaction.threadInfo.messageId,
                                        transaction.isBuy,
                                    )
                                    if (transferData) {
                                        await townsClient.sendTokenTransfer(
                                            1151111081099710,
                                            transferData.receipt,
                                            transferData.event,
                                        )
                                    } else {
                                        console.error('Failed to create transfer data')
                                    }
                                } catch (error) {
                                    console.error('Error sending token transfer:', error)
                                }
                            }

                            console.log('Solana Transaction confirmed:', txResult)
                            transaction.status = TransactionStatus.Success
                            popupToast(
                                ({ toast }) => (
                                    <StandardToast.Success
                                        message="Transaction confirmed"
                                        toast={toast}
                                    />
                                ),
                                { duration: Infinity },
                            )
                            queryClient.invalidateQueries({
                                predicate: (query) => query.queryKey[0] === 'walletContents',
                            })
                        }
                    }

                    if (transaction.status !== TransactionStatus.Pending) {
                        // we got the result, break the loop
                        break
                    }
                    console.info('Waiting for Solana transaction confirmation...')
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }

                setPendingSolanaTransaction(undefined)
            } catch (error) {
                console.error('Error sending Solana transaction:', error)
            }
            setPendingSolanaTransaction(undefined)
        },
        [
            solanaWallet,
            connection,
            setPendingSolanaTransaction,
            pendingSolanaTransaction,
            townsClient,
        ],
    )

    const sendEvmTransaction = useCallback(
        async (request: EvmTransactionRequest, signer: Signer) => {
            setPendingEvmTransaction({ ...request, status: TransactionStatus.Pending })
            // IF this is a token transfer, we need to approve the token first
            // by bundling an approve call with the actual transaction call.
            // call approve(spender, amount) with quote.estimate.approvalAddress, amount
            // then add the actual swap tx
            const data =
                request.transaction.fromTokenAddress !== tradingChains[8453].nativeTokenAddress
                    ? {
                          callData: [
                              generateApproveAmountCallData(
                                  request.approvalAddress,
                                  request.transaction.fromAmount,
                              ),
                              request.transaction.callData,
                          ],
                          toAddress: [
                              request.transaction.fromTokenAddress,
                              request.transaction.toAddress,
                          ],
                      }
                    : {
                          toAddress: request.transaction.toAddress,
                          callData: request.transaction.callData,
                      }

            function showErrorToast(subMessage: string) {
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        message="Transaction failed"
                        subMessage={subMessage}
                        toast={toast}
                    />
                ))
            }
            try {
                let transactionContext = await townsClient.sendUserOperationWithCallData({
                    ...data,
                    value: BigInt(request.transaction.value),
                    signer,
                })

                if (!transactionContext) {
                    showErrorToast('Failed to send transaction')
                    return
                }

                transactionContext = await townsClient.waitForUserOperationWithCallDataTransaction(
                    transactionContext,
                )

                request.status = transactionContext?.status ?? TransactionStatus.Failed
                setPendingEvmTransaction(undefined)

                if (transactionContext?.status === TransactionStatus.Success) {
                    popupToast(
                        ({ toast }) => (
                            <StandardToast.Success message="Transaction confirmed" toast={toast} />
                        ),
                        { duration: Infinity },
                    )

                    queryClient.invalidateQueries({
                        predicate: (query) => query.queryKey[0] === 'walletContents',
                    })
                } else {
                    showErrorToast('Transaction failed')
                    return
                }
            } catch (error) {
                showErrorToast('Failed to send transaction')
                request.status = TransactionStatus.Failed
                setPendingEvmTransaction(undefined)
                console.error('Error sending EVM transaction:', error)
            }
        },
        [townsClient],
    )

    const pendingTransactionData = pendingSolanaTransaction?.transactionData

    useEffect(() => {
        if (
            !pendingTransactionData ||
            pendingSolanaTransaction?.status === TransactionStatus.Success
        ) {
            return
        }
        const toastId = popupToast(
            ({ toast }) => (
                <StandardToast.Pending
                    message="Pending transaction"
                    subMessage="Please wait for the transaction to complete"
                    toast={toast}
                />
            ),
            { duration: Infinity },
        )
        return () => {
            if (toastId) {
                dismissToast(toastId)
            }
        }
    }, [pendingTransactionData, pendingSolanaTransaction])

    const pendingEvmTransactionData = pendingEvmTransaction?.transaction
    useEffect(() => {
        if (!pendingEvmTransaction || pendingEvmTransaction?.status === TransactionStatus.Success) {
            return
        }
        const toastId = popupToast(
            ({ toast }) => (
                <StandardToast.Pending
                    message="Pending transaction"
                    subMessage="Please wait for the transaction to complete"
                    toast={toast}
                />
            ),
            { duration: Infinity },
        )
        return () => {
            if (toastId) {
                dismissToast(toastId)
            }
        }
    }, [pendingEvmTransactionData, pendingEvmTransaction])

    return (
        <TradingContext.Provider
            value={{
                pendingSolanaTransaction,
                pendingEvmTransaction,
                sendSolanaTransaction,
                sendEvmTransaction,
                tokenTransferRollups,
            }}
        >
            {children}
        </TradingContext.Provider>
    )
}

const useTokenTransferRollups = () => {
    const { casablancaClient } = useTownsContext()

    // map of trades: token address -> transfers
    const rollup = useRef<{
        [key: string]: {
            channelId: string
            address: Uint8Array
            amount: bigint
            isBuy: boolean
            chainId: string
            userId: string
            createdAtEpochMs: bigint
            messageId: string
        }[]
    }>({})

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const onStreamTokenTransfer = (
            channelId: string,
            transfer: {
                address: Uint8Array
                amount: bigint
                isBuy: boolean
                chainId: string
                userId: string
                createdAtEpochMs: bigint
                messageId: string
            },
        ) => {
            // solana does not use hex strings for addresses
            const address =
                transfer.chainId === 'solana-mainnet'
                    ? bin_toString(transfer.address)
                    : bin_toHexString(transfer.address)
            if (!rollup.current[address]) {
                rollup.current[address] = []
            }
            rollup.current[address].push({ ...transfer, channelId })
        }

        const onStreamInitialized = (streamId: string) => {
            const stream = casablancaClient.streams.get(streamId)
            if (!stream) {
                return
            }
            for (const tokenTransfer of stream.view.membershipContent.tokenTransfers) {
                onStreamTokenTransfer(stream.view.streamId, tokenTransfer)
            }
        }

        casablancaClient.on('streamTokenTransfer', onStreamTokenTransfer)
        casablancaClient.on('streamInitialized', onStreamInitialized)
        return () => {
            casablancaClient.off('streamTokenTransfer', onStreamTokenTransfer)
            casablancaClient.off('streamInitialized', onStreamInitialized)
        }
    }, [casablancaClient])
    return { tokenTransferRollups: rollup.current }
}
