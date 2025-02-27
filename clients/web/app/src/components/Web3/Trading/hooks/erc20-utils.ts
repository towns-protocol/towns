import { ethers, providers } from 'ethers'
import { erc20Abi } from 'viem'

export function generateApproveAmountCallData(spender: string, amount: string): string {
    const erc20Interface = new ethers.utils.Interface(erc20Abi)
    return erc20Interface.encodeFunctionData('approve', [spender, amount])
}

/**
 * Extracts the transfer amount from transaction logs for a specific ERC20 token transfer.
 *
 * This function is needed because when processing ERC20 token transfers in transactions,
 * we need to extract the final transfer amount from the transaction logs.
 * Before submitting a transaction, we don't know what the exact amount will be
 * (especially in cases with fees or slippage), so we need to parse the logs
 * after the transaction is complete to determine the actual amount transferred.

 * @param logs - Array of transaction logs to search through
 * @param walletAddress - Address of the wallet involved in the transfer
 * @param tokenAddress - Address of the ERC20 token being transferred
 * @returns The amount transferred as a bigint, or 0 if no matching transfer was found
 */

export function extractTransferAmountFromLogs(
    logs: providers.Log[],
    walletAddress: string,
    tokenAddress: string,
): bigint {
    // Create an interface for ERC20 to parse the logs
    const erc20Interface = new ethers.utils.Interface(erc20Abi)

    // Look through all logs in the receipt
    for (const log of logs) {
        // Check if the log is from the token address we're interested in
        if (log.address.toLowerCase() === tokenAddress.toLowerCase()) {
            try {
                // Try to parse the log as a Transfer event
                const parsedLog = erc20Interface.parseLog(log)
                // Check if this is a Transfer event,
                // exclude cases where the wallet address is not involved
                if (
                    parsedLog.name === 'Transfer' &&
                    (parsedLog.args.from.toLowerCase() === walletAddress.toLowerCase() ||
                        parsedLog.args.to.toLowerCase() === walletAddress.toLowerCase())
                ) {
                    // Extract the amount (value) from the event
                    const amount = parsedLog.args.value
                    return BigInt(amount.toString())
                }
            } catch (error) {
                // Skip logs that can't be parsed as ERC20 Transfer events
                continue
            }
        }
    }

    // Return 0 if no matching Transfer event was found
    return BigInt(0)
}
