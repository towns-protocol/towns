import { eq } from 'ponder'
import { ponder, type Context } from 'ponder:registry'
import schema from 'ponder:schema'
import { getLatestBlockNumber, handleStakeToSpace, handleRedelegation } from './utils'

ponder.on('SpaceFactory:SpaceCreated', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceFactory, SpaceOwner } = context.contracts

    // Check if the space already exists
    const existingSpace = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (existingSpace) {
        console.warn(`Space already exists for SpaceFactory:SpaceCreated`, event.args.space)
        return
    }

    try {
        const paused = await context.client.readContract({
            abi: SpaceFactory.abi,
            address: event.args.space,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })

        const space = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
        })

        await context.db.insert(schema.space).values({
            id: event.args.space,
            owner: event.args.owner,
            tokenId: event.args.tokenId,
            name: space.name,
            uri: space.uri,
            shortDescription: space.shortDescription,
            longDescription: space.longDescription,
            createdAt: space.createdAt,
            paused: paused,
        })
    } catch (error) {
        console.error(
            `Error processing SpaceFactory:SpaceCreated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('SpaceOwner:SpaceOwner__UpdateSpace', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceFactory, SpaceOwner } = context.contracts

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (!space) {
        console.warn(`Space not found for SpaceOwner:SpaceOwner__UpdateSpace`, event.args.space)
        return
    }

    try {
        const paused = await context.client.readContract({
            abi: SpaceFactory.abi,
            address: event.args.space,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })

        const spaceInfo = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
        })

        await context.db.sql
            .update(schema.space)
            .set({
                paused: paused,
                name: spaceInfo.name,
                uri: spaceInfo.uri,
                shortDescription: spaceInfo.shortDescription,
                longDescription: spaceInfo.longDescription,
            })
            .where(eq(schema.space.id, event.args.space))
    } catch (error) {
        console.error(
            `Error processing SpaceOwner:SpaceOwner__UpdateSpace at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:SwapFeeConfigUpdated', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const spaceId = event.log.address

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })
    if (!space) {
        console.warn(`Space not found for Space:SwapFeeConfigUpdated`, spaceId)
        return
    }
    try {
        // update swap fee table
        const result = await context.db.sql
            .update(schema.swapFee)
            .set({
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.collectPosterFeeToSpace,
                createdAt: blockNumber,
            })
            .where(eq(schema.swapFee.spaceId, spaceId))

        if (result.changes === 0) {
            // Insert a new record if it doesn't exist
            await context.db.insert(schema.swapFee).values({
                spaceId: spaceId,
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.collectPosterFeeToSpace,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing Space:SwapFeeConfigUpdated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:SwapExecuted', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address
    const transactionHash = event.transaction.hash

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
    })
    if (!space) {
        console.warn(`Space not found for Space:Swap`, spaceId)
        return
    }

    try {
        const existing = await context.db.sql.query.swap.findFirst({
            where: eq(schema.swap.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.swap).values({
                txHash: transactionHash,
                spaceId: spaceId,
                recipient: event.args.recipient,
                tokenIn: event.args.tokenIn,
                tokenOut: event.args.tokenOut,
                amountIn: event.args.amountIn,
                amountOut: event.args.amountOut,
                poster: event.args.poster,
                blockTimestamp: blockTimestamp,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(`Error processing Space:Swap at blockNumber ${blockNumber}:`, error)
    }
})
ponder.on('SwapRouter:Swap', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const transactionHash = event.transaction.hash

    try {
        // update swap router swap table
        const existing = await context.db.sql.query.swapRouterSwap.findFirst({
            where: eq(schema.swapRouterSwap.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.swapRouterSwap).values({
                txHash: transactionHash,
                router: event.args.router,
                caller: event.args.caller,
                tokenIn: event.args.tokenIn,
                tokenOut: event.args.tokenOut,
                amountIn: event.args.amountIn,
                amountOut: event.args.amountOut,
                recipient: event.args.recipient,
                blockTimestamp: blockTimestamp,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(`Error processing SwapRouter:Swap at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('SwapRouter:FeeDistribution', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // update fee distribution table
        const existing = await context.db.sql.query.feeDistribution.findFirst({
            where: eq(schema.feeDistribution.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.feeDistribution).values({
                txHash: transactionHash,
                token: event.args.token,
                treasury: event.args.treasury,
                poster: event.args.poster,
                treasuryAmount: event.args.treasuryAmount,
                posterAmount: event.args.posterAmount,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing SwapRouter:FeeDistribution at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('SwapRouter:SwapRouterInitialized', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // update swap router onchainTable
        const existing = await context.db.sql.query.swapRouter.findFirst({
            where: eq(schema.swapRouter.txHash, transactionHash),
        })
        if (!existing) {
            await context.db.insert(schema.swapRouter).values({
                txHash: transactionHash,
                spaceFactory: event.args.spaceFactory,
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing SwapRouter:SwapRouterInitialized at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

// Event handlers remain the same but now use properly typed context
ponder.on('BaseRegistry:Stake', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existing = await context.db.sql.query.stakers.findFirst({
            where: eq(schema.stakers.depositId, event.args.depositId),
        })
        if (!existing) {
            await context.db.insert(schema.stakers).values({
                depositId: event.args.depositId,
                owner: event.args.owner,
                delegatee: event.args.delegatee,
                beneficiary: event.args.beneficiary,
                amount: event.args.amount,
                createdAt: blockNumber,
            })

            await handleStakeToSpace(
                context,
                event.args.delegatee as `0x${string}`,
                event.args.amount,
            )
        }
    } catch (error) {
        console.error(`Error processing StakingRewards:Stake at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('BaseRegistry:IncreaseStake', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        if (event.args.amount <= 0n) {
            console.warn(`Invalid increase amount: ${event.args.amount}`)
            return
        }

        const existingStake = await context.db.sql.query.stakers.findFirst({
            where: eq(schema.stakers.depositId, event.args.depositId),
        })

        if (existingStake) {
            await context.db.sql
                .update(schema.stakers)
                .set({
                    amount: (existingStake.amount ?? 0n) + event.args.amount,
                    createdAt: blockNumber,
                })
                .where(eq(schema.stakers.depositId, event.args.depositId))

            if (existingStake.delegatee) {
                await handleStakeToSpace(context, existingStake.delegatee, event.args.amount)
            }
        }
    } catch (error) {
        console.error(
            `Error processing BaseRegistry:IncreaseStake at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('BaseRegistry:Redelegate', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existingStake = await context.db.sql.query.stakers.findFirst({
            where: eq(schema.stakers.depositId, event.args.depositId),
        })

        if (existingStake) {
            // Add check for unnecessary redelegation
            if (existingStake.delegatee === event.args.delegatee) {
                console.warn(`Redelegation to same delegatee: ${event.args.delegatee}`)
                return
            }
            await handleRedelegation(
                context,
                existingStake.delegatee,
                event.args.delegatee as `0x${string}`,
                existingStake.amount ?? 0n,
            )

            await context.db.sql
                .update(schema.stakers)
                .set({
                    delegatee: event.args.delegatee,
                    createdAt: blockNumber,
                })
                .where(eq(schema.stakers.depositId, event.args.depositId))
        }
    } catch (error) {
        console.error(
            `Error processing BaseRegistry:Redelegate at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('BaseRegistry:Withdraw', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existingStake = await context.db.sql.query.stakers.findFirst({
            where: eq(schema.stakers.depositId, event.args.depositId),
        })

        if (existingStake && existingStake.amount !== null) {
            const withdrawAmount = event.args.amount
            const newAmount =
                existingStake.amount >= withdrawAmount ? existingStake.amount - withdrawAmount : 0n

            if (existingStake.delegatee) {
                await handleStakeToSpace(context, existingStake.delegatee, -withdrawAmount)
            }

            await context.db.sql
                .update(schema.stakers)
                .set({
                    amount: newAmount,
                    createdAt: blockNumber,
                })
                .where(eq(schema.stakers.depositId, event.args.depositId))
        }
    } catch (error) {
        console.error(
            `Error processing BaseRegistry:Withdraw at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('BaseRegistry:OperatorRegistered', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number

    try {
        const existing = await context.db.sql.query.operator.findFirst({
            where: eq(schema.operator.address, event.args.operator),
        })
        if (!existing) {
            await context.db.insert(schema.operator).values({
                address: event.args.operator,
                status: 0, // Initial status is always Standby per NodeOperatorFacet.sol
                createdAt: blockNumber,
            })
        }
    } catch (error) {
        console.error(
            `Error processing BaseRegistry:OperatorRegistered at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('BaseRegistry:OperatorStatusChanged', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number

    try {
        const existing = await context.db.sql.query.operator.findFirst({
            where: eq(schema.operator.address, event.args.operator),
        })
        if (existing) {
            await context.db.sql
                .update(schema.operator)
                .set({
                    status: event.args.newStatus, // Status is one of: Standby, Approved, Active, Exiting
                    createdAt: blockNumber,
                })
                .where(eq(schema.operator.address, event.args.operator))
        } else {
            console.warn(
                `No existing operator found for address ${event.args.operator} in OperatorStatusChanged event`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing BaseRegistry:OperatorStatusChanged at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('RiverAirdrop:Stake', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existing = await context.db.sql.query.stakers.findFirst({
            where: eq(schema.stakers.depositId, event.args.depositId),
        })
        if (!existing) {
            await context.db.insert(schema.stakers).values({
                depositId: event.args.depositId,
                owner: event.args.owner,
                delegatee: event.args.delegatee,
                beneficiary: event.args.beneficiary,
                amount: event.args.amount,
                createdAt: blockNumber,
            })

            await handleStakeToSpace(
                context,
                event.args.delegatee as `0x${string}`,
                event.args.amount,
            )
        }
    } catch (error) {
        console.error(`Error processing RiverAirdrop:Stake at blockNumber ${blockNumber}:`, error)
    }
})
