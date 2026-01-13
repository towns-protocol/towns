import { TipEventObject as GeneratedTipEventObject } from '@towns-protocol/generated/dev/typings/ITipping'
import { ITipping__factory } from '@towns-protocol/generated/dev/typings/factories/ITipping__factory'
import { BaseContractShim } from '../BaseContractShim'
import { ContractReceipt, ethers, BigNumber } from 'ethers'

const { abi, connect } = ITipping__factory

// legacy tip event
export type TipEventObject = GeneratedTipEventObject

// ITipping.sol enum TipRecipientType
export enum TipRecipientType {
    Member = 0,
    Bot = 1,
    Any = 2,
}

export type TipSentEventObject = {
    sender: string
    receiver: string
    recipientType: TipRecipientType
    currency: string
    amount: BigNumber
    tokenId: BigNumber | undefined
    messageId: string
    channelId: string
}

export class ITippingShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }

    /**
     * Get the total number of tips by currency
     * @param currency - The currency to get the total tips for
     * @returns The total number of tips by currency
     */
    public async totalTipsByCurrency(currency: string): Promise<bigint> {
        const totalTips = await this.read.totalTipsByCurrency(currency)
        return totalTips.toBigInt()
    }

    /**
     * Get the tip amount by currency
     * @param currency - The currency to get the tip amount for
     * @returns The tip amount by currency
     */
    public async tipAmountByCurrency(currency: string): Promise<bigint> {
        const tips = await this.read.tipAmountByCurrency(currency)
        return tips.toBigInt()
    }

    public getTipEvent(
        receipt: ContractReceipt,
        senderAddress: string,
    ): TipSentEventObject | undefined {
        for (const log of receipt.logs) {
            if (log.address === this.address) {
                const parsedLog = this.interface.parseLog(log)
                if (
                    parsedLog.name === 'TipSent' &&
                    (parsedLog.args.sender as string).toLowerCase() === senderAddress.toLowerCase()
                ) {
                    const recipientType = parsedLog.args.recipientType as TipRecipientType
                    const data = parsedLog.args.data as string

                    // Decode data field based on recipient type
                    let messageId: string
                    let channelId: string
                    let tokenId: BigNumber | undefined

                    if (recipientType === TipRecipientType.Member) {
                        // Member tips: data = abi.encode(messageId, channelId, tokenId)
                        const decoded = ethers.utils.defaultAbiCoder.decode(
                            ['bytes32', 'bytes32', 'uint256'],
                            data,
                        )
                        messageId = decoded[0] as string
                        channelId = decoded[1] as string
                        tokenId = decoded[2] as BigNumber
                    } else {
                        // Bot/Any tips: data = abi.encode(messageId, channelId)
                        const decoded = ethers.utils.defaultAbiCoder.decode(
                            ['bytes32', 'bytes32'],
                            data,
                        )
                        messageId = decoded[0] as string
                        channelId = decoded[1] as string
                        tokenId = undefined
                    }

                    return {
                        sender: parsedLog.args.sender,
                        receiver: parsedLog.args.receiver,
                        recipientType,
                        currency: parsedLog.args.currency,
                        amount: parsedLog.args.amount,
                        tokenId,
                        messageId,
                        channelId,
                    } satisfies TipSentEventObject
                }
            }
        }
        return undefined
    }
}
