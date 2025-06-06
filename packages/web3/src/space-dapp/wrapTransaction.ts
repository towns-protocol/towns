import { ContractTransaction, ContractReceipt } from 'ethers'
import { TransactionOpts } from '../types/ContractTypes'
import { dlogger, isTestEnv } from '@towns-protocol/dlog'

const logger = dlogger('csb:SpaceDapp:debug')

// Retry submitting the transaction N times (3 by default in jest, 0 by default elsewhere)
// and then wait until the first confirmation of the transaction has been mined
// works around gas estimation issues and other transient issues that are more common in running CI tests
// so by default we only retry when running under jest
// this wrapper unifies all of the wrapped contract calls in behvior, they don't return until
// the transaction is confirmed
export async function wrapTransaction(
    txFn: () => Promise<ContractTransaction>,
    txnOpts?: TransactionOpts,
): Promise<ContractTransaction> {
    const retryLimit = (txnOpts?.retryCount ?? isTestEnv()) ? 3 : 0

    const runTx = async () => {
        let retryCount = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const txStart = Date.now()
                const tx = await txFn()
                logger.log('Transaction submitted in', Date.now() - txStart)
                const startConfirm = Date.now()
                await confirmTransaction(tx)
                logger.log('Transaction confirmed in', Date.now() - startConfirm)
                // return the transaction, as it was successful
                // the caller can wait() on it again if they want to wait for more confirmations
                return tx
            } catch (error) {
                retryCount++
                if (retryCount >= retryLimit) {
                    throw new Error('Transaction failed after retries: ' + (error as Error).message)
                }
                logger.error('Transaction submission failed, retrying...', { error, retryCount })
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }
    }

    // Wait until the first confirmation of the transaction
    const confirmTransaction = async (tx: ContractTransaction) => {
        let waitRetryCount = 0
        let errorCount = 0
        const start = Date.now()
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let receipt: ContractReceipt | null = null
            try {
                receipt = await tx.wait(0)
            } catch (error) {
                if (
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    (error as { code: unknown }).code === 'CALL_EXCEPTION'
                ) {
                    logger.error('Transaction failed', { tx, errorCount, error })
                    // TODO: is this a bug?
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw error
                }

                // If the transaction receipt is not available yet, the error may be thrown
                // We can ignore it and retry after a short delay
                errorCount++
                receipt = null
            }
            if (!receipt) {
                // Transaction not minded yet, try again in 100ms
                waitRetryCount++
                await new Promise((resolve) => setTimeout(resolve, 100))
            } else if (receipt.status === 1) {
                return
            } else {
                logger.error('Transaction failed in an unexpected way', {
                    tx,
                    receipt,
                    errorCount,
                })
                // Transaction failed, throw an error and the outer loop will retry
                throw new Error('Transaction confirmed but failed')
            }
            const waitRetryTime = Date.now() - start
            // If we've been waiting for more than 20 seconds, log an error
            // and outer loop will resubmit the transaction
            if (waitRetryTime > 20_000) {
                logger.error('Transaction confirmation timed out', {
                    waitRetryTime,
                    waitRetryCount,
                    tx,
                    errorCount,
                })
                throw new Error(
                    'Transaction confirmation timed out after: ' +
                        waitRetryTime +
                        ' waitRetryCount: ' +
                        waitRetryCount,
                )
            }
        }
    }
    return await runTx()
}
