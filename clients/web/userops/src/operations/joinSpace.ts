import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { SmartAccountType, TimeTracker, TimeTrackerEvents } from '../types'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { getSignerAddress } from '../utils/getSignerAddress'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'
import { linkSmartAccountAndWaitForReceipt } from './linkSmartAccount'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'
import { encodeDataForLinkingSmartAccount } from '../utils/encodeDataForLinkingSmartAccount'

/**
 * Join a space, potentially linking a wallet if necessary
 */
export async function joinSpace(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    timeTracker: TimeTracker | undefined
    entryPointAddress: string | undefined
    factoryAddress: string | undefined
    aaRpcUrl: string
    smartAccount: TSmartAccount
    newAccountImplementationType: SmartAccountType
    fnArgs: Parameters<SpaceDapp['joinSpace']>
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
}) {
    const {
        spaceDapp,
        sendUserOp,
        timeTracker,
        aaRpcUrl,
        fnArgs,
        smartAccount,
        newAccountImplementationType,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [spaceId, recipient, signer] = fnArgs
    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const endGetAA = timeTracker?.startMeasurement(
        TimeTrackerEvents.JOIN_SPACE,
        'userops_get_abstract_account_address',
    )

    const abstractAccountAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        aaRpcUrl,
        newAccountImplementationType: smartAccount.type,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    })
    endGetAA?.()
    if (!abstractAccountAddress) {
        throw new Error('abstractAccountAddress is required')
    }

    const { price: membershipPrice } = await spaceDapp.getJoinSpacePriceDetails(spaceId)
    const callDataJoinSpace = space.Membership.encodeFunctionData('joinSpace', [recipient])

    const endCheckLink = timeTracker?.startMeasurement(
        TimeTrackerEvents.JOIN_SPACE,
        'userops_check_if_linked',
    )

    //////////////////////////////////////////////////////////////
    // Check if user has already deployed + linked smart account
    //////////////////////////////////////////////////////////////
    if (await spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
        endCheckLink?.()
        // they already have a linked wallet, just join the space
        const functionName = 'joinSpace'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Membership.interface,
            functionName,
        )

        const price = membershipPrice.toBigInt()

        return sendUserOp(
            {
                toAddress: space.Address,
                callData: callDataJoinSpace,
                value: price,
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy,
            },
            TimeTrackerEvents.JOIN_SPACE,
        )
    }
    endCheckLink?.()

    //////////////////////////////////////////////////////////////
    // New users, have not deployed + linked smart account yet
    //////////////////////////////////////////////////////////////

    // new users w/ simple accounts
    if (newAccountImplementationType === 'simple') {
        // if the user does not have a linked wallet, we need to link their smart account first b/c that is where the memberhship NFT will be minted
        // joinSpace might require a value, if the space has a fixed membership cost
        //
        // But SimpleAccount does not support executeBatch with values
        // A new user who is joining a paid space will encounter this scenario
        //
        // Therefore, we need to link the wallet first, then join the space
        // Another smart account contract should support this and allow for a single user operation
        await linkSmartAccountAndWaitForReceipt({
            abstractAccountAddress,
            sequenceName: TimeTrackerEvents.JOIN_SPACE,
            sendUserOp,
            spaceDapp,
            timeTracker,
            signer,
        })

        return sendUserOp(
            {
                toAddress: space.Address,
                value: membershipPrice.toBigInt(),
                callData: callDataJoinSpace,
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy: 'joinSpace',
            },
            TimeTrackerEvents.JOIN_SPACE,
        )
    }
    // new users w/ modular accounts
    else if (newAccountImplementationType === 'modular') {
        const callDataForLinkingSmartAccount = await encodeDataForLinkingSmartAccount(
            spaceDapp,
            signer,
            abstractAccountAddress,
        )
        return sendUserOp(
            {
                toAddress: [spaceDapp.walletLink.address, space.Address],
                value: [0n, membershipPrice.toBigInt()],
                callData: [callDataForLinkingSmartAccount, callDataJoinSpace],
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy: 'joinSpace',
            },
            TimeTrackerEvents.JOIN_SPACE,
        )
    } else {
        throw new Error('Invalid account implementation type')
    }
}
