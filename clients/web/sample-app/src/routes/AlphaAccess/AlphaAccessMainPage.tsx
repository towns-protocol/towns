import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ZioneerNFT, ZioneerNFTContractState, useWeb3Context } from 'use-zion-client'
import { ethers } from 'ethers'

import { ContractState } from './ContractState'
import { TransactionReport, TransactionReports } from './TransactionReports'
import { validateEthFromString } from './validateEthFromString'

export const AlphaAccessMainPage = () => {
    const { provider, chain } = useWeb3Context()

    const [contractState, setContractState] = useState<ZioneerNFTContractState | null>(null)

    const [loading, setLoading] = useState(false)

    const zioneerNFT = useMemo(() => {
        if (!provider || !chain) {
            return null
        }

        const signer = provider.getSigner()

        return new ZioneerNFT(chain.id, provider, signer)
    }, [provider, chain])

    const handleRefetchContractState = useCallback(async () => {
        const refetched = await zioneerNFT?.getContractState()
        if (refetched) {
            setContractState(refetched)
        }
    }, [zioneerNFT])

    useEffect(() => {
        handleRefetchContractState()
    }, [handleRefetchContractState])

    const [depositAmountETH, setDepositAmountETH] = useState('')
    const [mintToAddress, setMintToAddress] = useState('')
    const [mintRewardETH, setMintRewardETH] = useState('')
    const [allowedState, setAllowedState] = useState(true)
    const [allowedUser, setAllowedUser] = useState('')
    const [transactionReports, setTransactionReports] = useState<Array<TransactionReport>>([])
    const recordTransactionReport = useCallback(
        ({ hash, type }: { hash: string; type: string }) => {
            setTransactionReports([
                {
                    hash,
                    type,
                },
                ...transactionReports,
            ])
        },
        [transactionReports],
    )

    const handleSubmitDeposit = useCallback(async () => {
        if (!zioneerNFT) {
            alert('Please sign in')
            return
        }

        const parsedEther = validateEthFromString(depositAmountETH)

        if (parsedEther.type === 'failure') {
            alert(parsedEther.error)
            return
        }

        setLoading(true)

        try {
            const tx = await zioneerNFT.deposit(parsedEther.amount)
            recordTransactionReport({
                hash: tx.hash,
                type: 'Deposit',
            })
            const rx = await tx.wait()
            if (rx.status === 1) {
                await handleRefetchContractState()
                alert('Deposit successful!')
                setDepositAmountETH('')
            } else {
                alert('Deposit failed')
            }
        } catch (e) {
            alert('Deposit failed')
            console.error({ e })
        }

        setLoading(false)
    }, [depositAmountETH, handleRefetchContractState, recordTransactionReport, zioneerNFT])

    const handleSubmitMintTo = useCallback(async () => {
        if (!zioneerNFT) {
            alert('Please sign in')
            return
        }

        if (!ethers.utils.isAddress(mintToAddress)) {
            alert('Please enter a valid address')
            alert(mintToAddress)
            return
        }

        if (!contractState) {
            alert('Please wait for contract state to load')
            return
        }

        if (contractState.mintReward.gt(contractState.contractBalance)) {
            alert('Not enough funds to mint. Please deposit more funds.')
            return
        }

        const minteeNFTBalance = await zioneerNFT.zioneerNFTShim.read.balanceOf(mintToAddress)
        if (minteeNFTBalance.gt(0)) {
            alert('User already has a Zioneer NFT')
            return
        }

        setLoading(true)

        try {
            const tx = await zioneerNFT.zioneerNFTShim.write.mintTo(mintToAddress)
            recordTransactionReport({
                hash: tx.hash,
                type: 'Mint',
            })
            const rx = await tx.wait()

            if (rx.status === 1) {
                await handleRefetchContractState()
                alert('Mint successful!')
                setMintToAddress('')
            } else {
                alert('Mint failed via receipt')
            }
        } catch (e) {
            alert('Mint failed')
            console.error({ e })
        }

        setLoading(false)
    }, [
        contractState,
        handleRefetchContractState,
        mintToAddress,
        recordTransactionReport,
        zioneerNFT,
    ])

    const handleSubmitSetMintReward = useCallback(async () => {
        if (!zioneerNFT) {
            alert('Please sign in')
            return
        }

        const parsedEther = validateEthFromString(mintRewardETH)

        if (parsedEther.type === 'failure') {
            alert(parsedEther.error)
            return
        }

        setLoading(true)

        try {
            const tx = await zioneerNFT.zioneerNFTShim.write.setMintReward(parsedEther.amount)
            recordTransactionReport({
                hash: tx.hash,
                type: 'Set Mint Reward',
            })
            const rx = await tx.wait()

            if (rx.status === 1) {
                await handleRefetchContractState()
                alert('Set mint reward successful!')
                setMintRewardETH('')
            } else {
                alert('Set mint reward failed')
            }
        } catch (e) {
            alert('Set mint reward failed')
            console.error({ e })
        }

        setLoading(false)
    }, [zioneerNFT, mintRewardETH, handleRefetchContractState, recordTransactionReport])

    const handleSubmitSetAllowed = useCallback(async () => {
        if (!zioneerNFT) {
            alert('Please sign in')
            return
        }

        if (!ethers.utils.isAddress(allowedUser)) {
            alert('Please enter a valid address')
            return
        }

        setLoading(true)

        try {
            const tx = await zioneerNFT.zioneerNFTShim.write.setAllowed(allowedUser, allowedState)
            recordTransactionReport({
                hash: tx.hash,
                type: 'Set Allowed',
            })
            const rx = await tx.wait()

            if (rx.status === 1) {
                await handleRefetchContractState()
                alert('Set allowed successful!')
                setAllowedUser('')
                setAllowedState(true)
            } else {
                alert('Set allowed failed')
            }
        } catch (e) {
            alert('Set allowed failed')
            console.error({ e })
        }

        setLoading(false)
    }, [zioneerNFT, allowedUser, allowedState, handleRefetchContractState, recordTransactionReport])

    const handleSubmitWithdraw = useCallback(async () => {
        if (!zioneerNFT) {
            alert('Please sign in')
            return
        }

        setLoading(true)

        try {
            const tx = await zioneerNFT.withdraw()
            recordTransactionReport({
                hash: tx.hash,
                type: 'Withdraw',
            })
            const rx = await tx.wait()

            if (rx.status === 1) {
                await handleRefetchContractState()
                alert('Withdraw successful!')
            } else {
                alert('Withdraw failed')
            }
        } catch (e) {
            alert('Withdraw failed')
        }

        setLoading(false)
    }, [handleRefetchContractState, recordTransactionReport, zioneerNFT])

    if (!zioneerNFT) {
        return <div>Not signed in. Go back to the home page to sign in.</div>
    }

    if (!contractState) {
        return <div>Loading...</div>
    }

    return (
        <div
            style={{
                width: '960px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    padding: '20px',
                }}
            >
                <div
                    style={{
                        backgroundColor: '#f5f5f5',
                        padding: '20px',
                        marginTop: '20px',
                    }}
                >
                    <ContractState contractState={contractState} />
                </div>
                <table
                    style={{
                        padding: '20px',
                    }}
                >
                    <tbody>
                        <tr>
                            <td />
                            <td>
                                <input
                                    disabled={loading}
                                    value={depositAmountETH}
                                    type="text"
                                    onChange={(e) => {
                                        setDepositAmountETH(e.target.value)
                                    }}
                                />
                            </td>
                            <td
                                style={{
                                    paddingLeft: '10px',
                                }}
                            >
                                <button disabled={loading} onClick={handleSubmitDeposit}>
                                    Deposit
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td>
                                <input
                                    disabled={loading}
                                    value={mintToAddress}
                                    type="text"
                                    onChange={(e) => {
                                        setMintToAddress(e.target.value)
                                    }}
                                />
                            </td>
                            <td
                                style={{
                                    paddingLeft: '10px',
                                }}
                            >
                                <button disabled={loading} onClick={handleSubmitMintTo}>
                                    Mint To
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td>
                                <input
                                    disabled={loading}
                                    value={mintRewardETH}
                                    type="text"
                                    onChange={(e) => {
                                        setMintRewardETH(e.target.value)
                                    }}
                                />
                            </td>
                            <td
                                style={{
                                    paddingLeft: '10px',
                                }}
                            >
                                <button disabled={loading} onClick={handleSubmitSetMintReward}>
                                    Set Mint Reward
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={allowedState}
                                    disabled={loading}
                                    onChange={(e) => {
                                        setAllowedState(e.target.checked)
                                    }}
                                />
                            </td>
                            <td>
                                <input
                                    value={allowedUser}
                                    type="text"
                                    disabled={loading}
                                    onChange={(e) => {
                                        setAllowedUser(e.target.value)
                                    }}
                                />
                            </td>
                            <td
                                style={{
                                    paddingLeft: '10px',
                                }}
                            >
                                <button disabled={loading} onClick={handleSubmitSetAllowed}>
                                    Set Allowed
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td />
                            <td
                                style={{
                                    paddingLeft: '10px',
                                }}
                            >
                                <button disabled={loading} onClick={handleSubmitWithdraw}>
                                    Withdraw
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div
                style={{
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                }}
            >
                <TransactionReports transactionReports={transactionReports} />
            </div>
        </div>
    )
}
