import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { Address, queryClient, useLinkedWallets } from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { Box, Dropdown, FancyButton, Icon, Paragraph, Stack, Text, TextField } from '@ui'
import { formatUnitsToFixedLength, useBalance } from 'hooks/useBalance'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { env } from 'utils'
import { FadeInBox } from '@components/Transitions'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { popupToast } from '@components/Notifications/popupToast'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'
import { soalanaBalanceQueryKey, useSolanaBalance } from './useSolanaBalance'
import { useSolanaWallet } from './useSolanaWallet'
import { TransferAssetsForm } from '../Wallet/TransferAssetsPanel'
import { FullPanelOverlay } from '../WalletLinkingPanel'
export const TradingSendPanel = () => {
    const { solanaWalletAddress, evmWalletAddress } = useTradingWalletAddresses()
    const [asset, setAsset] = useState<'base' | 'solana'>('solana')
    const { data: solanaBalance } = useSolanaBalance(solanaWalletAddress)

    const { data: ethBalance } = useBalance({
        address: evmWalletAddress,
        enabled: !!evmWalletAddress,
        watch: true,
    })

    const onSolanaTransferDone = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: soalanaBalanceQueryKey(solanaWalletAddress) })
    }, [solanaWalletAddress])

    return (
        <Panel padding gap label="Send">
            <Stack gap="sm">
                <Dropdown
                    paddingX="none"
                    label="Asset"
                    options={[
                        { value: 'base', label: 'Base ETH' },
                        { value: 'solana', label: 'SOL' },
                    ]}
                    defaultValue={asset}
                    onChange={(value) => setAsset(value as 'base' | 'solana')}
                />

                {asset === 'solana' ? (
                    <SolanaBalanceRow balance={solanaBalance} />
                ) : asset === 'base' ? (
                    <EthBalanceRow balance={ethBalance} />
                ) : null}
            </Stack>

            {asset === 'solana' ? (
                <TransferSolanaForm
                    balance={solanaBalance}
                    onTransferSuccess={onSolanaTransferDone}
                />
            ) : (
                <TransferEthForm evmWalletAddress={evmWalletAddress} balance={ethBalance} />
            )}
        </Panel>
    )
}

const SolanaBalanceRow = (props: { balance: ReturnType<typeof useSolanaBalance>['data'] }) => {
    const { balance } = props
    return <AssetBalanceRow asset="solana" balance={balance} decimals={9} assetName="SOL" />
}

const EthBalanceRow = (props: { balance: ReturnType<typeof useBalance>['data'] }) => {
    const { balance } = props
    return <AssetBalanceRow asset="base" balance={balance?.value} decimals={18} assetName="ETH" />
}

const StableEmptyAssets: Token[] = []

const TransferEthForm = (props: {
    evmWalletAddress: Address | undefined
    balance: ReturnType<typeof useBalance>['data']
}) => {
    const { evmWalletAddress, balance: fromBalance } = props

    const { data: linkedWallets, isLoading: isLinkedWalletsLoading } = useLinkedWallets()

    return isLinkedWalletsLoading ? (
        <Stack padding="md">
            <ButtonSpinner />
        </Stack>
    ) : (
        <TransferAssetsForm
            isEthTransfer
            source={evmWalletAddress}
            isTreasuryTransfer={false}
            fromBalance={fromBalance}
            nfts={StableEmptyAssets}
            linkedWallets={linkedWallets}
            isPendingTransferAsset={false}
            aaAddress={undefined}
            treasuryEmpty={false}
            assetSourceParam={undefined}
        />
    )
}

export const TransferSolanaForm = ({
    balance,
    onTransferSuccess,
}: {
    balance?: bigint
    onTransferSuccess?: () => void
}) => {
    const [recipient, setRecipient] = useState('')
    const [amount, setAmount] = useState('')
    const [recipientError, setRecipientError] = useState<string | null>(null)
    const [amountError, setAmountError] = useState<string | null>(null)
    const { solanaWallet } = useSolanaWallet()

    const [isSending, setIsSending] = useState(false)

    const resetForm = useCallback(() => {
        setRecipient('')
        setAmount('')
        setRecipientError(null)
        setAmountError(null)
    }, [])

    useEffect(() => {
        if (isSending) {
            const toast = popupToast(({ toast }) => (
                <StandardToast.Pending toast={toast} message="Transfer in progress..." />
            ))
            return () => {
                dismissToast(toast)
            }
        }
    }, [isSending])

    const validateRecipient = useCallback((address: string) => {
        if (!address) {
            setRecipientError('Recipient address is required')
            return false
        }
        try {
            new PublicKey(address)
            setRecipientError(null)
            return true
        } catch (error) {
            setRecipientError('Invalid Solana address')
            return false
        }
    }, [])

    const validateAmount = useCallback(
        (value: string) => {
            if (!value) {
                setAmountError('Amount is required')
                return false
            }

            try {
                const parsedAmount = parseUnits(value, 9)
                const parsedBigInt = BigInt(parsedAmount.toString())
                if (parsedBigInt <= BigInt(0)) {
                    setAmountError('Amount must be greater than 0')
                    return false
                }

                if (balance && parsedBigInt > balance) {
                    setAmountError('Insufficient balance')
                    return false
                }

                setAmountError(null)
                return true
            } catch (error) {
                setAmountError('Invalid amount')
                return false
            }
        },
        [balance],
    )

    const connection = useMemo(() => {
        if (!env.VITE_SOLANA_MAINNET_RPC_URL) {
            console.error('VITE_SOLANA_MAINNET_RPC_URL is not set')
            return undefined
        }
        return new Connection(env.VITE_SOLANA_MAINNET_RPC_URL)
    }, [])

    const onSend = useCallback(async () => {
        const parsedAmount = parseUnits(amount, 9)
        let parsedBigInt = BigInt(parsedAmount.toString())
        const parsedRecipient = new PublicKey(recipient)
        if (!parsedRecipient || !solanaWallet || !connection || !balance || parsedBigInt < 5000n) {
            return
        }

        // If the amount is the same as the balance, (the user selected max)
        // we need to subtract the fee or the transaction will fail
        // the transaction fee is 5000 lamports
        // https://solana.com/docs/core/fees#key-points
        if (parsedBigInt === balance) {
            parsedBigInt -= 5000n
        }

        try {
            setIsSending(true)
            const blockhash = (await connection.getLatestBlockhash('finalized')).blockhash

            const solanaPubKey = new PublicKey(solanaWallet.address)
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: solanaPubKey,
                    toPubkey: parsedRecipient,
                    lamports: parsedBigInt,
                }),
            )
            transaction.recentBlockhash = blockhash
            transaction.feePayer = solanaPubKey

            const signedTx = await solanaWallet.signTransaction(transaction)
            const rawTransaction = signedTx.serialize()
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 5,
            })
            console.log('txHash', signature)

            onTransferSuccess?.()

            popupToast(({ toast }) => (
                <StandardToast.Success
                    toast={toast}
                    message={`${amount} SOL was sent to ${recipient}`}
                    cta="View Transaction"
                    onCtaClick={() => {
                        window.open(`https://solscan.io/tx/${signature}`, '_blank')
                    }}
                />
            ))

            resetForm()
        } catch (error) {
            console.error(error)
            popupToast(({ toast }) => (
                <StandardToast.Error toast={toast} message="An error occurred while sending SOL" />
            ))
        } finally {
            setIsSending(false)
        }
    }, [amount, recipient, solanaWallet, connection, balance, onTransferSuccess, resetForm])

    const disabled = !recipient || !amount || !!recipientError || !!amountError || !solanaWallet

    const onMaxClick = () => {
        if (!balance) {
            return
        }
        setAmount(formatUnits(balance, 9))
    }

    return (
        <>
            <Stack grow gap="md">
                <Stack gap="sm">
                    <TextField
                        renderLabel={(label) => (
                            <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                                <Text strong>{label}</Text>
                                <Stack
                                    cursor="pointer"
                                    data-testid="max-button"
                                    justifyContent="end"
                                    onClick={onMaxClick}
                                >
                                    <Text size="md" color="cta2">
                                        Enter Max
                                    </Text>
                                </Stack>
                            </Stack>
                        )}
                        after={<Text color="gray2">SOL</Text>}
                        background="level2"
                        label="Amount"
                        value={amount}
                        placeholder="Enter amount"
                        type="number"
                        min="0"
                        step="0.000000001"
                        onChange={(e) => {
                            setAmount(e.target.value)
                            validateAmount(e.target.value)
                        }}
                        onBlur={() => validateAmount(amount)}
                    />
                    {amountError ? <Text color="error">{amountError}</Text> : null}
                </Stack>

                <Stack gap="sm">
                    <TextField
                        background="level2"
                        label="Send to"
                        value={recipient}
                        placeholder="Enter Solana address"
                        onChange={(e) => setRecipient(e.target.value)}
                        onBlur={() => validateRecipient(recipient)}
                    />
                    {recipientError ? <Text color="error">{recipientError}</Text> : null}
                </Stack>
            </Stack>
            <Stack gap="sm">
                {!disabled && <Disclaimer />}
                <FancyButton
                    layoutRoot
                    cta
                    compact
                    borderRadius="lg"
                    disabled={disabled}
                    onClick={onSend}
                >
                    Send
                </FancyButton>
            </Stack>
            {isSending ? <FullPanelOverlay withSpinner={false} /> : null}
        </>
    )
}

const Disclaimer = () => {
    return (
        <FadeInBox horizontal gap paddingX paddingY="sm" rounded="sm" background="warningSubtle">
            <Box centerContent>
                <Icon type="warning" size="square_sm" />
            </Box>
            <Box centerContent>
                <Paragraph fontWeight="strong" size="sm">
                    Make sure the wallet you’re sending to supports Solana.
                </Paragraph>
            </Box>
        </FadeInBox>
    )
}

const AssetBalanceRow = ({
    asset,
    balance = 0n,
    decimals,
    assetName,
}: {
    asset: 'base' | 'solana'
    balance?: bigint
    decimals?: number
    assetName: string
}) => {
    return !!decimals && !!balance ? (
        <Stack
            horizontal
            gap="sm"
            background="level2"
            padding="sm"
            rounded="md"
            alignItems="center"
        >
            <Box width="x4" height="x4" background="level1" rounded="full">
                <Icon type={asset === 'base' ? 'baseEth' : 'solana'} size="square_lg" />
            </Box>
            {balance !== undefined ? (
                <Text strong color="default" fontSize="lg">
                    {formatUnitsToFixedLength(balance, decimals)} {assetName}
                </Text>
            ) : (
                <ButtonSpinner />
            )}
        </Stack>
    ) : null
}
