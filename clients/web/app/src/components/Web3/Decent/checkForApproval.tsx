import { Address, erc20Abi } from 'viem'
import { BoxActionResponse, ChainId, EvmTransaction } from '@decent.xyz/box-common'
import { ApproveTokenArgs } from '@decent.xyz/box-hooks'
import { readContract, writeContract } from '@wagmi/core'
import { wagmiConfig } from 'wagmiConfig'
import { waitForReceipt } from './waitForReceipt'

const getAllowance = async ({
    user,
    token,
    spender,
    chainId,
}: {
    user: Address
    spender: Address
    token: Address
    chainId: ChainId
}) => {
    return await readContract(wagmiConfig, {
        address: token as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [user as Address, spender as Address],
        chainId,
    })
}

// https://github.com/decentxyz/launch-nfts/blob/c2a5d7300dfe9265a42c7f3e5863606805d65039/components/MintButton.tsx
export const checkForApproval = async ({
    userAddress: user,
    actionResponse,
    srcChainId,
}: {
    userAddress: Address
    actionResponse: BoxActionResponse
    srcChainId: ChainId
}) => {
    const { tokenPayment, tx } = actionResponse
    if (!tokenPayment || !tx) {
        return false
    }
    const { to: spender } = tx as EvmTransaction
    const { isNative, amount, tokenAddress } = tokenPayment
    if (isNative) {
        console.log('⛽️ token selected for payment, skipping token allowance check.')
        return false
    }
    if (!tokenAddress) {
        return false
    }
    const allowance = await getAllowance({
        token: tokenAddress as Address,
        spender,
        user,
        chainId: srcChainId,
    })
    console.log(`
      allowance: ${allowance}
      about to spend: ${amount}
    `)

    if (allowance < amount) {
        console.log('Requires approval')
        return true
    }
    return false
}

export const approveToken = async (
    { token, spender, amount }: Omit<ApproveTokenArgs, 'wagmiConfig'>,
    chainId: ChainId,
) => {
    try {
        const hash = await writeContract(wagmiConfig, {
            address: token as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender as Address, amount],
            chainId,
        })
        const receipt = await waitForReceipt({ hash, chainId })
        return receipt
    } catch (e) {
        console.log('Error approving token', e)
    }
}
