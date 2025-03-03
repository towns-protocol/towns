import { selectUserOpsByAddress, userOpsStore } from '../store/userOpsStore'
import { CodeException } from '../errors'

/**
 * Set the confirm and deny functions in the userOpsStore
 * Subscribe to the userOpsStore to update the UI
 */
export async function promptUser(sender: string) {
    const { setPromptUser, setPromptResponse } = userOpsStore.getState()
    setPromptUser(sender, true)

    try {
        const response = await waitForUserResponse(sender)
        if (response !== 'confirm') {
            throw new CodeException({
                message: 'User rejected user operation',
                code: 'ACTION_REJECTED',
                category: 'misc',
            })
        }
    } finally {
        setPromptUser(sender, false)
        setPromptResponse(sender, undefined)
    }
}

async function waitForUserResponse(sender: string): Promise<'confirm' | 'deny' | undefined> {
    return new Promise((resolve) => {
        const promptResponse = selectUserOpsByAddress(sender).promptResponse
        if (promptResponse) {
            resolve(promptResponse)
        } else {
            const unsubscribe = userOpsStore.subscribe((state) => {
                if (state.userOps[sender].promptResponse) {
                    unsubscribe()
                    resolve(state.userOps[sender].promptResponse)
                }
            })
        }
    })
}
