import { eq, sql, and } from 'ponder'
import { ponder } from './metrics' // Use wrapped ponder with metrics
import schema from 'ponder:schema'
import {
    getReadSpaceInfoBlockNumber,
    handleStakeToSpace,
    handleRedelegation,
    decodePermissions,
    ETH_ADDRESS,
    ZERO_ADDRESS,
    isUSDC,
    isETH,
    getSpaceCurrency,
    getSubscriptionSpaceCurrency,
} from './utils'
import { fetchAgentData } from './agentData'

const ENVIRONMENT = process.env.PONDER_ENVIRONMENT || 'alpha'

// Setup hook: Create critical indexes before indexing starts
// These indexes are needed during historic sync for performance
ponder.on('SpaceOwner:setup', async ({ context }) => {
    try {
        console.info('Creating critical indexes...')

        // Index for spaces.tokenId (used by SpaceOwner:Transfer UPDATE queries)
        await context.db.sql.execute(sql`
            CREATE INDEX IF NOT EXISTS spaces_tokenid_idx
            ON spaces (token_id)
        `)

        // Add more critical indexes here as needed
        // await context.db.execute(sql`CREATE INDEX IF NOT EXISTS ...`)

        console.info('✅ Critical indexes created successfully')
    } catch (error) {
        console.warn('⚠️ Failed to create indexes (may already exist):', error)
    }
})

ponder.on('SpaceFactory:SpaceCreated', async ({ event, context }) => {
    // Get a block number suitable for reading the SpaceOwner contract
    const blockNumber = await getReadSpaceInfoBlockNumber(event.block.number)
    const { SpaceOwner, Space } = context.contracts

    try {
        // Fetch space info and currency in parallel
        const [space, currency] = await Promise.all([
            context.client.readContract({
                abi: SpaceOwner.abi,
                address: SpaceOwner.address,
                functionName: 'getSpaceInfo',
                args: [event.args.space],
                blockNumber,
            }),
            context.client
                .readContract({
                    abi: Space.abi,
                    address: event.args.space,
                    functionName: 'getMembershipCurrency',
                    blockNumber,
                })
                .catch(() => ZERO_ADDRESS), // Default to zero on error (will be normalized to ETH)
        ])

        // Normalize currency: zero address means ETH
        const normalizedCurrency = currency === ZERO_ADDRESS ? ETH_ADDRESS : currency

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
                currency: normalizedCurrency, // Initialize currency cache
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

    const space = await context.db.find(schema.space, { id: event.args.space })
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

        await context.db.update(schema.space, { id: event.args.space }).set({
            paused: paused,
            name: spaceInfo.name,
            nameLowercased: spaceInfo.name.toLowerCase(),
            uri: spaceInfo.uri,
            shortDescription: spaceInfo.shortDescription,
            longDescription: spaceInfo.longDescription,
        })
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

// Handler for MembershipCurrencyUpdated - updates the cached currency on Space entity
ponder.on('Space:MembershipCurrencyUpdated', async ({ event, context }) => {
    const blockNumber = event.block.number
    const spaceId = event.log.address
    const newCurrency = event.args.currency

    try {
        // Normalize currency: zero address means ETH
        const normalizedCurrency = newCurrency === ZERO_ADDRESS ? ETH_ADDRESS : newCurrency

        const row = await context.db.update(schema.space, { id: spaceId }).set({
            currency: normalizedCurrency,
        })

        if (!row) {
            console.warn(
                `Space not found for MembershipCurrencyUpdated at block ${blockNumber}: ${spaceId}`,
            )
        } else {
            console.info(
                `Updated space ${spaceId} currency to ${normalizedCurrency} at block ${blockNumber}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing Space:MembershipCurrencyUpdated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('Space:SwapFeeConfigUpdated', async ({ event, context }) => {
    // Get block number
    const blockNumber = event.block.number
    const spaceId = event.log.address

    const space = await context.db.find(schema.space, { id: spaceId })
    if (!space) {
        console.warn(`Space not found for Space:SwapFeeConfigUpdated`, spaceId)
        return
    }
    try {
        // update swap fee table
        const existing = await context.db.find(schema.swapFee, { spaceId })
        if (existing) {
            await context.db.update(schema.swapFee, { spaceId }).set({
                posterFeeBps: event.args.posterFeeBps,
                collectPosterFeeToSpace: event.args.forwardPosterFee,
                createdAt: blockNumber,
            })
        } else {
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

        // Update space metrics using Store API function-based update
        await context.db.update(schema.space, { id: spaceId }).set((row) => ({
            swapVolume: (row.swapVolume ?? 0n) + ethAmount,
        }))
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
        const existing = await context.db.find(schema.stakers, {
            depositId: event.args.depositId,
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

        const existingStake = await context.db.find(schema.stakers, {
            depositId: event.args.depositId,
        })

        if (existingStake) {
            await context.db.update(schema.stakers, { depositId: event.args.depositId }).set({
                amount: existingStake.amount + event.args.amount,
                createdAt: blockNumber,
            })

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
        const existingStake = await context.db.find(schema.stakers, {
            depositId: event.args.depositId,
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

            await context.db.update(schema.stakers, { depositId: event.args.depositId }).set({
                delegatee: event.args.delegatee,
                createdAt: blockNumber,
            })
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
        const existingStake = await context.db.find(schema.stakers, {
            depositId: event.args.depositId,
        })

        if (existingStake && existingStake.amount !== null) {
            const withdrawAmount = event.args.amount
            const newAmount =
                existingStake.amount >= withdrawAmount ? existingStake.amount - withdrawAmount : 0n

            if (existingStake.delegatee) {
                await handleStakeToSpace(context, existingStake.delegatee, 0n - withdrawAmount)
            }

            await context.db.update(schema.stakers, { depositId: event.args.depositId }).set({
                amount: newAmount,
                createdAt: blockNumber,
            })
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
        const existing = await context.db.find(schema.operator, {
            address: event.args.operator,
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
        const existing = await context.db.find(schema.operator, {
            address: event.args.operator,
        })
        if (existing) {
            await context.db.update(schema.operator, { address: event.args.operator }).set({
                status: event.args.newStatus, // Status is one of: Standby, Approved, Active, Exiting
                createdAt: blockNumber,
            })
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
        const existing = await context.db.find(schema.stakers, {
            depositId: event.args.depositId,
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
        const existingApp = await context.db.find(schema.app, {
            address: event.args.app,
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
        const existingApp = await context.db.find(schema.app, {
            address: event.args.app,
        })

        if (existingApp) {
            // App exists, just update registration status
            await context.db.update(schema.app, { address: event.args.app }).set({
                isRegistered: true,
                appId: event.args.uid, // Update appId in case it wasn't set
            })
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
        const existingApp = await context.db.find(schema.app, {
            address: event.args.app,
        })
        if (existingApp) {
            await context.db.update(schema.app, { address: event.args.app }).set({
                isRegistered: false,
            })
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
        const existingApp = await context.db.find(schema.app, {
            address: event.args.app,
        })
        if (existingApp) {
            await context.db.update(schema.app, { address: event.args.app }).set({
                isBanned: true,
            })
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppBanned at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppInstalled', async ({ event, context }) => {
    const { app, account, appId } = event.args
    const { block, transaction, log } = event
    const blockNumber = event.block.number

    try {
        const existingApp = await context.db.find(schema.app, {
            address: app,
        })
        if (!existingApp) {
            console.warn(
                `Skipping AppInstalled: app ${app} not found at block ${blockNumber}. ` +
                    `AppInstalled may have fired before AppCreated.`,
            )
            return
        }

        // Create installation record (only if app exists)
        await context.db
            .insert(schema.appInstallation)
            .values({
                app,
                account,
                appId,
                installedAt: block.timestamp,
                installTxHash: transaction.hash,
                installLogIndex: log.logIndex,
                isActive: true,
            })
            .onConflictDoUpdate({
                // Handle re-installation after uninstall
                appId,
                installedAt: block.timestamp,
                installTxHash: transaction.hash,
                installLogIndex: log.logIndex,
                uninstalledAt: null,
                isActive: true,
            })

        // Also update the app.installedIn array for backward compatibility
        const result = await context.db.sql
            .update(schema.app)
            .set({
                installedIn: sql`
                    CASE
                        WHEN NOT COALESCE(${schema.app.installedIn}, '{}') @> ARRAY[${account}]::text[]
                        THEN COALESCE(${schema.app.installedIn}, '{}') || ${account}::text
                        ELSE ${schema.app.installedIn}
                    END
                `,
            })
            .where(eq(schema.app.address, app))

        if (result.changes === 0) {
            console.warn(`App not found for AppRegistry:AppInstalled`, app)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppInstalled at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppUninstalled', async ({ event, context }) => {
    const { app, account } = event.args
    const { block } = event
    const blockNumber = event.block.number

    try {
        // Soft delete installation record
        const installResult = await context.db
            .update(schema.appInstallation, { app, account })
            .set({
                uninstalledAt: block.timestamp,
                isActive: false,
            })

        if (!installResult) {
            console.warn(`No installation found for app ${app} in account ${account}`)
        }

        // Update app.installedIn array for backward compatibility
        const result = await context.db.sql
            .update(schema.app)
            .set({
                installedIn: sql`array_remove(COALESCE(${schema.app.installedIn}, '{}'), ${account}::text)`,
            })
            .where(eq(schema.app.address, app))

        if (result.changes === 0) {
            console.warn(`App not found for AppRegistry:AppUninstalled`, app)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppUninstalled at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppRenewed', async ({ event, context }) => {
    const { app, account, appId } = event.args
    const { block } = event
    const blockNumber = event.block.number

    try {
        const result = await context.db.update(schema.appInstallation, { app, account }).set({
            lastRenewedAt: block.timestamp,
            appId, // Update to current version if changed
        })

        if (!result) {
            console.warn(`No installation found for renewal: app ${app} in account ${account}`)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppRenewed at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppUpdated', async ({ event, context }) => {
    const { app, account, appId } = event.args
    const { block } = event
    const blockNumber = event.block.number

    try {
        // Update the installation record
        const result = await context.db.update(schema.appInstallation, { app, account }).set({
            lastUpdatedAt: block.timestamp,
            appId, // Update to new version/config
        })

        if (!result) {
            console.warn(`No installation found for update: app ${app} in account ${account}`)
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppUpdated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:AppUpgraded', async ({ event, context }) => {
    const { app, oldVersionId, newVersionId } = event.args
    const { block, transaction, log } = event
    const blockNumber = event.block.number

    try {
        // Mark old version as no longer latest or current
        await context.db.update(schema.appVersion, { app, appId: oldVersionId }).set({
            isLatest: false,
            isCurrent: false,
        })

        await context.db
            .insert(schema.appVersion)
            .values({
                appId: newVersionId,
                app,
                createdAt: block.timestamp,
                upgradedFromId: oldVersionId,
                txHash: transaction.hash,
                logIndex: log.logIndex,
                blockNumber: block.number,
                isLatest: true,
                isCurrent: true,
            })
            .onConflictDoUpdate({
                createdAt: block.timestamp,
                upgradedFromId: oldVersionId,
                txHash: transaction.hash,
                logIndex: log.logIndex,
                blockNumber: block.number,
                isLatest: true,
                isCurrent: true,
            })

        // Update app's current version (keep appId immutable as stable identifier)
        await context.db.update(schema.app, { address: app }).set({
            currentVersionId: newVersionId,
            lastUpdatedAt: block.timestamp,
        })
    } catch (error) {
        console.error(
            `Error processing AppRegistry:AppUpgraded at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

// ===== Agent Identity & Reputation Handlers =====

ponder.on('AppRegistry:Registered', async ({ event, context }) => {
    const { agentId, agentUri, owner } = event.args
    const blockTimestamp = event.block.timestamp
    const blockNumber = event.block.number
    const transactionHash = event.transaction.hash

    try {
        // Insert agent identity (owner is the app contract address)
        await context.db
            .insert(schema.agentIdentity)
            .values({
                app: owner, // FK to apps.address
                agentId: agentId,
                agentUri: agentUri || null,
                registeredAt: blockTimestamp,
                registeredAtBlock: blockNumber,
                updatedAt: null,
                transactionHash: transactionHash,
            })
            .onConflictDoNothing()

        // Fetch and store agent data if URI is provided
        if (agentUri) {
            console.info(
                `[AgentRegistered] Fetching agent data: agentId=${agentId}, app=${owner}, uri=${agentUri}`,
            )
            const agentData = await fetchAgentData(agentUri, 3, 1000, owner, ENVIRONMENT)
            if (agentData) {
                await context.db.update(schema.agentIdentity, { app: owner, agentId }).set({
                    agentData: agentData,
                })
                console.info(
                    `[AgentRegistered] Successfully stored agent data: agentId=${agentId}, app=${owner}`,
                )
            } else {
                console.warn(
                    `[AgentRegistered] Failed to fetch agent data: agentId=${agentId}, app=${owner}, uri=${agentUri}`,
                )
            }
        }

        // Initialize reputation summary
        await context.db
            .insert(schema.agentReputationSummary)
            .values({
                app: owner,
                agentId: agentId,
                totalFeedback: 0,
                activeFeedback: 0,
                revokedFeedback: 0,
                averageRating: null,
                totalResponses: 0,
                uniqueReviewers: 0,
                lastFeedbackAt: null,
            })
            .onConflictDoNothing()
    } catch (error) {
        console.error(
            `Error processing AppRegistry:Registered at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:UriUpdated', async ({ event, context }) => {
    const { agentId, agentUri } = event.args
    const blockTimestamp = event.block.timestamp
    const blockNumber = event.block.number

    try {
        // Find the agent identity by agentId
        const agent = await context.db.sql.query.agentIdentity.findFirst({
            where: eq(schema.agentIdentity.agentId, agentId),
        })

        if (!agent) {
            console.warn(`Agent identity not found for UriUpdated, agentId: ${agentId}`)
            return
        }

        // Fetch agent data from new URI with retries
        console.info(
            `[AgentUriUpdated] Updating URI: agentId=${agentId}, app=${agent.app}, ` +
                `oldUri=${agent.agentUri}, newUri=${agentUri}`,
        )
        const agentData = await fetchAgentData(agentUri, 3, 1000, agent.app, ENVIRONMENT)

        if (agentData !== null) {
            // Only update if fetch succeeds - keeps URI and data in sync
            await context.db.sql
                .update(schema.agentIdentity)
                .set({
                    agentUri: agentUri,
                    agentData: agentData,
                    updatedAt: blockTimestamp,
                })
                .where(
                    and(
                        eq(schema.agentIdentity.app, agent.app),
                        eq(schema.agentIdentity.agentId, agentId),
                    ),
                )
            console.info(
                `[AgentUriUpdated] Successfully updated agent data: agentId=${agentId}, app=${agent.app}`,
            )
        } else {
            console.warn(
                `[AgentUriUpdated] Skipping URI update due to fetch failure: ` +
                    `agentId=${agentId}, app=${agent.app}, attemptedUri=${agentUri}, keepingUri=${agent.agentUri}`,
            )
        }
    } catch (error) {
        console.error(
            `Error processing AppRegistry:UriUpdated at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:MetadataSet', async ({ event, context }) => {
    const { agentId, metadataKey, metadataValue } = event.args
    const blockTimestamp = event.block.timestamp
    const transactionHash = event.transaction.hash
    const blockNumber = event.block.number

    try {
        // Find the agent identity by agentId to get the app address
        const agent = await context.db.sql.query.agentIdentity.findFirst({
            where: eq(schema.agentIdentity.agentId, agentId),
        })

        if (!agent) {
            console.warn(`Agent identity not found for MetadataSet, agentId: ${agentId}`)
            return
        }

        // Upsert metadata
        await context.db
            .insert(schema.agentMetadata)
            .values({
                app: agent.app,
                metadataKey: metadataKey,
                metadataValue: metadataValue,
                setAt: blockTimestamp,
                transactionHash: transactionHash,
            })
            .onConflictDoUpdate({
                metadataValue: metadataValue,
                setAt: blockTimestamp,
                transactionHash: transactionHash,
            })
    } catch (error) {
        console.error(
            `Error processing AppRegistry:MetadataSet at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:NewFeedback', async ({ event, context }) => {
    const { agentId, reviewerAddress, score, tag1, tag2, feedbackUri, feedbackHash } = event.args
    const blockTimestamp = event.block.timestamp
    const transactionHash = event.transaction.hash
    const blockNumber = event.block.number

    try {
        // Get agent identity to find app address
        const agent = await context.db.sql.query.agentIdentity.findFirst({
            where: eq(schema.agentIdentity.agentId, agentId),
        })

        if (!agent) {
            console.error(`Agent identity not found for NewFeedback, agentId: ${agentId}`)
            return
        }

        // Determine feedback index (1-based, incremental per reviewer)
        const lastFeedback = await context.db.sql.query.agentFeedback.findFirst({
            where: and(
                eq(schema.agentFeedback.agentId, agentId),
                eq(schema.agentFeedback.reviewerAddress, reviewerAddress),
            ),
            orderBy: (table, { desc }) => desc(table.feedbackIndex),
        })

        const feedbackIndex = lastFeedback ? lastFeedback.feedbackIndex + 1n : 1n

        // Insert feedback
        await context.db
            .insert(schema.agentFeedback)
            .values({
                app: agent.app,
                agentId: agentId,
                reviewerAddress: reviewerAddress,
                feedbackIndex: feedbackIndex,
                rating: score,
                tag1: tag1,
                tag2: tag2,
                comment: feedbackUri,
                commentHash: feedbackHash,
                isRevoked: false,
                createdAt: blockTimestamp,
                revokedAt: null,
                transactionHash: transactionHash,
            })
            .onConflictDoNothing()

        // Recalculate reputation summary
        const activeFeedbackList = await context.db.sql.query.agentFeedback.findMany({
            where: and(
                eq(schema.agentFeedback.agentId, agentId),
                eq(schema.agentFeedback.isRevoked, false),
            ),
        })

        const totalRating = activeFeedbackList.reduce((sum, f) => sum + f.rating, 0)
        const count = activeFeedbackList.length
        const avgRating = count > 0 ? totalRating / count : null

        const uniqueReviewers = new Set(activeFeedbackList.map((f) => f.reviewerAddress)).size

        const totalCountResult = await context.db.sql
            .select({ count: sql<string>`COUNT(*)` })
            .from(schema.agentFeedback)
            .where(eq(schema.agentFeedback.agentId, agentId))

        const totalCount = Number(totalCountResult[0]?.count || 0)

        // Update summary
        await context.db.update(schema.agentReputationSummary, { app: agent.app }).set({
            totalFeedback: totalCount,
            activeFeedback: count,
            averageRating: avgRating,
            uniqueReviewers: uniqueReviewers,
            lastFeedbackAt: blockTimestamp,
        })
    } catch (error) {
        console.error(
            `Error processing AppRegistry:NewFeedback at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:FeedbackRevoked', async ({ event, context }) => {
    const { agentId, reviewerAddress, feedbackIndex } = event.args
    const blockTimestamp = event.block.timestamp
    const blockNumber = event.block.number

    try {
        // Get agent identity to find app address
        const agent = await context.db.sql.query.agentIdentity.findFirst({
            where: eq(schema.agentIdentity.agentId, agentId),
        })

        if (!agent) {
            console.error(`Agent identity not found for FeedbackRevoked, agentId: ${agentId}`)
            return
        }

        // Update feedback revoked status
        await context.db
            .update(schema.agentFeedback, { agentId, reviewerAddress, feedbackIndex })
            .set({
                isRevoked: true,
                revokedAt: blockTimestamp,
            })

        // Recalculate reputation summary (excluding revoked)
        const activeFeedbackList = await context.db.sql.query.agentFeedback.findMany({
            where: and(
                eq(schema.agentFeedback.agentId, agentId),
                eq(schema.agentFeedback.isRevoked, false),
            ),
        })

        const totalRating = activeFeedbackList.reduce((sum, f) => sum + f.rating, 0)
        const count = activeFeedbackList.length
        const avgRating = count > 0 ? totalRating / count : null

        const totalCountResult = await context.db.sql
            .select({ count: sql<string>`COUNT(*)` })
            .from(schema.agentFeedback)
            .where(eq(schema.agentFeedback.agentId, agentId))

        const revokedCountResult = await context.db.sql
            .select({ count: sql<string>`COUNT(*)` })
            .from(schema.agentFeedback)
            .where(
                and(
                    eq(schema.agentFeedback.agentId, agentId),
                    eq(schema.agentFeedback.isRevoked, true),
                ),
            )

        const totalCount = Number(totalCountResult[0]?.count || 0)
        const revokedCount = Number(revokedCountResult[0]?.count || 0)

        // Update summary
        await context.db.update(schema.agentReputationSummary, { app: agent.app }).set({
            totalFeedback: totalCount,
            activeFeedback: count,
            revokedFeedback: revokedCount,
            averageRating: avgRating,
        })
    } catch (error) {
        console.error(
            `Error processing AppRegistry:FeedbackRevoked at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

ponder.on('AppRegistry:ResponseAppended', async ({ event, context }) => {
    const { agentId, reviewerAddress, feedbackIndex, responder, responseUri, responseHash } =
        event.args
    const blockTimestamp = event.block.timestamp
    const transactionHash = event.transaction.hash
    const blockNumber = event.block.number

    try {
        // Get agent identity to find app address
        const agent = await context.db.sql.query.agentIdentity.findFirst({
            where: eq(schema.agentIdentity.agentId, agentId),
        })

        if (!agent) {
            console.error(`Agent identity not found for ResponseAppended, agentId: ${agentId}`)
            return
        }

        // Insert response (use createdAt in PK to allow multiple responses from same responder)
        await context.db
            .insert(schema.feedbackResponse)
            .values({
                app: agent.app,
                agentId: agentId,
                reviewerAddress: reviewerAddress,
                feedbackIndex: feedbackIndex,
                responderAddress: responder,
                comment: responseUri,
                commentHash: responseHash,
                createdAt: blockTimestamp,
                transactionHash: transactionHash,
            })
            .onConflictDoNothing()

        // Increment response count in summary
        await context.db
            .update(schema.agentReputationSummary, { app: agent.app })
            .set((existing: typeof schema.agentReputationSummary.$inferSelect) => ({
                totalResponses: (existing.totalResponses ?? 0) + 1,
            }))
    } catch (error) {
        console.error(
            `Error processing AppRegistry:ResponseAppended at blockNumber ${blockNumber}:`,
            error,
        )
    }
})

// Handler for MembershipTokenIssued - tracks new member count and upgrades renewal → join
// This event is only emitted for new memberships (not renewals)
// For paid joins: upgrades existing 'renewal' record to 'join' with recipient/tokenId
// Fallback INSERT for backwards compatibility with blocks indexed before MembershipPaid tracking
ponder.on('Space:MembershipTokenIssued', async ({ event, context }) => {
    const spaceId = event.log.address
    const txHash = event.transaction.hash
    const recipient = event.args.recipient
    const tokenId = event.args.tokenId.toString()
    const blockTimestamp = event.block.timestamp
    const ethAmount = event.transaction.value || 0n

    try {
        // Try to UPDATE existing 'renewal' record from MembershipPaid → upgrade to 'join'
        const updateResult = await context.db.sql
            .update(schema.analyticsEvent)
            .set({
                eventType: 'join',
                eventData: sql`(${schema.analyticsEvent.eventData})::jsonb ||
                    ${JSON.stringify({ type: 'join', recipient, tokenId })}::jsonb`,
            })
            .where(
                and(
                    eq(schema.analyticsEvent.txHash, txHash),
                    eq(schema.analyticsEvent.spaceId, spaceId),
                    eq(schema.analyticsEvent.eventType, 'renewal'),
                ),
            )

        // Fallback: INSERT if no 'renewal' record found (backwards compatibility)
        if (updateResult.changes === 0) {
            await context.db
                .insert(schema.analyticsEvent)
                .values({
                    txHash,
                    logIndex: event.log.logIndex,
                    spaceId,
                    eventType: 'join',
                    blockTimestamp,
                    ethAmount,
                    usdcAmount: 0n,
                    eventData: {
                        type: 'join',
                        recipient,
                        tokenId,
                    },
                })
                .onConflictDoNothing()
        }

        // Update memberCount using Store API function-based update
        await context.db.update(schema.space, { id: spaceId }).set((row) => ({
            memberCount: (row.memberCount ?? 0n) + 1n,
        }))
    } catch (error) {
        console.error(`Error processing Space:MembershipTokenIssued for space ${spaceId}:`, error)
    }
})

// Handler for MembershipPaid - tracks membership payment volumes
// This event is emitted for both new memberships and renewals
// Creates as 'renewal' initially - MembershipTokenIssued will upgrade to 'join' if token is issued
ponder.on('Space:MembershipPaid', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address
    const currency = event.args.currency as string
    const price = event.args.price
    const protocolFee = event.args.protocolFee
    const totalAmount = price + protocolFee

    try {
        // Determine currency type
        const currencyIsETH = isETH(currency)
        const currencyIsUSDC = isUSDC(currency, ENVIRONMENT)

        // Route amounts based on currency
        const ethAmount = currencyIsETH ? totalAmount : 0n
        const usdcAmount = currencyIsUSDC ? totalAmount : 0n

        // Record analytics event as 'renewal' initially
        // If MembershipTokenIssued follows in same tx, it will upgrade to 'join'
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'renewal',
                blockTimestamp: blockTimestamp,
                ethAmount: ethAmount,
                usdcAmount: usdcAmount,
                eventData: {
                    type: 'renewal',
                    currency: currency,
                    price: price.toString(),
                    protocolFee: protocolFee.toString(),
                    totalAmount: totalAmount.toString(),
                },
            })
            .onConflictDoNothing()

        // Update space membership volume metrics using Store API function-based update
        if (currencyIsETH) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                joinVolume: (row.joinVolume ?? 0n) + ethAmount,
            }))
        } else if (currencyIsUSDC) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                joinUSDCVolume: (row.joinUSDCVolume ?? 0n) + usdcAmount,
            }))
        }
    } catch (error) {
        console.error(
            `Error processing Space:MembershipPaid at timestamp ${blockTimestamp}:`,
            error,
        )
    }
})

ponder.on('Space:Tip', async ({ event, context }) => {
    const blockTimestamp = event.block.timestamp

    try {
        const spaceId = event.log.address // The space contract that emitted the event
        const sender = event.args.sender
        const currency = event.args.currency as string

        // Determine currency type and amounts
        const currencyIsETH = isETH(currency)
        const currencyIsUSDC = isUSDC(currency, ENVIRONMENT)
        const ethAmount = currencyIsETH ? event.args.amount : 0n
        const usdcAmount = currencyIsUSDC ? event.args.amount : 0n

        // Check if sender is a bot (exists in apps table)
        const senderApp = await context.db.find(schema.app, { address: sender })
        const senderType = senderApp ? 'Bot' : 'Member'

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
                usdcAmount: usdcAmount,
                eventData: {
                    type: 'tip',
                    sender: sender,
                    senderType: senderType,
                    receiver: event.args.receiver,
                    recipientType: 'Member',
                    currency: event.args.currency,
                    amount: event.args.amount.toString(),
                    tokenId: event.args.tokenId.toString(),
                    messageId: event.args.messageId,
                    channelId: event.args.channelId,
                },
            })
            .onConflictDoNothing()

        // Update space metrics - route to correct currency column using Store API
        if (currencyIsETH) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                tipVolume: (row.tipVolume ?? 0n) + ethAmount,
            }))
        } else if (currencyIsUSDC) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                tipUSDCVolume: (row.tipUSDCVolume ?? 0n) + usdcAmount,
            }))
        }

        // Update tip leaderboard for sender - route to correct columns
        const row = await context.db
            .update(schema.tipLeaderboard, { user: sender, spaceId })
            .set((existing: typeof schema.tipLeaderboard.$inferSelect) => ({
                tipsSentCount: (existing.tipsSentCount ?? 0) + 1,
                // Route amounts to correct currency columns
                ...(currencyIsETH && {
                    totalSent: (existing.totalSent ?? 0n) + ethAmount,
                }),
                ...(currencyIsUSDC && {
                    totalSentUSDC: (existing.totalSentUSDC ?? 0n) + usdcAmount,
                }),
                ...(senderType === 'Member' &&
                    currencyIsETH && {
                        memberTipsSent: (existing.memberTipsSent ?? 0) + 1,
                        memberTotalSent: (existing.memberTotalSent ?? 0n) + ethAmount,
                    }),
                ...(senderType === 'Member' &&
                    currencyIsUSDC && {
                        memberTotalSentUSDC: (existing.memberTotalSentUSDC ?? 0n) + usdcAmount,
                    }),
                lastActivity: blockTimestamp,
            }))

        if (!row) {
            await context.db.insert(schema.tipLeaderboard).values({
                user: sender,
                spaceId: spaceId,
                totalSent: currencyIsETH ? ethAmount : 0n,
                totalSentUSDC: currencyIsUSDC ? usdcAmount : 0n,
                tipsSentCount: 1,
                memberTipsSent: senderType === 'Member' ? 1 : 0,
                memberTotalSent: senderType === 'Member' && currencyIsETH ? ethAmount : 0n,
                memberTotalSentUSDC: senderType === 'Member' && currencyIsUSDC ? usdcAmount : 0n,
                botTipsSent: 0,
                botTotalSent: 0n,
                botTotalSentUSDC: 0n,
                lastActivity: blockTimestamp,
            })
        }
    } catch (error) {
        console.error(`Error processing Space:Tip at timestamp ${blockTimestamp}:`, error)
    }
})

ponder.on('Space:TipSent', async ({ event, context }) => {
    const { sender, receiver, recipientType, currency, amount } = event.args

    // Only handle bot tips (recipientType === 1)
    if (recipientType !== 1) return

    const blockTimestamp = event.block.timestamp
    const blockNumber = event.block.number
    const spaceId = event.log.address

    try {
        // Validate bot exists in app registry
        const app = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, receiver),
        })

        if (!app) {
            console.warn(
                `Bot tip sent to unregistered app at block ${blockNumber}. ` +
                    `Receiver: ${receiver}, Amount: ${amount}, Currency: ${currency}`,
            )
        } else if (
            !app.appId ||
            app.appId === '0x0000000000000000000000000000000000000000000000000000000000000000'
        ) {
            console.warn(
                `Bot tip sent to app without appId at block ${blockNumber}. ` +
                    `Receiver: ${receiver}, AppId: ${app.appId}`,
            )
        }

        // Determine currency type and amounts
        const currencyIsETH = isETH(currency)
        const currencyIsUSDC = isUSDC(currency, ENVIRONMENT)
        const ethAmount = currencyIsETH ? amount : 0n
        const usdcAmount = currencyIsUSDC ? amount : 0n

        // Check if sender is a bot (exists in apps table)
        const senderApp = await context.db.sql.query.app.findFirst({
            where: eq(schema.app.address, sender),
        })
        const senderType = senderApp ? 'Bot' : 'Member'

        // Insert analytics event
        await context.db
            .insert(schema.analyticsEvent)
            .values({
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                spaceId: spaceId,
                eventType: 'tip',
                blockTimestamp: blockTimestamp,
                ethAmount: ethAmount,
                usdcAmount: usdcAmount,
                eventData: {
                    type: 'tip',
                    sender,
                    senderType: senderType,
                    receiver,
                    recipientType: 'Bot',
                    currency,
                    amount: amount.toString(),
                },
            })
            .onConflictDoNothing()

        // Update space bot tip volume - route to correct column using Store API
        if (currencyIsETH) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                botTipVolume: (row.botTipVolume ?? 0n) + ethAmount,
            }))
        } else if (currencyIsUSDC) {
            await context.db.update(schema.space, { id: spaceId }).set((row) => ({
                botTipUSDCVolume: (row.botTipUSDCVolume ?? 0n) + usdcAmount,
            }))
        }

        // Update app tip metrics - route to correct column
        if (currencyIsETH) {
            await context.db
                .update(schema.app, { address: receiver })
                .set((existing: typeof schema.app.$inferSelect) => ({
                    tipsCount: (existing.tipsCount ?? 0n) + 1n,
                    tipsVolume: (existing.tipsVolume ?? 0n) + ethAmount,
                }))
        } else if (currencyIsUSDC) {
            await context.db
                .update(schema.app, { address: receiver })
                .set((existing: typeof schema.app.$inferSelect) => ({
                    tipsCount: (existing.tipsCount ?? 0n) + 1n,
                    tipsVolumeUSDC: (existing.tipsVolumeUSDC ?? 0n) + usdcAmount,
                }))
        }

        // Update tip leaderboard for sender (bot tips) - route to correct columns
        const leaderboardRow = await context.db
            .update(schema.tipLeaderboard, { user: sender, spaceId })
            .set((existing: typeof schema.tipLeaderboard.$inferSelect) => ({
                tipsSentCount: (existing.tipsSentCount ?? 0) + 1,
                botTipsSent: (existing.botTipsSent ?? 0) + 1,
                ...(currencyIsETH && {
                    totalSent: (existing.totalSent ?? 0n) + ethAmount,
                    botTotalSent: (existing.botTotalSent ?? 0n) + ethAmount,
                }),
                ...(currencyIsUSDC && {
                    totalSentUSDC: (existing.totalSentUSDC ?? 0n) + usdcAmount,
                    botTotalSentUSDC: (existing.botTotalSentUSDC ?? 0n) + usdcAmount,
                }),
                lastActivity: blockTimestamp,
            }))

        if (!leaderboardRow) {
            await context.db.insert(schema.tipLeaderboard).values({
                user: sender,
                spaceId: spaceId,
                totalSent: currencyIsETH ? ethAmount : 0n,
                totalSentUSDC: currencyIsUSDC ? usdcAmount : 0n,
                tipsSentCount: 1,
                memberTipsSent: 0,
                memberTotalSent: 0n,
                memberTotalSentUSDC: 0n,
                botTipsSent: 1,
                botTotalSent: currencyIsETH ? ethAmount : 0n,
                botTotalSentUSDC: currencyIsUSDC ? usdcAmount : 0n,
                lastActivity: blockTimestamp,
            })
        }
    } catch (error) {
        console.error(`Error processing Space:TipSent (bot tip) at block ${blockNumber}:`, error)
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
                ethAmount: 0n, // Reviews don't have monetary value
                usdcAmount: 0n,
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
        const row = await context.db.update(schema.review, { spaceId, user: event.args.user }).set({
            comment: event.args.comment,
            rating: event.args.rating,
            updatedAt: blockTimestamp,
        })

        if (!row) {
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
        const deleted = await context.db.delete(schema.review, {
            spaceId,
            user: event.args.user,
        })

        if (!deleted) {
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
    const blockNumber = event.block.number

    try {
        // Fetch currency for this subscription
        const currency = await getSpaceCurrency(
            context,
            event.args.space as `0x${string}`,
            blockNumber,
        )

        // Skip record if currency fetch failed (prefer no data to incorrect data)
        if (currency === null) {
            console.error(
                `Skipping SubscriptionConfigured for ${event.args.account}_${event.args.entityId}: ` +
                    `currency fetch failed`,
            )
            return
        }

        // Note: If a user reconfigures a subscription with the same entityId,
        // this will overwrite the previous subscription record (matches contract behavior)
        await context.db
            .insert(schema.subscription)
            .values({
                account: event.args.account,
                entityId: event.args.entityId,
                space: event.args.space,
                tokenId: event.args.tokenId,
                currency: currency,
                totalSpent: 0n,
                nextRenewalTime: event.args.nextRenewalTime,
                expiresAt: event.args.expiresAt,
                lastRenewalTime: null, // Will be set on first renewal
                active: true,
                createdAt: blockTimestamp,
                updatedAt: blockTimestamp,
            })
            .onConflictDoUpdate({
                space: event.args.space,
                tokenId: event.args.tokenId,
                currency: currency,
                nextRenewalTime: event.args.nextRenewalTime,
                expiresAt: event.args.expiresAt,
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                active: false,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                active: true,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                nextRenewalTime: event.args.nextRenewalTime,
                expiresAt: event.args.expiresAt,
                lastRenewalTime: blockTimestamp,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                nextRenewalTime: event.args.newNextRenewalTime,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                active: false,
                nextRenewalTime: 0n,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        const row = await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                renewalAmount: event.args.amount,
                totalSpent: event.args.totalSpent,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })

        if (!row) {
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
        const currency = await getSubscriptionSpaceCurrency(
            context,
            event.args.account,
            event.args.entityId,
            event.block.number,
        )

        // Record the failure
        await context.db.insert(schema.subscriptionFailure).values({
            account: event.args.account,
            entityId: event.args.entityId,
            timestamp: blockTimestamp,
            reason: event.args.reason,
        })

        await context.db
            .update(schema.subscription, {
                account: event.args.account,
                entityId: event.args.entityId,
            })
            .set({
                active: false,
                updatedAt: blockTimestamp,
                ...(currency !== null && { currency }),
            })
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
        // uses raw sql (slower) since spaceId, tokenId are not primary keys.
        // note: the preferred method that is 100x more efficient is to use the drizzle orm
        // see: https://ponder.sh/docs/indexing/write
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
