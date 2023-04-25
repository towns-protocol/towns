import { TransactionStatus } from 'use-zion-client'

export enum TransactionUIState {
    None = 'None',
    Pending = 'Pending',
    PendingWithData = 'PendingWithData',
    Success = 'Success',
}

export const useTransactionUIStates = (
    transactionStatus: TransactionStatus,
    hasData: boolean,
): TransactionUIState => {
    switch (transactionStatus) {
        case TransactionStatus.Pending:
            return hasData ? TransactionUIState.PendingWithData : TransactionUIState.Pending
        case TransactionStatus.Success:
            return TransactionUIState.Success
        default:
            return TransactionUIState.None
    }
}
