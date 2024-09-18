import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TokenType } from '@token-worker/types'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, Icon, IconButton, Stack, Text, TextField } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useTokenMetadataAcrossNetworks } from 'api/lib/collectionMetadata'
import { useClickedOrFocusedOutside } from 'hooks/useClickedOrFocusedOutside'
import { formatUnits, parseUnits } from 'hooks/useBalance'
import { isTouch } from 'hooks/useDevice'
import { TokenSelectionDisplay, TokenSelectionInput } from './TokenSelection'
import { TokenOption } from './TokenOption'
import { Token } from './tokenSchemas'

const allowedTokenTypes = [TokenType.ERC721, TokenType.ERC20]

type Props = {
    isValidationError: boolean
    inputRef?: React.RefObject<HTMLInputElement>
    allowedNetworks?: number[]
    value: Token[]
    onChange: (tokens: Token[]) => void
}

export function TokenSelector(props: Props) {
    const { isValidationError, inputRef, allowedNetworks, value, onChange } = props
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

    const anyResultIsERC1155 = useMemo(() => {
        return tokenMetadata?.some((t) => t.data.type === TokenType.ERC1155)
    }, [tokenMetadata])

    const allResultsOnAllowedNetworkAreUnknownOrNotAContract = useMemo(() => {
        return resultsOnAllowedNetworks?.every(
            (t) => t.data.type === TokenType.UNKNOWN || t.data.type === TokenType.NOT_A_CONTRACT,
        )
    }, [resultsOnAllowedNetworks])

    const showUnknownTokensList =
        allResultsOnAllowedNetworkAreUnknownOrNotAContract && !anyResultIsERC1155

    const knownTokens = useValidTokens({
        tokenMetadata: useSorted(resultsOnAllowedNetworks),
        allowedTokenTypes,
    })

    const onTextFieldChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setTextFieldValue(e.target.value)
    }, [])

    const onAddItem = useCallback(
        (option: Token) => {
            setTextFieldValue('')
            onChange([
                ...value,
                {
                    ...option,
                    data: {
                        ...option.data,
                        quantity:
                            option.data.type === TokenType.ERC20
                                ? parseUnits(
                                      option.data.quantity?.toString() ?? '1',
                                      option.data.decimals,
                                  )
                                : option.data.quantity ?? 1n,
                    },
                },
            ])
        },
        [onChange, value],
    )

    const onDelete = useCallback(
        (token: Token) => {
            onChange(
                value.filter(
                    (t) => t.data.address !== token.data.address || t.chainId !== token.chainId,
                ),
            )
        },
        [onChange, value],
    )

    const onEdit = useCallback((token: Token) => {
        setTokenEditor(token)
    }, [])

    const onUpdate = useCallback(
        (updatedToken: Token) => {
            onChange(
                value.map((t) =>
                    t.data.address === updatedToken.data.address &&
                    t.chainId === updatedToken.chainId
                        ? updatedToken
                        : t,
                ),
            )
            setTokenEditor(undefined)
        },
        [onChange, value],
    )

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
                border={isValidationError || anyResultIsERC1155 ? 'negative' : 'default'}
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

            {anyResultIsERC1155 && (
                <Box>
                    <Text size="sm" color="error">
                        We currently only support ERC-721 or ERC-20 tokens.
                    </Text>
                </Box>
            )}

            <Box gap="sm">
                {value.map((token) => (
                    <TokenSelectionInput
                        key={token.chainId + token.data.address}
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

            {Array.isArray(knownTokens) && knownTokens.length > 0 ? (
                <TokenOptions tokens={knownTokens as Token[]} onAddItem={onAddItem} />
            ) : showUnknownTokensList ? (
                <TokenOptions
                    headerElement={
                        <Box horizontal gap="sm" alignItems="center">
                            <Icon type="alert" color="negative" size="square_sm" />
                            <Box gap="sm">
                                <Text size="sm" color="gray1">
                                    We didn&apos;t find your token on any of the supported networks.
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
                    onAddItem={onAddItem}
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
                        onUpdate={onUpdate}
                        onHide={() => setTokenEditor(undefined)}
                    />
                </ModalContainer>
            )}
        </Box>
    )
}

function TokenOptions({
    tokens,
    onAddItem,
    headerElement,
}: {
    tokens: Token[]
    onAddItem: (option: Token) => void
    headerElement?: React.ReactNode
}) {
    return (
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
            {headerElement}
            {tokens
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
    )
}

function TokenEditor(props: {
    token: Token
    onUpdate: (token: Token) => void
    onHide: () => void
}) {
    const { token, onUpdate, onHide } = props

    const schema = z.object({
        quantity: z
            .string({
                required_error: 'Quantity is required',
                invalid_type_error: 'Quantity must be a string',
            })
            .min(0, 'Quantity must not be empty')
            .refine(
                (val) => {
                    if (token.data.type === TokenType.ERC20) {
                        // For ERC20, allow decimal values
                        const regex = /^\d*\.?\d*$/
                        if (!regex.test(val)) {
                            return false
                        }
                        const number = parseFloat(val)
                        return !isNaN(number) && number > 0
                    } else {
                        // For non-ERC20, keep the original integer check
                        try {
                            const bigIntValue = BigInt(val)
                            return bigIntValue >= 1n
                        } catch {
                            return false
                        }
                    }
                },
                {
                    message:
                        token.data.type === TokenType.ERC20
                            ? 'Quantity must be a positive number'
                            : 'Quantity must be an integer greater than or equal to 1',
                },
            ),
    })

    const transformedDefaultValues = useMemo(() => {
        return {
            quantity:
                token.data.type === TokenType.ERC20
                    ? formatUnits(token.data.quantity ?? 1n, token.data.decimals)
                    : token.data.quantity?.toString() ?? '1',
        }
    }, [token.data])

    const transformQuantityForSubmit = useCallback(
        (quantity: string, tokenType: TokenType, decimals: number = 18) => {
            return tokenType === TokenType.ERC20 ? parseUnits(quantity, decimals) : BigInt(quantity)
        },
        [],
    )

    const {
        control,
        handleSubmit,
        formState: { errors },
        setFocus,
    } = useForm<{ quantity: string }>({
        resolver: zodResolver(schema),
        defaultValues: transformedDefaultValues,
    })

    const onSubmit = (data: { quantity: string }) => {
        onUpdate({
            ...token,
            data: {
                ...token.data,
                quantity: transformQuantityForSubmit(
                    data.quantity,
                    token.data.type,
                    token.data.decimals,
                ),
            },
        })
        onHide()
    }

    useEffect(() => {
        setFocus('quantity')
    }, [setFocus])

    return (
        <Box centerContent gap="md" padding="md" width="100%">
            <Stack
                justifyContent="spaceBetween"
                flexDirection="row"
                alignItems="center"
                width="100%"
            >
                <Box width="x3" />
                <Text strong size="lg">
                    Edit Token
                </Text>
                <IconButton padding="xs" icon="close" onClick={onHide} />
            </Stack>

            <TokenSelectionDisplay token={token} />

            <Box as="form" style={{ width: '100%' }} gap="md" onSubmit={handleSubmit(onSubmit)}>
                <Box gap alignSelf="start" width="100%">
                    <Text>Quantity</Text>
                    <Controller
                        name="quantity"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                type="text"
                                tone="neutral"
                                background="level2"
                                placeholder="Enter a quantity"
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (token.data.type === TokenType.ERC20) {
                                        // Allow decimal input for ERC20 tokens
                                        if (/^\d*\.?\d*$/.test(value)) {
                                            field.onChange(value)
                                        }
                                    } else {
                                        // Only allow integer input for non-ERC20 tokens
                                        if (/^\d*$/.test(value)) {
                                            field.onChange(value)
                                        }
                                    }
                                }}
                            />
                        )}
                    />
                </Box>
                {errors.quantity && <Text color="error">{errors.quantity.message}</Text>}

                <Box centerContent>
                    <Button type="submit" tone="cta1">
                        Update
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

function useValidTokens(args: {
    tokenMetadata: TokenDataWithChainId[] | undefined
    allowedTokenTypes: TokenType[]
}) {
    return useMemo(() => {
        if (!args.tokenMetadata) {
            return undefined
        }
        const tokens = args.tokenMetadata.filter((t) =>
            args.allowedTokenTypes.includes(t.data.type),
        )

        return tokens
    }, [args.allowedTokenTypes, args.tokenMetadata])
}

function useSorted(tokenMetadata: TokenDataWithChainId[] | undefined) {
    return useMemo(
        () =>
            tokenMetadata
                ? tokenMetadata
                      .slice()
                      .slice()
                      // sort by whether the token has a hit in NFT api
                      .slice()
                      // sort by whether the token has a hit in NFT api
                      .sort((a, b) => {
                          if (a.data.label && b.data.label) {
                              return a.data.label.localeCompare(b.data.label)
                          }
                          return 1
                      })
                : undefined,
        [tokenMetadata],
    )
}
