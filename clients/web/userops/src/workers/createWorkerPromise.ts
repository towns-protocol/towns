/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
export async function createWorkerPromise<TArgs, TReturn>(
    worker: Worker,
    message?: TArgs,
): Promise<TReturn> {
    try {
        const result = await new Promise<TReturn>((resolve, reject) => {
            worker.postMessage(message)
            worker.onmessage = (e: MessageEvent<TReturn>) => resolve(e.data)
            worker.onmessageerror = (e) => reject(e)
            worker.onerror = (e) => reject(e)
        })
        return result
    } finally {
        worker.onmessage = null
        worker.onmessageerror = null
        worker.onerror = null
        worker.terminate()
    }
}
