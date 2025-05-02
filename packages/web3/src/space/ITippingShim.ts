import { TipEventObject } from '@towns-protocol/generated/dev/typings/ITipping'
import { ContractType } from '../types/typechain'
import { ITipping__factory } from '@towns-protocol/generated/dev/typings/factories/ITipping__factory'
import { BaseContractShim } from '../BaseContractShim'
import { ContractReceipt, ethers } from 'ethers'
export class ITippingShim extends BaseContractShim<ContractType<typeof ITipping__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ITipping__factory.connect.bind(ITipping__factory))
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
    ): TipEventObject | undefined {
        for (const log of receipt.logs) {
            if (log.address === this.address) {
                const parsedLog = this.interface.parseLog(log)
                if (
                    parsedLog.name === 'Tip' &&
                    (parsedLog.args.sender as string).toLowerCase() === senderAddress.toLowerCase()
                ) {
                    return {
                        tokenId: parsedLog.args.tokenId,
                        currency: parsedLog.args.currency,
                        sender: parsedLog.args.sender,
                        receiver: parsedLog.args.receiver,
                        amount: parsedLog.args.amount,
                        messageId: parsedLog.args.messageId,
                        channelId: parsedLog.args.channelId,
                    } satisfies TipEventObject
                }
            }
        }
        return undefined
    }
}
