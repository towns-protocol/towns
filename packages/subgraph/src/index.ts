import { eq, sql, and } from 'ponder'
import { ponder } from './metrics' // Use wrapped ponder with metrics
import schema from 'ponder:schema'
import {
    getReadSpaceInfoBlockNumber,
    handleStakeToSpace,
    handleRedelegation,
    decodePermissions,
} from './utils'

const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const

ponder.on('SpaceFactory:SpaceCreated', async ({ event, context }) => {
    // Get a block number suitable for reading the SpaceOwner contract
    const blockNumber = await getReadSpaceInfoBlockNumber(event.block.number)
    const { SpaceOwner } = context.contracts

    try {
        // Fetch space info from contract
        const space = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber,
        })

        // Use INSERT ... ON CONFLICT DO NOTHING
        // id is the primary key for spaces
        await context.db
            .insert(schema.space)
            .values({
                id: event.args.space,
                owner: event.args.owner,
                tokenId: event.args.tokenId,
                memberCount: 1n, // the first member is the owner
                name: space.name,
                nameLowercased: space.name.toLowerCase(),
                uri: space.uri,
                shortDescription: space.shortDescription,
                longDescription: space.longDescription,
                createdAt: space.createdAt,
                paused: false, // Newly created spaces are not paused
            })
            .onConflictDoNothing()
    } catch (error) {
        console.error(
            `Error processing SpaceFactory:SpaceCreated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('SpaceOwner:SpaceOwner__UpdateSpace', async ({ event, context }) => {
    // Get a block number suitable for reading the SpaceOwner contract
    const blockNumber = await getReadSpaceInfoBlockNumber(event.block.number)
    const { SpaceFactory, SpaceOwner } = context.contracts

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (!space) {
        console.warn(`Space not found for SpaceOwner:SpaceOwner__UpdateSpace`, event.args.space)
        return
    }

    try {
        // Parallelize contract reads using Promise.all
        const [paused, spaceInfo] = await Promise.all([
            context.client.readContract({
                abi: SpaceFactory.abi,
                address: event.args.space,
                functionName: 'paused',
                args: [],
                blockNumber,
            }),
            context.client.readContract({
                abi: SpaceOwner.abi,
                address: SpaceOwner.address,
                functionName: 'getSpaceInfo',
                args: [event.args.space],
                blockNumber,
            }),
        ])

        await context.db.sql
            .update(schema.space)
            .set({
                paused: paused,
                name: spaceInfo.name,
                nameLowercased: spaceInfo.name.toLowerCase(),
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

ponder.on('SpaceOwner:Transfer', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number

    try {
        // Note: SpaceOwner:Transfer events are emitted during the space creation process,
        // often BEFORE the SpaceFactory:SpaceCreated event is processed. This is because
        // the NFT minting (which triggers Transfer) happens as part of the space initialization
        // sequence. Therefore, it's normal and expected that many Transfer events won't find
        // a corresponding space in the database yet.
        //
        // We directly update without checking existence - if the space doesn't exist yet,
        // the UPDATE will affect 0 rows (harmless). The space will be created when
        // SpaceFactory:SpaceCreated is processed, with the correct owner already set.
        await context.db.sql
            .update(schema.space)
            .set({
                owner: event.args.to,
            })
            .where(eq(schema.space.tokenId, event.args.tokenId))
    } catch (error) {
        console.error(`Error processing SpaceOwner:Transfer at blockNumber ${blockNumber}:`, error)
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
                collectPosterFeeToSpace: event.args.forwardPosterFee,
                createdAt: blockNumber,
            })
            .where(eq(schema.swapFee.spaceId, spaceId))

        if (result.changes === 0) {
            // Insert a new record if it doesn't exist
            await context.db.insert(schema.swapFee).values({
                spaceId: spaceId,
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.forwardPosterFee,
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

    try {
        // Calculate ETH amount for analytics
        let ethAmount = 0n
        if ((event.args.tokenIn as string).toLowerCase() === ETH_ADDRESS) {
            ethAmount = event.args.amountIn
        } else if ((event.args.tokenOut as string).toLowerCase() === ETH_ADDRESS) {
            ethAmount = event.args.amountOut
        }

        // Use INSERT ... ON CONFLICT DO NOTHING for swap table
        // txHash is the primary key
        await context.db
            .insert(schema.swap)
            .values({
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
            .onConflictDoNothing()

        // Use INSERT ... ON CONFLICT DO NOTHING for analytics event
        // This leverages the existing primary key constraint (txHash, logIndex)
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: transactionHash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'swap',
                blockTimestamp: blockTimestamp,
                ethAmount: ethAmount,
                eventData: {
                    type: 'swap',
                    tokenIn: event.args.tokenIn,
                    tokenOut: event.args.tokenOut,
                    amountIn: event.args.amountIn.toString(),
                    amountOut: event.args.amountOut.toString(),
                    recipient: event.args.recipient,
                    poster: event.args.poster,
                },
            })
            .onConflictDoNothing()

        // Directly update space metrics with inline calculations
        // This eliminates the need to query current values first
        await context.db.sql
            .update(schema.space)
            .set({
                swapVolume: sql`COALESCE(${schema.space.swapVolume}, 0) + ${ethAmount}`,
            })
            .where(eq(schema.space.id, spaceId))
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
        // Use INSERT ... ON CONFLICT DO NOTHING
        // txHash is the primary key
        await context.db
            .insert(schema.swapRouterSwap)
            .values({
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
            .onConflictDoNothing()
    } catch (error) {
        console.error(`Error processing SwapRouter:Swap at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('SwapRouter:FeeDistribution', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // Use INSERT ... ON CONFLICT DO NOTHING
        // txHash is the primary key
        await context.db
            .insert(schema.feeDistribution)
            .values({
                txHash: transactionHash,
                token: event.args.token,
                treasury: event.args.protocol,
                poster: event.args.poster,
                treasuryAmount: event.args.protocolAmount,
                posterAmount: event.args.posterAmount,
                createdAt: blockNumber,
            })
            .onConflictDoNothing()
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
        // Use INSERT ... ON CONFLICT DO NOTHING
        // txHash is the primary key
        await context.db
            .insert(schema.swapRouter)
            .values({
                txHash: transactionHash,
                spaceFactory: event.args.spaceFactory,
                createdAt: blockNumber,
            })
            .onConflictDoNothing()
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
                    amount: existingStake.amount + event.args.amount,
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
                existingStake.amount,
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
                await handleStakeToSpace(context, existingStake.delegatee, 0n - withdrawAmount)
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

ponder.on('AppRegistry:AppCreated', async ({ event, context }) => {
    const blockNumber = event.block.number
    const { AppRegistry } = context.contracts

    try {
        const existingApp = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, event.args.app),
        })
        if (existingApp) {
            console.warn(`App already exists for AppRegistry:AppCreated`, event.args.uid)
            return
        }

        const appDetails = await context.client.readContract({
            abi: AppRegistry.abi,
            address: AppRegistry.address,
            functionName: 'getAppById',
            args: [event.args.uid],
            blockNumber,
        })
        const decodedPermissions = decodePermissions(appDetails.permissions)
        await context.db.insert(schema.app).values({
            address: event.args.app,
            appId: event.args.uid,
            client: appDetails.client,
            module: appDetails.module,
            owner: appDetails.owner,
            createdAt: blockNumber,
            permissions: decodedPermissions,
            isRegistered: false,
            isBanned: false,
            installedIn: [],
        })
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppCreated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppRegistered', async ({ event, context }) => {
    const blockNumber = event.block.number
    const { AppRegistry } = context.contracts

    try {
        const existingApp = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, event.args.app),
        })

        if (existingApp) {
            // App exists, just update registration status
            await context.db.sql
                .update(schema.app)
                .set({
                    isRegistered: true,
                    appId: event.args.uid, // Update appId in case it wasn't set
                })
                .where(eq(schema.app.address, event.args.app))
        } else {
            // App doesn't exist yet (AppRegistered fired before AppCreated)
            const appDetails = await context.client.readContract({
                abi: AppRegistry.abi,
                address: AppRegistry.address,
                functionName: 'getAppById',
                args: [event.args.uid],
                blockNumber,
            })
            const decodedPermissions = decodePermissions(appDetails.permissions)
            await context.db.insert(schema.app).values({
                address: event.args.app,
                appId: event.args.uid,
                client: appDetails.client,
                module: appDetails.module,
                owner: appDetails.owner,
                createdAt: blockNumber,
                permissions: decodedPermissions,
                isRegistered: true,
                isBanned: false,
                installedIn: [],
            })
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppRegistered at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppUnregistered', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existingApp = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, event.args.app),
        })
        if (existingApp) {
            await context.db.sql
                .update(schema.app)
                .set({ isRegistered: false })
                .where(eq(schema.app.address, event.args.app))
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppUnregistered at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppBanned', async ({ event, context }) => {
    const blockNumber = event.block.number

    try {
        const existingApp = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, event.args.app),
        })
        if (existingApp) {
            await context.db.sql
                .update(schema.app)
                .set({ isBanned: true })
                .where(eq(schema.app.address, event.args.app))
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppBanned at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppInstalled', async ({ event, context }) => {
    const blockNumber = event.block.number
    try {
        const result = await context.db.sql
            .update(schema.app)
            .set({
                installedIn: sql`
                    CASE
                        WHEN NOT COALESCE(${schema.app.installedIn}, '{}') @> ARRAY[${event.args.account}]::text[]
                        THEN COALESCE(${schema.app.installedIn}, '{}') || ${event.args.account}::text
                        ELSE ${schema.app.installedIn}
                    END
                `,
            })
            .where(eq(schema.app.appId, event.args.appId))
        if (result.changes === 0) {
            console.warn(`App not found for AppRegistry:AppInstalled`, event.args.appId)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppInstalled at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppUninstalled', async ({ event, context }) => {
    const blockNumber = event.block.number
    try {
        const result = await context.db.sql
            .update(schema.app)
            .set({
                installedIn: sql`array_remove(COALESCE(${schema.app.installedIn}, '{}'), ${event.args.account}::text)`,
            })
            .where(eq(schema.app.appId, event.args.appId))
        if (result.changes === 0) {
            console.warn(`App not found for AppRegistry:AppUninstalled`, event.args.appId)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppUninstalled at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:MembershipTokenIssued', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const spaceId = event.log.address // The space contract that emitted the event

        // Get the ETH amount from the transaction value (payment to join)
        const ethAmount = event.transaction.value || 0n

        // Use INSERT ... ON CONFLICT DO NOTHING for the analytics event
        // This leverages the existing primary key constraint (txHash, logIndex)
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'join',
                blockTimestamp: blockTimestamp,
                ethAmount: ethAmount,
                eventData: {
                    type: 'join',
                    recipient: event.args.recipient,
                    tokenId: event.args.tokenId.toString(),
                },
            })
            .onConflictDoNothing()

        // Directly update space metrics with inline calculations
        // This eliminates the need to query current values first
        await context.db.sql
            .update(schema.space)
            .set({
                joinVolume: sql`COALESCE(${schema.space.joinVolume}, 0) + ${ethAmount}`,
                memberCount: sql`COALESCE(${schema.space.memberCount}, 0) + 1`,
            })
            .where(eq(schema.space.id, spaceId))
    } catch (error) {
        console.error(
            `Error processing Space:MembershipTokenIssued at timestamp ${blockTimestamp}:`,
            error,
        )
    }
})

ponder.on('Space:Tip', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const spaceId = event.log.address // The space contract that emitted the event

        let ethAmount = 0n
        if ((event.args.currency as string).toLowerCase() === ETH_ADDRESS) {
            ethAmount = event.args.amount
        }

        // Use INSERT ... ON CONFLICT DO NOTHING for the analytics event
        // This leverages the existing primary key constraint (txHash, logIndex)
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'tip',
                blockTimestamp: blockTimestamp,
                ethAmount: ethAmount,
                eventData: {
                    type: 'tip',
                    sender: event.args.sender,
                    receiver: event.args.receiver,
                    currency: event.args.currency,
                    amount: event.args.amount.toString(),
                    tokenId: event.args.tokenId.toString(),
                    messageId: event.args.messageId,
                    channelId: event.args.channelId,
                },
            })
            .onConflictDoNothing()

        // Directly update space metrics with inline calculations
        // This eliminates the need to query current values first
        await context.db.sql
            .update(schema.space)
            .set({
                tipVolume: sql`COALESCE(${schema.space.tipVolume}, 0) + ${ethAmount}`,
            })
            .where(eq(schema.space.id, spaceId))
    } catch (error) {
        console.error(`Error processing Space:Tip at timestamp ${blockTimestamp}:`, error)
    }
})

ponder.on('Space:ReviewAdded', async ({ event, context }) => {
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address

    try {
        // Use INSERT ... ON CONFLICT DO NOTHING for review
        // The primary key is (spaceId, user)
        await context.db
            .insert(schema.review)
            .values({
                spaceId: spaceId,
                user: event.args.user,
                comment: event.args.comment,
                rating: event.args.rating,
                createdAt: blockTimestamp,
                updatedAt: blockTimestamp,
            })
            .onConflictDoNothing()

        // Add analytics event for the review using ON CONFLICT DO NOTHING
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'review',
                blockTimestamp: blockTimestamp,
                ethAmount: 0n, // Reviews don't have ETH value
                eventData: {
                    type: 'review',
                    user: event.args.user,
                    rating: event.args.rating,
                    comment: event.args.comment,
                },
            })
            .onConflictDoNothing()
    } catch (error) {
        console.error(`Error processing Space:ReviewAdded at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('Space:ReviewUpdated', async ({ event, context }) => {
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address

    try {
        const result = await context.db.sql
            .update(schema.review)
            .set({
                comment: event.args.comment,
                rating: event.args.rating,
                updatedAt: blockTimestamp,
            })
            .where(and(eq(schema.review.spaceId, spaceId), eq(schema.review.user, event.args.user)))

        if (result.changes === 0) {
            // If the review doesn't exist, create it (edge case)
            console.warn(
                `Review not found for update, creating new review for user ${event.args.user} in space ${spaceId}`,
            )
            await context.db.insert(schema.review).values({
                spaceId: spaceId,
                user: event.args.user,
                comment: event.args.comment,
                rating: event.args.rating,
                createdAt: blockTimestamp,
                updatedAt: blockTimestamp,
            })
        }
    } catch (error) {
        console.error(`Error processing Space:ReviewUpdated at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('Space:ReviewDeleted', async ({ event, context }) => {
    const blockNumber = event.block.number
    const spaceId = event.log.address

    try {
        const result = await context.db.sql
            .delete(schema.review)
            .where(and(eq(schema.review.spaceId, spaceId), eq(schema.review.user, event.args.user)))

        if (result.changes === 0) {
            console.warn(
                `Review not found for deletion for user ${event.args.user} in space ${spaceId}`,
            )
        }
    } catch (error) {
        console.error(`Error processing Space:ReviewDeleted at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('SubscriptionModule:SubscriptionConfigured', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        // Note: If a user reconfigures a subscription with the same entityId,
        // this will overwrite the previous subscription record (matches contract behavior)
        await context.db
            .insert(schema.subscription)
            .values({
                account: event.args.account,
                entityId: event.args.entityId,
                space: event.args.space,
                tokenId: event.args.tokenId,
                totalSpent: 0n,
                nextRenewalTime: event.args.nextRenewalTime,
                lastRenewalTime: null, // Will be set on first renewal
                active: true,
                createdAt: blockTimestamp,
                updatedAt: blockTimestamp,
            })
            .onConflictDoUpdate({
                space: event.args.space,
                tokenId: event.args.tokenId,
                nextRenewalTime: event.args.nextRenewalTime,
                active: true,
                updatedAt: blockTimestamp,
            })
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionConfigured tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionPaused', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                active: false,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for pause: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionPaused tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionActivated', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                active: true,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for activation: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionActivated tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionRenewed', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                nextRenewalTime: event.args.nextRenewalTime,
                lastRenewalTime: blockTimestamp,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for renewal: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionRenewed tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionSynced', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                nextRenewalTime: event.args.newNextRenewalTime,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for sync: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionSynced tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionDeactivated', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                active: false,
                nextRenewalTime: 0n,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for deactivation: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionDeactivated tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionSpent', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const result = await context.db.sql
            .update(schema.subscription)
            .set({
                totalSpent: event.args.totalSpent,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )

        if (result.changes === 0) {
            console.warn(
                `Subscription not found for spent update: ${event.args.account}_${event.args.entityId}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionSpent tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:BatchRenewalSkipped', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        // Record the failure
        await context.db.insert(schema.subscriptionFailure).values({
            account: event.args.account,
            entityId: event.args.entityId,
            timestamp: blockTimestamp,
            reason: event.args.reason,
        })

        await context.db.sql
            .update(schema.subscription)
            .set({
                active: false,
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.account, event.args.account),
                    eq(schema.subscription.entityId, event.args.entityId),
                ),
            )
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:BatchRenewalSkipped tx ${event.transaction.hash}:`,
            error,
        )
    }
})

ponder.on('SubscriptionModule:SubscriptionNotDue', async ({ event }) => {
    const blockTimestamp = event.block.timestamp

    try {
        // Log the event for monitoring but don't update the subscription
        // This event indicates the subscription renewal was attempted but not due yet
        console.log(
            `Subscription renewal not due for ${event.args.account}_${event.args.entityId} at ${blockTimestamp}`,
        )

        // Optionally, we could track these events in a separate table for analytics
        // For now, just log them as they don't affect the subscription state
    } catch (error) {
        console.error(
            `Error processing SubscriptionModule:SubscriptionNotDue tx ${event.transaction.hash}:`,
            error,
        )
    }
})

// ERC5643 SubscriptionUpdate, emitted whenever the expiration date of a subscription is changed
// https://eips.ethereum.org/EIPS/eip-5643
ponder.on('Space:SubscriptionUpdate', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address
    const tokenId = event.args.tokenId

    try {
        // Only update the timestamp, not the renewal times
        // The SubscriptionModule events handle nextRenewalTime and lastRenewalTime properly
        await context.db.sql
            .update(schema.subscription)
            .set({
                updatedAt: blockTimestamp,
            })
            .where(
                and(
                    eq(schema.subscription.space, spaceId),
                    eq(schema.subscription.tokenId, tokenId),
                ),
            )
    } catch (error) {
        console.error(
            `Error processing Space:SubscriptionUpdate tx ${event.transaction.hash}:`,
            error,
        )
    }
})
