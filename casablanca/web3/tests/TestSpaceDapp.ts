import { ethers } from 'ethers'
import { ISendUserOperationResponse } from 'userop'
import {
    SpaceDapp,
    MockERC721AShim,
    LOCALHOST_CHAIN_ID,
    getContractsInfo,
    SpaceDappConfig,
} from '../src'

export class TestSpaceDapp extends SpaceDapp {
    mockNFT: MockERC721AShim | undefined

    constructor(config: SpaceDappConfig) {
        super(config)

        const mockNFTAddress = getContractsInfo(config.chainId).mockErc721aAddress
        this.mockNFT = new MockERC721AShim(mockNFTAddress, config.chainId, config.provider)
    }

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

    /**
     * This method is for running a sanity test, not for app use
     */
    public mintMockNFT(args: { signer: ethers.Signer; recipient: string }) {
        if (!this.isAnvil()) {
            throw new Error('this method is only for local dev against anvil')
        }
        const callData = this.mockNFT?.interface.encodeFunctionData('mintTo', [args.recipient])

        return this.sendUserOp({
            signer: args.signer,
            toAddress: this.mockNFT?.address,
            callData: callData,
            value: 0,
            functionHashForPaymasterProxy: '',
            townId: '',
        })
    }

    private isAnvil() {
        return this.chainId === LOCALHOST_CHAIN_ID
    }
}
