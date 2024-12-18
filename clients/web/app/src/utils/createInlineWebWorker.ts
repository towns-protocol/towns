import { createWorkerPromise } from '@towns/userops/src/workers'

export function createInlineWorker<TArgs extends unknown[], TResult>(
    workerFunction: (...args: TArgs) => Promise<TResult> | TResult,
): (...args: TArgs) => Promise<TResult> {
    const workerBlob = new Blob(
        [
            `self.onmessage = async function(event) {
                const result = await (${workerFunction.toString()})(...event.data);
                self.postMessage(result);
            };`,
        ],
        { type: 'application/javascript' },
    )

    const workerUrl = URL.createObjectURL(workerBlob)

    return (...args: TArgs) => createWorkerPromise(new Worker(workerUrl), args)
}
