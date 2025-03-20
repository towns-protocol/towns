import { SetChannelPermissionOverridesParams, Space } from '@towns-protocol/web3'
import { getFunctionSigHash } from './getFunctionSigHash'

export function encodeSetChannelRoleOverrides(params: {
    space: Space
    contractParams: SetChannelPermissionOverridesParams
}) {
    const { space, contractParams } = params
    const functionName = 'setChannelPermissionOverrides'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const callData = space.Roles.encodeFunctionData(functionName, [
        contractParams.roleId,
        contractParams.channelId.startsWith('0x')
            ? contractParams.channelId
            : `0x${contractParams.channelId}`,
        contractParams.permissions,
    ])

    return { functionHashForPaymasterProxy, callData }
}
