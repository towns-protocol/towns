import React, { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react'
import { constants } from 'ethers'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, BoxProps, Icon, IconButton, Text, TextField } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useTokenMetadataAcrossNetworks } from 'api/lib/collectionMetadata'
import { useClickedOrFocusedOutside } from 'hooks/useClickedOrFocusedOutside'
import { isTouch } from 'hooks/useDevice'
import { TokenSelectionInput } from './TokenSelection'
import { Token } from './tokenSchemas'
import { TokenEditor } from './TokenEditor'
import { TokenOptions } from './TokenOptions'
import { useValidAndSortedTokens } from '../hooks'
import { TokenType } from '../types'
import { NATIVE_TOKEN, useNativeTokenWithQuantity } from '../utils'

const allowedTokenTypes = [TokenType.ERC721, TokenType.ERC20, TokenType.ERC1155]

type Props = {
    isValidationError: boolean
    inputRef?: React.RefObject<HTMLInputElement>
    allowedNetworks?: number[]
    tokens: Token[]
    ethBalance: string
    onChange: (tokens: Token[]) => void
    onEthBalanceChange: (balance: string) => void
}

const optionBoxProps = { paddingY: 'sm', background: 'level3' } satisfies BoxProps

export function TokenSelector(props: Props) {
    const { inputRef, allowedNetworks, tokens, onChange, onEthBalanceChange, ethBalance } = props
    const [textFieldValue, setTextFieldValue] = useState('')
    const [tokenEditor, setTokenEditor] = useState<Token | undefined>()
    const containerRef = useRef<HTMLDivElement>(null)

    const nativeTokenWithQuantity = useNativeTokenWithQuantity(ethBalance)

    const { data: tokenMetadata, isLoading: isTokenMetadataLoading } =
        useTokenMetadataAcrossNetworks(textFieldValue)

    const resultsOnAllowedNetworks = useMemo(() => {
        if (!allowedNetworks) {
            return tokenMetadata
        }
        return tokenMetadata?.filter((t) => allowedNetworks.includes(t.chainId))
    }, [allowedNetworks, tokenMetadata])

    const foundValidContracts = useMemo(() => {
        return !resultsOnAllowedNetworks?.every(
            (t) => t.data.type !== TokenType.UNKNOWN && t.data.type === TokenType.NOT_A_CONTRACT,
        )
    }, [resultsOnAllowedNetworks])

    const knownTokens = useValidAndSortedTokens({
        tokenMetadata: resultsOnAllowedNetworks,
        allowedTokenTypes,
    })

    const onTextFieldChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setTextFieldValue(e.target.value)
    }, [])

    const addOrUpdate = useCallback(
        (token: Token) => {
            const updatedTokens = tokens.some(
                (t) =>
                    t.data.address === token.data.address &&
                    t.chainId === token.chainId &&
                    t.data.tokenId === token.data.tokenId,
            )
                ? tokens.map((t) =>
                      t.data.address === token.data.address &&
                      t.chainId === token.chainId &&
                      t.data.tokenId === token.data.tokenId
                          ? token
                          : t,
                  )
                : [...tokens, token]

            onChange(updatedTokens)
            setTokenEditor(token)
            setTextFieldValue('')
        },
        [onChange, tokens],
    )

    const onDelete = useCallback(
        (token: Token) => {
            if (token.data.address === constants.AddressZero) {
                onEthBalanceChange('')
            } else {
                onChange(
                    tokens.filter(
                        (t) =>
                            t.data.address !== token.data.address ||
                            t.chainId !== token.chainId ||
                            t.data.tokenId !== token.data.tokenId,
                    ),
                )
            }
        },
        [onChange, tokens, onEthBalanceChange],
    )

    const onEdit = useCallback((token: Token) => {
        setTokenEditor(token)
    }, [])

    useClickedOrFocusedOutside(containerRef, {
        onOutside: () => {
            setTextFieldValue('')
        },
    })

    const _isTouch = isTouch()

    return (
        <Box
            gap="sm"
            ref={containerRef}
            position="relative"
            zIndex="above"
            data-testid="token-search"
        >
            <Box horizontal gap="sm" alignItems="center">
                <TextField
                    ref={inputRef}
                    data-testid="token-selector-input"
                    background="level3"
                    value={textFieldValue}
                    tone="none"
                    placeholder="Enter contract address"
                    onChange={onTextFieldChange}
                />

                <IconButton
                    centerContent
                    icon="baseEth"
                    tooltip="ETH Balance Gate"
                    background="level3"
                    rounded="sm"
                    data-testid="balance-gate-button"
                    width="x6"
                    height="x6"
                    onClick={() => setTokenEditor(nativeTokenWithQuantity || NATIVE_TOKEN)}
                />
            </Box>

            <Box gap="sm">
                {nativeTokenWithQuantity && (
                    <TokenSelectionInput
                        token={nativeTokenWithQuantity}
                        optionBoxProps={optionBoxProps}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                )}
                {tokens.map((token) => (
                    <TokenSelectionInput
                        key={token.chainId + token.data.address + (token.data.tokenId ?? '')}
                        token={token}
                        optionBoxProps={optionBoxProps}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                ))}
            </Box>

            {isTokenMetadataLoading && (
                <Box centerContent position="absolute" bottom="none" width="100%" height="none">
                    <Box
                        centerContent
                        position="absolute"
                        height="x7"
                        top="none"
                        width="100%"
                        borderRadius="sm"
                        background="level2"
                    >
                        <ButtonSpinner />
                    </Box>
                </Box>
            )}

            {knownTokens && knownTokens.length > 0 ? (
                <TokenOptions tokens={knownTokens} onAddItem={onEdit} />
            ) : knownTokens && knownTokens.length === 0 && foundValidContracts ? (
                <TokenOptions
                    headerElement={
                        <Box horizontal gap="sm" alignItems="center">
                            <Icon type="alert" color="negative" size="square_lg" />
                            <Box gap="sm">
                                <Text size="sm" color="gray1">
                                    We didn&apos;t find your token on any of the supported networks.
                                    Check that it&apos;s a valid contract address or try again
                                    later.
                                </Text>
                            </Box>
                        </Box>
                    }
                    tokens={
                        resultsOnAllowedNetworks?.filter(
                            (t) =>
                                t.data.type !== TokenType.UNKNOWN &&
                                t.data.type !== TokenType.NOT_A_CONTRACT,
                        ) ?? []
                    }
                    onAddItem={onEdit}
                />
            ) : null}

            {tokenEditor && (
                <ModalContainer
                    asSheet={_isTouch}
                    minWidth={_isTouch ? '100%' : '400'}
                    padding="none"
                    onHide={() => setTokenEditor(undefined)}
                >
                    <TokenEditor
                        token={tokenEditor}
                        tokenAlreadyExists={tokens.some(
                            (t) =>
                                t.data.address === tokenEditor.data.address &&
                                t.chainId === tokenEditor.chainId &&
                                t.data.tokenId === tokenEditor.data.tokenId,
                        )}
                        onAddOrUpdate={addOrUpdate}
                        onEthBalanceChange={onEthBalanceChange}
                        onHide={() => setTokenEditor(undefined)}
                    />
                </ModalContainer>
            )}
        </Box>
    )
}
