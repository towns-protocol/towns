import { BigNumber, ethers } from 'ethers'

type Success = {
    type: 'success'
    amount: BigNumber
}

type Failure = {
    type: 'failure'
    error: string
}

type Result = Success | Failure

// helper utility to validate the amount of ETH
export const validateEthFromString = (amount: string): Result => {
    if (isNaN(parseFloat(amount))) {
        return {
            type: 'failure',
            error: 'Please enter a valid number',
        }
    } else if (parseFloat(amount) <= 0) {
        return {
            type: 'failure',
            error: 'Please enter a positive number',
        }
    }

    try {
        const eth = ethers.utils.parseEther(amount)

        return {
            type: 'success',
            amount: eth,
        }
    } catch (error) {
        return {
            type: 'failure',
            error: 'Please enter a valid eth value',
        }
    }
}
