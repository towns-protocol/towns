/**
 * AbortController that can be used to abort signMessage requests during login
 */
export let signMessageAbortController = new AbortController()

/**
 * @returns A promise that rejects when the signMessageAbortController is aborted
 * When the promise rejects, the signMessageAbortController is reset so the signal can be used again
 */
export const signMessageAbortListener = () =>
    new Promise<undefined>((_, reject) => {
        signMessageAbortController.signal.addEventListener(
            'abort',
            () => {
                signMessageAbortController = new AbortController()
                reject(new DOMException('Aborted', 'AbortError'))
            },
            {
                once: true,
            },
        )
    })
