import React from 'react'
import { Address } from 'use-towns-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, Heading, IconButton, Text } from '@ui'
import { TokenSelection } from '@components/Tokens/TokenSelector/TokenSelection'
import { getCollectionsForAddressQueryData } from 'api/lib/tokenContracts'
import { isTouch } from 'hooks/useDevice'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'
import { TransferSchema } from './transferAssetsSchema'
import { convertTokenDataWithChainIdToToken } from './useBaseNftsForTransfer'
import { RecipientText } from '../UserOpTxModal/UserOpTxModal'

export function TreasuryOrNftConfirmModal(props: {
    showModal: boolean
    type: 'treasury' | 'nft'
    fromWallet: Address | undefined
    data: TransferSchema
    onHide: () => void
    onSubmit: () => void
}) {
    const { showModal, type, fromWallet, data, onHide, onSubmit } = props
    const isTreasuryTransfer = type === 'treasury'
    const _isTouch = isTouch()

    if (!showModal) {
        return null
    }

    return (
        <ModalContainer asSheet={_isTouch} minWidth="auto" onHide={onHide}>
            <IconButton padding="xs" alignSelf="end" icon="close" onClick={onHide} />
            <Box
                gap
                centerContent
                width={!_isTouch ? '400' : undefined}
                maxWidth="400"
                data-testid="treasury-or-nft-confirm-modal"
            >
                <Box paddingBottom="sm">
                    <Text strong size="lg">
                        Confirm Transfer
                    </Text>
                </Box>
                {!isTreasuryTransfer && fromWallet ? (
                    <Box width="100%">
                        <TokenDisplay data={data} fromWallet={fromWallet} />
                    </Box>
                ) : data.ethAmount ? (
                    <Heading level={2}>
                        {formatUnitsToFixedLength(parseUnits(data.ethAmount))} ETH
                    </Heading>
                ) : null}

                {data.recipient && (
                    <Box padding="md" rounded="sm" background="level3" width="100%">
                        <RecipientText sendingTo={data.recipient} />
                    </Box>
                )}

                <Button tone="cta1" width="100%" data-testid="confirm-button" onClick={onSubmit}>
                    Confirm
                </Button>
            </Box>
        </ModalContainer>
    )
}

function TokenDisplay(props: { data: TransferSchema; fromWallet: Address }) {
    const { data, fromWallet } = props
    const tokenMetadata = getCollectionsForAddressQueryData(fromWallet)?.find(
        (t) => t.data.address.toLowerCase() === data.assetToTransfer?.toLowerCase(),
    )
    const token = tokenMetadata ? convertTokenDataWithChainIdToToken(tokenMetadata) : undefined
    if (!token) {
        return null
    }
    return (
        <TokenSelection
            token={token}
            wrapperBoxProps={{
                background: 'level3',
                width: '100%',
            }}
        />
    )
}
