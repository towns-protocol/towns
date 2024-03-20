import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { Box, Button, IconButton, Text, TextField } from '@ui'
import { useTokenMetadataAcrossNetworks } from 'api/lib/collectionMetadata'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { supportedNftNetworks } from '@components/Web3/utils'
import { useClickedOrFocusedOutside } from 'hooks/useClickedOrFocusedOutside'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { isTouch } from 'hooks/useDevice'
import { TokenOption } from './TokenOption'
import { TokenSelection } from './TokenSelection'

type Props = {
    isValidationError: boolean
    initialSelection?: TokenDataWithChainId[]
    inputContainerRef?: React.RefObject<HTMLDivElement>
    onSelectionChange: (args: { tokens: TokenDataWithChainId[] }) => void
}

export function TokenSelector(props: Props) {
    const { isValidationError, onSelectionChange, initialSelection } = props
    const [textFieldValue, setTextFieldValue] = useState('')
    const [selection, setSelection] = useState<TokenDataWithChainId[]>(initialSelection ?? [])
    const [tokenEditor, setTokenEditor] = useState<TokenDataWithChainId | undefined>()
    const containerRef = useRef<HTMLDivElement>(null)

    const { data: tokenMetadata, isLoading: isTokenMetadataLoading } =
        useTokenMetadataAcrossNetworks(textFieldValue)

    const sortedTokenMetadata = useSorted(tokenMetadata)

    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setTextFieldValue(e.target.value)
    }, [])

    const onAddItem = useCallback((option: TokenDataWithChainId) => {
        setTextFieldValue('')
        setSelection((prev) => {
            if (
                prev.some(
                    (t) => t.data.address === option.data.address && t.chainId === option.chainId,
                )
            ) {
                return prev
            }
            return prev.concat({
                ...option,
                data: {
                    ...option.data,
                    quantity: 1,
                },
            })
        })
    }, [])

    const onUpdate = useCallback((token: TokenDataWithChainId) => {
        setSelection((prev) => {
            const match = prev.find(
                (t) => t.data.address === token.data.address && t.chainId === token.chainId,
            )
            if (!match) {
                return prev
            }
            const index = prev.indexOf(match)
            return prev
                .slice(0, index)
                .concat(token)
                .concat(prev.slice(index + 1))
        })
    }, [])

    const onDelete = useCallback((token: TokenDataWithChainId) => {
        setSelection((prev) => {
            const match = prev.find(
                (t) => t.data.address === token.data.address && t.chainId === token.chainId,
            )
            if (!match) {
                return prev
            }
            const index = prev.indexOf(match)
            return prev.slice(0, index).concat(prev.slice(index + 1))
        })
    }, [])

    const onEdit = useCallback((token: TokenDataWithChainId) => {
        setTokenEditor(token)
    }, [])

    useClickedOrFocusedOutside(containerRef, {
        onOutside: () => {
            setTextFieldValue('')
        },
    })

    useEffect(() => {
        onSelectionChange({ tokens: selection })
    }, [onSelectionChange, selection])

    return (
        <Box gap="md" ref={containerRef} position="relative">
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
                    data-testid="token-selector-input"
                    background="level3"
                    value={textFieldValue}
                    tone="none"
                    placeholder="Enter a contract address"
                    size={Math.max(3, textFieldValue.length + 1)}
                    onChange={onChange}
                />
            </Box>

            <Box gap="sm">
                {Array.from(selection).map((token) => (
                    <TokenSelection
                        key={token.chainId + token.data.address}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        {...token}
                    />
                ))}
            </Box>
            {isTokenMetadataLoading && (
                <Box>
                    <ButtonSpinner />
                </Box>
            )}

            {sortedTokenMetadata && (
                <Box
                    padding
                    gap
                    scroll
                    width="100%"
                    top="x8"
                    position="absolute"
                    rounded="sm"
                    background="level2"
                    style={{ maxHeight: 380 }}
                    boxShadow="card"
                >
                    {sortedTokenMetadata
                        .map((token) => ({
                            chainId: token.chainId,
                            data: token.data,
                        }))
                        .map((option) => (
                            <TokenOption
                                key={option.chainId + option.data.address}
                                option={option}
                                selected={false}
                                onAddItem={(option) => onAddItem(option)}
                            />
                        ))}
                </Box>
            )}

            {tokenEditor && (
                <ModalContainer
                    minWidth={isTouch() ? '100%' : '400'}
                    onHide={() => setTokenEditor(undefined)}
                >
                    <TokenEditor
                        token={tokenEditor}
                        onUpdate={onUpdate}
                        onHide={() => setTokenEditor(undefined)}
                    />
                </ModalContainer>
            )}
        </Box>
    )
}

function TokenEditor(props: {
    token: TokenDataWithChainId
    onUpdate: (token: TokenDataWithChainId) => void
    onHide: () => void
}) {
    const { token, onUpdate, onHide } = props
    const { address } = token.data
    const [errorMessage, setErrorMessage] = useState<string | undefined>()
    const fieldRef = useRef<HTMLInputElement>(null)
    const onOpenRef = useRef(false)

    const schema = z.object({
        quantity: z
            .number({
                errorMap: (err) => {
                    if (err.code === 'too_small') {
                        return { message: 'Quantity must be at least 1.' }
                    }

                    return { message: 'Quantity must be a number.' }
                },
            })
            .min(1),
    })

    const validate = useCallback(
        (value: string) => {
            const result = schema.safeParse({ quantity: Number(value) })
            if (!result.success) {
                setErrorMessage(JSON.parse(result.error.message)[0].message)
                return false
            }
            setErrorMessage(undefined)
            return true
        },
        [schema],
    )

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        validate(e.target.value)
    }

    useEffect(() => {
        if (onOpenRef.current) {
            return
        }
        onOpenRef.current = true
        fieldRef.current?.focus()
        validate(token.data.quantity?.toString() ?? '')
    }, [token, validate])

    return (
        <>
            <IconButton padding="xs" alignSelf="end" icon="close" onClick={onHide} />
            <Box centerContent gap="md" maxWidth="400">
                <Box>
                    <Text strong size="lg">
                        Edit Token
                    </Text>
                </Box>
                <Box gap alignSelf="start">
                    <Text>Contract Address</Text>
                    {address}
                </Box>

                <Box gap alignSelf="start" width="100%">
                    <Text>Quantity</Text>
                    <TextField
                        ref={fieldRef}
                        tone="neutral"
                        background="level2"
                        placeholder="Enter a quantity"
                        minLength={1}
                        defaultValue={token.data.quantity?.toString()}
                        onChange={onChange}
                    />
                </Box>
                <Text color="error">{errorMessage}&nbsp;</Text>
                <Button
                    tone="cta1"
                    disabled={!!errorMessage}
                    onClick={() => {
                        onUpdate({
                            ...token,
                            data: {
                                ...token.data,
                                quantity:
                                    fieldRef.current?.value && +fieldRef.current.value > 0
                                        ? +fieldRef.current.value
                                        : token.data.quantity,
                            },
                        })
                        onHide()
                    }}
                >
                    Update
                </Button>

                {/* <Box horizontal gap="sm">
                    <TokenImage imgSrc={imgSrc} width="x4" />
                    <Box>
                        <Box
                            display="block"
                            overflow="hidden"
                            whiteSpace="nowrap"
                            style={{
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {label ?? 'Unknown NFT'}
                        </Box>
                        {address && (
                            <Box color="gray2" fontSize="sm">
                                {address}
                            </Box>
                        )}
                    </Box>
                </Box> */}
            </Box>
        </>
    )
}

function useSorted(tokenMetadata: TokenDataWithChainId[] | undefined) {
    return useMemo(
        () =>
            tokenMetadata
                ? tokenMetadata
                      .filter((t) => t.data.label)
                      .slice()
                      // sort by whether the token has a hit in NFT api
                      .sort((a, b) => {
                          if (a.data.label && b.data.label) {
                              return a.data.label.localeCompare(b.data.label)
                          }
                          return 1
                      })
                      // then sort by our preferred order of networks
                      .sort((a, b) => {
                          const chainA = supportedNftNetworks.find((n) => n.vChain.id === a.chainId)
                          const chainB = supportedNftNetworks.find((n) => n.vChain.id === b.chainId)
                          if (!chainA || !chainB) {
                              return -1
                          }
                          return (
                              supportedNftNetworks.indexOf(chainA) -
                              supportedNftNetworks.indexOf(chainB)
                          )
                      })
                : undefined,
        [tokenMetadata],
    )
}
