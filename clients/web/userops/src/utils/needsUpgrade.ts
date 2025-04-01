import { SmartAccountType } from '../types'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'

export const needsUpgrade = (
    newAccountImplementationType: SmartAccountType,
    smartAccount: TSmartAccount,
) => newAccountImplementationType === 'modular' && smartAccount.type === 'simple'
