import React from 'react'

export type TransactionReport = {
    type: string
    hash: string
}

export const TransactionReports = (props: { transactionReports: TransactionReport[] }) => {
    if (!props.transactionReports.length) {
        return <div>No Transactions</div>
    } else {
        return (
            <ol>
                {props.transactionReports.map((report) => {
                    return (
                        <li key={report.hash}>
                            <a href={`https://sepolia.etherscan.io/tx/${report.hash}`}>
                                {report.type} - {report.hash}
                            </a>
                        </li>
                    )
                })}
            </ol>
        )
    }
}
