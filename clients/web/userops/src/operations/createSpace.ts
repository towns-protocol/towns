import { UserOps } from '../UserOperations'
import { IArchitectBase, LegacySpaceInfoStruct, SpaceDapp } from '@towns-protocol/web3'
import { TimeTracker, TimeTrackerEvents } from '../types'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { getSignerAddress } from '../utils/getSignerAddress'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'
import { encodeDataForLinkingSmartAccount } from '../utils/encodeDataForLinkingSmartAccount'
import { linkSmartAccountAndWaitForReceipt } from './linkSmartAccount'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'
type Common = {
    spaceDapp: SpaceDapp | undefined
}

export async function createSpace(
    params: Common & {
        timeTracker: TimeTracker | undefined
        sendUserOp: UserOps['sendUserOp']
        entryPointAddress: string | undefined
        factoryAddress: string | undefined
        aaRpcUrl: string
        fnArgs: Parameters<SpaceDapp['createSpace']>
        smartAccount: TSmartAccount
        paymasterProxyUrl: string
        paymasterProxyAuthSecret: string
    },
) {
    const {
        spaceDapp,
        timeTracker,
        fnArgs,
        aaRpcUrl,
        sendUserOp,
        smartAccount,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [createpaceParams, signer] = fnArgs

    const prepaySupply = createpaceParams.prepaySupply ?? 0

    const spaceInfo: IArchitectBase.CreateSpaceStruct = {
        channel: {
            metadata: createpaceParams.channelName || '',
        },
        metadata: {
            name: createpaceParams.spaceName,
            uri: createpaceParams.uri,
            shortDescription: createpaceParams.shortDescription ?? '',
            longDescription: createpaceParams.longDescription ?? '',
        },
        membership: createpaceParams.membership,
        prepay: {
            supply: prepaySupply,
        },
    }

    const endGetAA = timeTracker?.startMeasurement(
        TimeTrackerEvents.CREATE_SPACE,
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

    // stackup-worker identifier,
    // fn is overloaded, but stackup-worker only checks "createSpaceWithPrepay"
    const createSpaceFnName = 'createSpaceWithPrepay'
    const createSpaceShim = spaceDapp.spaceRegistrar.CreateSpace

    const callDataCreateSpace = createSpaceShim.encodeFunctionData(
        'createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string),(uint256)))',
        [spaceInfo],
    )
    const toContractAddress = createSpaceShim.address

    const endLinkCheck = timeTracker?.startMeasurement(
        TimeTrackerEvents.CREATE_SPACE,
        'userops_check_if_linked',
    )

    const cost = (await spaceDapp.platformRequirements.getMembershipFee()).mul(prepaySupply)

    const hasLinkedWallet = await spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)

    endLinkCheck?.()

    if (hasLinkedWallet) {
        const functionHashForPaymasterProxy = getFunctionSigHash(
            createSpaceShim.interface,
            createSpaceFnName,
        )

        return await sendUserOp(
            {
                toAddress: toContractAddress,
                callData: callDataCreateSpace,
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
                value: cost.toBigInt(),
            },
            TimeTrackerEvents.CREATE_SPACE,
        )
    } else if (cost.eq(0)) {
        // wallet isn't linked, create a user op that both links and creates the space
        const functionHashForPaymasterProxy = getFunctionSigHash(
            createSpaceShim.interface,
            'createSpace_linkWallet',
        )

        const callDataForLinkingSmartAccount = await encodeDataForLinkingSmartAccount(
            spaceDapp,
            signer,
            abstractAccountAddress,
        )

        return await sendUserOp(
            {
                toAddress: [spaceDapp.walletLink.address, toContractAddress],
                callData: [callDataForLinkingSmartAccount, callDataCreateSpace],
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
            },
            TimeTrackerEvents.CREATE_SPACE,
        )
    }
    // this only applies when doing prepaid seats and creating a town, which we don't support in the UI currently (we used to)
    else {
        await linkSmartAccountAndWaitForReceipt({
            abstractAccountAddress,
            sequenceName: TimeTrackerEvents.CREATE_SPACE,
            sendUserOp,
            spaceDapp,
            timeTracker,
            signer,
        })

        const functionHashForPaymasterProxy = getFunctionSigHash(
            createSpaceShim.interface,
            createSpaceFnName,
        )

        return await sendUserOp(
            {
                toAddress: toContractAddress,
                callData: callDataCreateSpace,
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
                value: cost.toBigInt(),
            },
            TimeTrackerEvents.CREATE_SPACE,
        )
    }
}

export async function createLegacySpace(
    params: Common & {
        sendUserOp: UserOps['sendUserOp']
        entryPointAddress: string | undefined
        factoryAddress: string | undefined
        aaRpcUrl: string
        fnArgs: Parameters<SpaceDapp['createLegacySpace']>
        smartAccount: TSmartAccount
        paymasterProxyUrl: string
        paymasterProxyAuthSecret: string
    },
) {
    const {
        spaceDapp,
        fnArgs,
        aaRpcUrl,
        sendUserOp,
        smartAccount,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const [createLegacySpaceParams, signer] = fnArgs

    const spaceInfo: LegacySpaceInfoStruct = {
        name: createLegacySpaceParams.spaceName,
        uri: createLegacySpaceParams.uri,
        shortDescription: createLegacySpaceParams.shortDescription ?? '',
        longDescription: createLegacySpaceParams.longDescription ?? '',
        membership: createLegacySpaceParams.membership,
        channel: {
            metadata: createLegacySpaceParams.channelName || '',
        },
    }

    const abstractAccountAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        aaRpcUrl,
        newAccountImplementationType: smartAccount.type,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    })

    if (!abstractAccountAddress) {
        throw new Error('abstractAccountAddress is required')
    }

    const createSpaceFnName = 'createSpace'

    const callDataCreateSpace = spaceDapp.spaceRegistrar.LegacySpaceArchitect.encodeFunctionData(
        createSpaceFnName,
        [spaceInfo],
    )

    if (await spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
        const functionHashForPaymasterProxy = getFunctionSigHash(
            spaceDapp.spaceRegistrar.LegacySpaceArchitect.interface,
            createSpaceFnName,
        )

        const op = await sendUserOp(
            {
                toAddress: spaceDapp.spaceRegistrar.LegacySpaceArchitect.address,
                callData: callDataCreateSpace,
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
            },
            TimeTrackerEvents.CREATE_SPACE,
        )
        return op
    }

    // wallet isn't linked, create a user op that both links and creates the space
    const functionName = 'createSpace_linkWallet'

    // TODO: this needs to accept an array of names/interfaces
    const functionHashForPaymasterProxy = getFunctionSigHash(
        spaceDapp.spaceRegistrar.LegacySpaceArchitect.interface,
        functionName,
    )

    const callDataForLinkingSmartAccount = await encodeDataForLinkingSmartAccount(
        spaceDapp,
        signer,
        abstractAccountAddress,
    )

    const op = await sendUserOp(
        {
            toAddress: [
                spaceDapp.walletLink.address,
                spaceDapp.spaceRegistrar.LegacySpaceArchitect.address,
            ],
            callData: [callDataForLinkingSmartAccount, callDataCreateSpace],
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        },
        TimeTrackerEvents.CREATE_SPACE,
    )
    return op
}
