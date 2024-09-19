import React, { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Icon, Text, TextField } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useTokenMetadataAcrossNetworks } from 'api/lib/collectionMetadata'
import { useClickedOrFocusedOutside } from 'hooks/useClickedOrFocusedOutside'
import { isTouch } from 'hooks/useDevice'
import { TokenSelectionInput } from './TokenSelection'
import { Token } from './tokenSchemas'
import { TokenEditor } from './TokenEditor'
import { TokenOptions } from './TokenOptions'
import { useSorted, useValidTokens } from '../hooks'
import { TokenType } from '../types'

const allowedTokenTypes = [TokenType.ERC721, TokenType.ERC20, TokenType.ERC1155]

type Props = {
    isValidationError: boolean
    inputRef?: React.RefObject<HTMLInputElement>
    allowedNetworks?: number[]
    tokens: Token[]
    onChange: (tokens: Token[]) => void
}

export function TokenSelector(props: Props) {
    const { isValidationError, inputRef, allowedNetworks, tokens, onChange } = props
    const [textFieldValue, setTextFieldValue] = useState('')
    const [tokenEditor, setTokenEditor] = useState<Token | undefined>()
    const containerRef = useRef<HTMLDivElement>(null)

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

    const knownTokens = useValidTokens({
        tokenMetadata: useSorted(resultsOnAllowedNetworks),
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
            onChange(
                tokens.filter(
                    (t) =>
                        t.data.address !== token.data.address ||
                        t.chainId !== token.chainId ||
                        t.data.tokenId !== token.data.tokenId,
                ),
            )
        },
        [onChange, tokens],
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
            <Box
                horizontal
                gap="sm"
                background="level2"
                rounded="sm"
                flexWrap="wrap"
                minHeight="x6"
                overflow="hidden"
                border={isValidationError ? 'negative' : 'default'}
            >
                <TextField
                    ref={inputRef}
                    data-testid="token-selector-input"
                    background="level2"
                    value={textFieldValue}
                    tone="none"
                    placeholder="Enter a contract address"
                    size={Math.max(3, textFieldValue.length + 1)}
                    onChange={onTextFieldChange}
                />
            </Box>

            <Box gap="sm">
                {tokens.map((token) => (
                    <TokenSelectionInput
                        key={token.chainId + token.data.address + (token.data.tokenId ?? '')}
                        token={token}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                ))}
            </Box>

            {isTokenMetadataLoading && (
                <Box centerContent position="absolute" bottom="-sm" width="100%">
                    <ButtonSpinner />
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
                        (resultsOnAllowedNetworks?.filter(
                            (t) =>
                                t.data.type !== TokenType.UNKNOWN &&
                                t.data.type !== TokenType.NOT_A_CONTRACT,
                        ) ?? []) as Token[]
                    }
                    onAddItem={onEdit}
                />
            ) : null}

            {tokenEditor && (
                <ModalContainer
                    asSheet={_isTouch}
                    minWidth={_isTouch ? '100%' : '400'}
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
                        onHide={() => setTokenEditor(undefined)}
                    />
                </ModalContainer>
            )}
        </Box>
    )
}
