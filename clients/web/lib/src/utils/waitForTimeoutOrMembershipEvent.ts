export class MembershipEventListenerTimeoutError extends Error {
    constructor(message?: string) {
        super(message ?? 'Membership event listener timed out')
        this.name = 'MembershipEventListenerTimeoutError'
    }
}

export function waitForTimeoutOrMembership({
    hashOrUserOpHash,
    membershipListener,
    abortController,
    waitTimeout = 30_000,
}: {
    hashOrUserOpHash: string | undefined
    abortController: AbortController
    membershipListener: Promise<
        | {
              issued: true
              tokenId: string
          }
        | {
              issued: false
              tokenId: undefined
          }
    >
    waitTimeout?: number
}): Promise<
    | { issued: true; tokenId: string; error?: Error | undefined }
    | { issued: false; tokenId: undefined; error?: Error | undefined }
> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log('[UserOperations] waitForTimeoutOrMembership timeout', {
                hashOrUserOpHash: hashOrUserOpHash,
            })
            abortController.abort()
            resolve({
                issued: false,
                tokenId: undefined,
                error: new MembershipEventListenerTimeoutError(),
            })
        }, waitTimeout)

        membershipListener
            .then((result) => {
                clearTimeout(timeout)
                if (abortController.signal.aborted) {
                    return
                }
                console.log('[UserOperations] Received membership mint event', {
                    hashOrUserOpHash: hashOrUserOpHash,
                    mintResult: result,
                })
                resolve(result)
            })
            .catch((error) => {
                clearTimeout(timeout)
                abortController.abort()
                console.log('[UserOperations] Error waiting for membership mint event', {
                    hashOrUserOpHash: hashOrUserOpHash,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    error,
                })
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolve({ issued: false, tokenId: undefined, error })
            })
    })
}
