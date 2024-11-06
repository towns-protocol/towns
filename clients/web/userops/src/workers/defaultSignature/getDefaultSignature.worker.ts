import { Wallet, utils } from 'ethers'

export type GetDefaultSignatureWorkerReturn = string

self.onmessage = async () => {
    // Generate default signature
    const defaultSignature = await Wallet.createRandom().signMessage(
        utils.arrayify(utils.keccak256('0xdead')),
    )

    const response: GetDefaultSignatureWorkerReturn = defaultSignature

    self.postMessage(response)
}
