import { ethers } from 'ethers'
import React from 'react'
import { ZioneerNFTContractState } from 'use-zion-client'

export const ContractState = (props: { contractState: ZioneerNFTContractState }) => {
    return (
        <div>
            <h2>Contract Address</h2>

            <div>
                <a
                    href={`https://goerli.etherscan.io/address/${props.contractState.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {props.contractState.contractAddress}
                </a>
            </div>

            <h2>Owner</h2>

            <div>
                <a
                    href={`https://goerli.etherscan.io/address/${props.contractState.owner}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {props.contractState.owner}
                </a>
            </div>

            <h2>Allowed Addresses</h2>

            {props.contractState.allowedAddressesList.map((address) => (
                <div key={address}>{address}</div>
            ))}

            {props.contractState.allowedAddressesList.length === 0 && <div>Empty</div>}

            <h2>Contract ETH Balance</h2>

            <div>{ethers.utils.formatEther(props.contractState.contractBalance)} ETH</div>

            <h2>Mint Reward</h2>

            <div>{ethers.utils.formatEther(props.contractState.mintReward)} ETH</div>
        </div>
    )
}
