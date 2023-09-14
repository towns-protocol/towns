import { ethers } from 'ethers'
import React from 'react'
import { PioneerNFTContractState } from '@river/web3'
import { Chain } from 'wagmi'

export const ContractState = (props: {
    chain: Chain | undefined
    contractState: PioneerNFTContractState
    etherscanBaseURL: string
}) => {
    return (
        <div>
            <h2>Selected Chain</h2>

            <div>{props.chain?.id ?? 'unset'}</div>
            <h2>Contract Address</h2>

            <div>
                <a
                    href={`${props.etherscanBaseURL}/address/${props.contractState.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {props.contractState.contractAddress}
                </a>
            </div>

            <h2>Owner</h2>

            <div>
                <a
                    href={`${props.etherscanBaseURL}/address/${props.contractState.owner}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {props.contractState.owner}
                </a>
            </div>

            <h2>Allowed Addresses</h2>

            <h2>Contract ETH Balance</h2>

            <div>{ethers.utils.formatEther(props.contractState.contractBalance)} ETH</div>

            <h2>Mint Reward</h2>

            <div>{ethers.utils.formatEther(props.contractState.mintReward)} ETH</div>
        </div>
    )
}
