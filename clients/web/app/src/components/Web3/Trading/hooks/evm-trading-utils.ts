import { BlockchainTransaction_TokenTransfer } from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { ContractReceipt as EthersContractReceipt } from 'ethers'
import { ContractReceipt } from '@river-build/sdk'
import { bin_fromHexString } from '@river-build/dlog'
import { extractTransferAmountFromLogs } from './erc20-utils'

export function createSendTokenTransferDataEVM(
    receipt: EthersContractReceipt,
    walletAddress: string,
    tokenAddress: string,
    channelId: string,
    messageId: string,
    isBuy: boolean,
):
    | {
          receipt: ContractReceipt
          event: PlainMessage<BlockchainTransaction_TokenTransfer>
      }
    | undefined {
    const amount = extractTransferAmountFromLogs(receipt.logs, walletAddress, tokenAddress)

    if (amount === BigInt(0)) {
        return undefined
    }

    const event: PlainMessage<BlockchainTransaction_TokenTransfer> = {
        amount: amount.toString(),
        address: bin_fromHexString(tokenAddress),
        sender: bin_fromHexString(walletAddress),
        channelId: bin_fromHexString(channelId),
        messageId: bin_fromHexString(messageId),
        isBuy: isBuy,
    }

    return { receipt, event }
}
