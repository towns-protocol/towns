import { userOpsStore } from '../userOpsStore'
import { CodeException } from '../errors'

/**
 * Set the confirm and deny functions in the userOpsStore
 * Subscribe to the userOpsStore to update the UI
 */
export function promptUser() {
    return new Promise((resolve, reject) => {
        userOpsStore.getState().setConfirmAndDeny(
            () => {
                userOpsStore.getState().clear()
                resolve('User confirmed!')
            },
            () => {
                userOpsStore.getState().clear()
                reject(
                    new CodeException({
                        message: 'User rejected user operation',
                        code: 'ACTION_REJECTED',
                        category: 'misc',
                    }),
                )
            },
        )
    })
}
