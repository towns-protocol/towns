import { SpaceDapp } from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { TimeTracker, TimeTrackerEvents } from '../types'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { getSignerAddress } from '../utils/getSignerAddress'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'
import { linkSmartAccountAndWaitForReceipt } from './linkSmartAccount'

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
    fnArgs: Parameters<SpaceDapp['joinSpace']>
}) {
    const { spaceDapp, sendUserOp, timeTracker, aaRpcUrl, fnArgs } = params
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

    if (await spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
        endCheckLink?.()
        // they already have a linked wallet, just join the space
        const functionName = 'joinSpace'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Membership.interface,
            functionName,
        )

        // TODO: determine if this simulation causes an additional signature in UX
        // try {
        //     // simulate the tx - throws an error second time you run it!
        //     await space.Membership.write(signer).callStatic.joinSpace(recipient)
        // } catch (error) {
        //     throw this.parseSpaceError(spaceId, error)
        // }

        return sendUserOp(
            {
                toAddress: space.Address,
                callData: callDataJoinSpace,
                value: membershipPrice.toBigInt(),
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy,
            },
            TimeTrackerEvents.JOIN_SPACE,
        )
    }
    endCheckLink?.()

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
