import type { Bot, BotHandler, BotEvents, BasePayload } from '../bot'
import type { PlainMessage, SlashCommand } from '@towns-protocol/proto'
import type { Env } from 'hono'
import { useFacilitator } from 'x402/verify'
import { Hex, parseUnits, formatUnits } from 'viem'
import {
    createPaymentRequest,
    type TransferAuthorizationParams,
    chainIdToNetwork,
    getUsdcAddress,
} from './payment'
import { getSmartAccountFromUserId } from '../smart-account'
import type {
    PaymentPayload,
    PaymentRequirements,
    FacilitatorConfig,
    RouteConfig,
} from 'x402/types'

interface PendingPayment {
    command: string
    channelId: string
    userId: string
    event: BasePayload & {
        command: string
        args: string[]
        mentions: any[]
        replyId: string | undefined
        threadId: string | undefined
    }
    params: TransferAuthorizationParams
}

interface PaymentConfig {
    facilitator: FacilitatorConfig
    commands: PaymentCommand[]
}

export type PaymentCommand = PlainMessage<SlashCommand> & {
    config?: RouteConfig
}

// Type for the extended bot with payment capabilities
type ExtendedBot<Commands extends PaymentCommand[]> = Omit<Bot<Commands, any>, 'onSlashCommand'> & {
    onSlashCommand(
        command: Commands[number]['name'],
        handler: BotEvents<Commands>['slashCommand'],
    ): () => void
}

/**
 * Wraps a bot to automatically handle payment-gated slash commands
 *
 * Commands with `config.price` will:
 * 1. Request payment signature from user
 * 2. Validate the signature via facilitator
 * 3. Settle payment via facilitator (execute onchain transfer)
 * 4. Execute the handler only after payment is settled
 */
export function withPayment<Commands extends PaymentCommand[]>(
    bot: Bot<Commands, any>,
    config: PaymentConfig,
): ExtendedBot<Commands> {
    const facilitator = useFacilitator(config.facilitator)

    // Get chain info from bot
    const chainId = bot.viem.chain.id
    const network = chainIdToNetwork(chainId)
    const usdcAddress = getUsdcAddress(chainId)

    // Store original handlers for paid commands
    const handlers = new Map<string, BotEvents<PaymentCommand[]>['slashCommand']>()

    // Track pending payments by signatureId
    const pendingPayments = new Map<string, PendingPayment>()

    // Parse payment config upfront
    const paymentCommands = new Map<
        string,
        { price: bigint; network: string; description?: string }
    >()

    for (const cmd of config.commands) {
        if (cmd.config?.price) {
            // Parse price string like "$0.20" to USDC amount (6 decimals)
            const price = cmd.config.price
            const priceStr =
                typeof price === 'string' || typeof price === 'number'
                    ? String(price).replace(/[$,]/g, '')
                    : JSON.stringify(price).replace(/[$,]/g, '')
            const priceAmount = parseUnits(priceStr, 6)
            paymentCommands.set(cmd.name, {
                price: priceAmount,
                network: cmd.config.network,
                description: cmd.description,
            })
        }
    }

    /**
     * Handle incoming payment signatures
     * Validates signature via facilitator, settles payment, then executes command
     */
    async function handlePaymentResponse(
        handler: BotHandler,
        event: BasePayload & {
            response: {
                payload?: {
                    content?: {
                        case?: string
                        value?: { requestId?: string; signature?: string }
                    }
                }
            }
        },
    ) {
        try {
            const { response, channelId } = event

            // Check if this is a signature response
            if (response.payload?.content?.case !== 'signature') {
                return // Not a signature, ignore
            }

            const signatureId = response.payload.content.value?.requestId ?? ''
            const signature = (response.payload.content.value?.signature ?? '') as Hex

            if (!signatureId || !signature) {
                await handler.sendMessage(channelId, '❌ Invalid signature response format')
                return
            }

            // Check if this is a pending payment
            const pending = pendingPayments.get(signatureId)
            if (!pending) {
                return // Not a payment signature, might be something else
            }

            // Remove from pending
            pendingPayments.delete(signatureId)

            // Build PaymentPayload for x402
            const paymentPayload: PaymentPayload = {
                x402Version: 1,
                scheme: 'exact',
                network: chainIdToNetwork(pending.params.chainId),
                payload: {
                    signature: signature,
                    authorization: {
                        from: pending.params.from as string,
                        to: pending.params.to as string,
                        value: pending.params.value.toString(),
                        validAfter: pending.params.validAfter.toString(),
                        validBefore: pending.params.validBefore.toString(),
                        nonce: pending.params.nonce as string,
                    },
                },
            }

            // Build PaymentRequirements for x402
            const paymentRequirements: PaymentRequirements = {
                scheme: 'exact',
                network: paymentPayload.network,
                maxAmountRequired: pending.params.value.toString(),
                resource: `/command/${pending.command}`,
                description: `Payment for /${pending.command}`,
                mimeType: 'application/json',
                payTo: pending.params.to,
                maxTimeoutSeconds: 300,
                asset: pending.params.verifyingContract, // Use USDC address from params
            }

            // Step 1: Verify signature via facilitator
            await handler.sendMessage(channelId, '🔍 Verifying payment...')

            const verifyResult = await facilitator.verify(paymentPayload, paymentRequirements)

            if (!verifyResult.isValid) {
                await handler.sendMessage(
                    channelId,
                    `❌ Payment verification failed: ${
                        verifyResult.invalidReason || 'Unknown error'
                    }`,
                )
                return
            }

            // Step 2: Settle payment via facilitator (executes onchain transfer)
            await handler.sendMessage(
                channelId,
                `✅ Payment verified! Settling ${formatUnits(
                    pending.params.value,
                    6,
                )} USDC transfer...`,
            )

            const settleResult = await facilitator.settle(paymentPayload, paymentRequirements)

            if (!settleResult.success) {
                await handler.sendMessage(
                    channelId,
                    `❌ Payment settlement failed: ${settleResult.errorReason || 'Unknown error'}`,
                )
                return
            }

            // Step 3: Payment settled successfully! Execute the original command
            await handler.sendMessage(
                channelId,
                `✅ Payment settled!\nTransaction: ${settleResult.transaction}\nExecuting command...`,
            )

            // Execute the actual command handler
            const originalHandler = handlers.get(pending.command)
            if (originalHandler) {
                await originalHandler(handler, pending.event)
            }
        } catch (error) {
            await handler.sendMessage(
                event.channelId,
                `❌ Payment processing failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            )
        }
    }

    // Wire up interaction response handler
    bot.onInteractionResponse(handlePaymentResponse)

    return {
        // Pass through all original bot methods
        ...bot,

        /**
         * Override onSlashCommand to intercept payment-gated commands
         */
        onSlashCommand(
            command: Commands[number]['name'],
            handler: BotEvents<Commands>['slashCommand'],
        ) {
            const paymentConfig = paymentCommands.get(command as string)

            if (!paymentConfig) {
                // Free command - register directly with bot
                return bot.onSlashCommand(command, handler)
            }

            // Paid command - store handler and intercept with payment flow
            handlers.set(command as string, handler)

            return bot.onSlashCommand(command, async (h, event) => {
                try {
                    // Get user's smart account address
                    // Type assertion: Commands extends PaymentCommand[] which extends PlainMessage<SlashCommand>[]
                    const accountAddress = await getSmartAccountFromUserId(
                        bot as unknown as Bot<PlainMessage<SlashCommand>[], Env>,
                        {
                            userId: event.userId,
                        },
                    )

                    // If no smart account found, throw an error instead of falling back
                    if (!accountAddress) {
                        await h.sendMessage(
                            event.channelId,
                            `❌ Could not find a smart account for your user. Please set up your account first.`,
                        )
                        return
                    }
                    const { signatureId, params } = await createPaymentRequest(
                        h,
                        event,
                        accountAddress,
                        bot.appAddress, // Bot receives the payment
                        paymentConfig.price,
                        `Payment Required: ${command}`,
                        `${formatUnits(paymentConfig.price, 6)} USDC to use /${command}`,
                        chainId, // From bot.viem.chain.id
                        usdcAddress, // From getUsdcAddress(chainId)
                    )

                    // Store pending payment with full event context
                    pendingPayments.set(signatureId, {
                        command: command as string,
                        channelId: event.channelId,
                        userId: event.userId,
                        event: event as any,
                        params,
                    })

                    await h.sendMessage(
                        event.channelId,
                        `💳 Payment request sent: ${formatUnits(
                            paymentConfig.price,
                            6,
                        )} USDC on ${network}\nPlease sign to continue...`,
                    )
                } catch (error) {
                    await h.sendMessage(
                        event.channelId,
                        `❌ Failed to request payment: ${
                            error instanceof Error ? error.message : 'Unknown error'
                        }`,
                    )
                }
            })
        },
    } as ExtendedBot<Commands>
}
