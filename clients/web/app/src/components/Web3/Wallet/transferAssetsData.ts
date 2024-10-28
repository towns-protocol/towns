import { Address, TransferAssetTransactionContext } from 'use-towns-client'
import { getCollectionsForAddressQueryData } from 'api/lib/tokenContracts'
import { parseUnits } from 'hooks/useBalance'
import { TransferSchema } from './transferAssetsSchema'
import { isAddress } from './useGetWalletParam'

export function getEthTransferData(args: {
    data: TransferSchema
    onParseError: () => void
}): TransferAssetTransactionContext['data'] {
    const { data, onParseError } = args
    if (!data.recipient) {
        throw new Error('Recipient is required')
    }
    if (!data.ethAmount) {
        throw new Error('ETH amount is required')
    }
    let valueInWei
    try {
        valueInWei = parseUnits(data.ethAmount)
    } catch (error) {
        onParseError()
        return
    }

    return {
        value: valueInWei,
        assetLabel: 'Base ETH',
        recipient: data.recipient,
    }
}

export function getNftTransferData(args: {
    data: TransferSchema
    fromWallet: string | undefined
}): TransferAssetTransactionContext['data'] {
    const { data, fromWallet } = args
    if (!isAddress(data.assetToTransfer)) {
        throw new Error('Invalid asset address')
    }
    if (!data.recipient) {
        throw new Error('Recipient is required')
    }
    if (!fromWallet) {
        throw new Error('Wallet is required')
    }

    const tokenMetadata = getCollectionsForAddressQueryData(fromWallet)?.find(
        (t) => t.data.address === data.assetToTransfer,
    )

    return {
        contractAddress: data.assetToTransfer,
        tokenId: data.tokenId ?? '',
        assetLabel: tokenMetadata?.data.label ?? data.assetToTransfer,
        recipient: data.recipient,
        value: undefined,
    }
}

/**
 * a treasury transfer is going to withdraw all the funds from the space contract
 * it is an all or nothing op, you can't withdraw a partial amount
 */
export function getTreasuryTransferData(args: {
    data: TransferSchema
    spaceAddress: Address | undefined
}): TransferAssetTransactionContext['data'] {
    const { data, spaceAddress } = args
    if (!spaceAddress) {
        throw new Error('Space address is required')
    }
    if (!data.recipient) {
        throw new Error('Recipient is required')
    }

    return {
        spaceAddress,
        assetLabel: 'Base ETH',
        recipient: data.recipient,
    }
}
