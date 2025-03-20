import { ClearChannelPermissionOverridesParams, Space } from '@towns-protocol/web3'
import { getFunctionSigHash } from './getFunctionSigHash'

export function encodeClearChannelRoleOverrides(params: {
    space: Space
    contractParams: ClearChannelPermissionOverridesParams
}) {
    const { space, contractParams } = params

    const functionName = 'clearChannelPermissionOverrides'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const callData = space.Roles.encodeFunctionData(functionName, [
        contractParams.roleId,
        contractParams.channelId.startsWith('0x')
            ? contractParams.channelId
            : `0x${contractParams.channelId}`,
    ])

    return { functionHashForPaymasterProxy, callData }
}
