import React from 'react'
import { Chain } from 'wagmi'

export const ContractState = (props: { chain: Chain | undefined; etherscanBaseURL: string }) => {
    return (
        <div>
            <h2>Selected Chain</h2>

            <div>{props.chain?.id ?? 'unset'}</div>

            <h2>Allowed Addresses</h2>

            <h2>Contract ETH Balance</h2>

            <h2>Mint Reward</h2>
        </div>
    )
}
