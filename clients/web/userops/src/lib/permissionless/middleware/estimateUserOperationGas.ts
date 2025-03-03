import {
    EstimateUserOperationGasParameters,
    UserOperation,
    estimateUserOperationGas as viemEstimateUserOperationGas,
} from 'viem/account-abstraction'
import { getAction } from 'viem/utils'
import { Account, PublicClient } from 'viem'
export const estimateUserOperationGas = async (
    userOp: UserOperation<'0.6'>,
    account: Account,
    publicClient: PublicClient,
) => {
    const { callGasLimit, preVerificationGas, verificationGasLimit, ...rest } = userOp
    const gas = await getAction(
        publicClient,
        viemEstimateUserOperationGas,
        'estimateUserOperationGas',
    )({
        account,
        // Some Bundlers fail if nullish gas values are provided for gas estimation :') –
        // so we will need to set a default zeroish value.
        callGasLimit: callGasLimit ?? 0n,
        preVerificationGas: preVerificationGas ?? 0n,
        verificationGasLimit: verificationGasLimit ?? 0n,
        ...rest,
    } as EstimateUserOperationGasParameters)

    return gas
}
