import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { TokenType } from '@token-worker/types'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { Box, Button, Icon, IconButton, Text, TextField } from '@ui'
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
    inputRef?: React.RefObject<HTMLInputElement>
    onSelectionChange: (args: { tokens: TokenDataWithChainId[] }) => void
    allowedTokenTypes?: TokenType[]
    allowedNetworks?: number[]
}

// Shows a list of tokens that can be selected. Also allows for adding your own token
// valid tokens can either be ERC721, UNKNOWN, or NOT_A_CONTRACT
//
// if ERC721, it can be selected from the drop down on the appropriate network
//
// if UNKNOWN or NOT_A_CONTRACT, it can be added by entering the contract address
// the user must select the network (if allowed), and be made aware that only ERC721 tokens are supported
export function TokenSelector(props: Props) {
    const allowedTokenTypes = props.allowedTokenTypes ?? [TokenType.ERC721]
    const { isValidationError, onSelectionChange, initialSelection, allowedNetworks } = props
    const [textFieldValue, setTextFieldValue] = useState('')
    const [selection, setSelection] = useState<TokenDataWithChainId[]>(initialSelection ?? [])
    const [tokenEditor, setTokenEditor] = useState<TokenDataWithChainId | undefined>()
    const containerRef = useRef<HTMLDivElement>(null)

    const { data: tokenMetadata, isLoading: isTokenMetadataLoading } =
        useTokenMetadataAcrossNetworks(textFieldValue)

    const resultsOnAllowedNetworks = useMemo(() => {
        if (!allowedNetworks) {
            return tokenMetadata
        }
        return tokenMetadata?.filter((t) => allowedNetworks.includes(t.chainId))
    }, [allowedNetworks, tokenMetadata])

    const anyResultIsERC1155OrERC20 = useMemo(() => {
        return tokenMetadata?.some(
            (t) => t.data.type === TokenType.ERC1155 || t.data.type === TokenType.ERC20,
        )
    }, [tokenMetadata])

    const allResultsOnAllowedNetworkAreUnknownOrNotAContract = useMemo(() => {
        return resultsOnAllowedNetworks?.every(
            (t) => t.data.type === TokenType.UNKNOWN || t.data.type === TokenType.NOT_A_CONTRACT,
        )
    }, [resultsOnAllowedNetworks])

    const showUnknownTokensList =
        allResultsOnAllowedNetworkAreUnknownOrNotAContract && !anyResultIsERC1155OrERC20

    const knownTokens = useValidTokens({
        tokenMetadata: useSorted(resultsOnAllowedNetworks),
        allowedTokenTypes,
    })

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

    const _isTouch = isTouch()

    useClickedOrFocusedOutside(containerRef, {
        onOutside: () => {
            setTextFieldValue('')
        },
    })

    useEffect(() => {
        onSelectionChange({ tokens: selection })
    }, [onSelectionChange, selection])

    return (
        <Box gap="md" ref={containerRef} position="relative" zIndex="above">
            <Box
                horizontal
                gap="sm"
                background="level2"
                rounded="sm"
                flexWrap="wrap"
                minHeight="x6"
                overflow="hidden"
                border={isValidationError || anyResultIsERC1155OrERC20 ? 'negative' : 'default'}
            >
                <TextField
                    ref={props.inputRef}
                    data-testid="token-selector-input"
                    background="level3"
                    value={textFieldValue}
                    tone="none"
                    placeholder="Enter a contract address"
                    size={Math.max(3, textFieldValue.length + 1)}
                    onChange={onChange}
                />
            </Box>

            {anyResultIsERC1155OrERC20 && (
                <Box>
                    <Text size="sm" color="error">
                        We currently only support ERC-71 tokens.
                    </Text>
                </Box>
            )}

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
                <Box centerContent position="absolute" bottom="-sm" width="100%">
                    <ButtonSpinner />
                </Box>
            )}

            {knownTokens?.length ? (
                <TokenOptions tokens={knownTokens} onAddItem={onAddItem} />
            ) : showUnknownTokensList ? (
                <>
                    <TokenOptions
                        headerElement={
                            <Box horizontal gap="sm">
                                <Icon type="alert" color="negative" size="square_sm" />
                                <Box gap="sm">
                                    <Text
                                        size="sm"
                                        color="gray1"
                                    >{`We didn't find your token on any of the supported networks.`}</Text>
                                    <Text
                                        size="sm"
                                        color="gray1"
                                    >{`If you add this token, it will be submitted as an ERC-721.`}</Text>
                                </Box>
                            </Box>
                        }
                        tokens={
                            resultsOnAllowedNetworks?.filter(
                                (t) =>
                                    t.data.type === TokenType.UNKNOWN ||
                                    t.data.type === TokenType.NOT_A_CONTRACT,
                            ) ?? []
                        }
                        onAddItem={(o) =>
                            onAddItem({
                                ...o,
                                data: {
                                    ...o.data,
                                    type: TokenType.ERC721,
                                },
                            })
                        }
                    />
                </>
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
    tokens: TokenDataWithChainId[]
    onAddItem: (option: TokenDataWithChainId) => void
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
