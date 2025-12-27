import type { SmartAccountType } from '../types'

export function needsUpgrade(
  preferredType: SmartAccountType,
  currentType: SmartAccountType,
): boolean {
  return preferredType === 'modular' && currentType === 'simple'
}
