import { ethers } from 'ethers'
import { UserOps } from '../src/UserOperations'
import { ISendUserOperationResponse } from 'userop'
import { LOCALHOST_CHAIN_ID } from '@river-build/web3'

export class TestUserOps extends UserOps {
    /**
     * This method is for running a sanity test, not for app use
     */
    public async sendFunds(args: {
        signer: ethers.Signer
        recipient: string
        value: ethers.BigNumberish
    }): Promise<ISendUserOperationResponse> {
        if (!this.isAnvil()) {
            throw new Error('this method is only for local dev against anvil')
        }
        const { signer, recipient, value } = args
        return this.sendUserOp({
            signer,
            toAddress: recipient,
            callData: '0x',
            value,
            functionHashForPaymasterProxy: '',
            townId: '',
        })
    }
    private isAnvil() {
        return this.spaceDapp?.chainId === LOCALHOST_CHAIN_ID
    }
}
