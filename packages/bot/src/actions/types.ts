import type { ClientV2 } from '@towns-protocol/sdk'
import type { SpaceDapp } from '@towns-protocol/web3'
import type { WalletClient, Transport, Chain, Account, Address } from 'viem'

export type BotClient = ClientV2 & {
    viem: WalletClient<Transport, Chain, Account>
    spaceDapp: SpaceDapp
    appAddress: Address
}

/**
 * Utility type to extract function parameters without the first parameter (client)
 * @example
 * ```ts
 * export const sendMessage = (client: BotClient, streamId: string, message: string) => {...}
 * export type SendMessageParams = ParamsWithoutClient<typeof sendMessage>
 * // SendMessageParams = [streamId: string, message: string]
 * ```
 */
export type ParamsWithoutClient<T extends (...args: any[]) => any> =
    Parameters<T> extends [any, ...infer Rest] ? Rest : never
