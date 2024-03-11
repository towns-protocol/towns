import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { Box, TextField } from '@ui'
import { useTokenMetadataAcrossNetworks } from 'api/lib/collectionMetadata'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { supportedNftNetworks } from '@components/Web3/utils'
import { useClickedOrFocusedOutside } from 'hooks/useClickedOrFocusedOutside'
import { TokenPill } from './TokenPill'
import { TokenOption } from './TokenOption'

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
            return prev.concat(option)
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
                paddingX="md"
                paddingY="sm"
                gap="sm"
                background="level2"
                rounded="sm"
                flexWrap="wrap"
                minHeight="x6"
                boxShadow="card"
                overflow="hidden"
                border={isValidationError ? 'negative' : 'default'}
            >
                {Array.from(selection).map((token) => (
                    <TokenPill
                        key={token.chainId + token.data.address}
                        onDelete={onDelete}
                        {...token}
                    />
                ))}
                <TextField
                    data-testid="token-selector-input"
                    value={textFieldValue}
                    tone="none"
                    placeholder="Enter a contract address"
                    paddingX="none"
                    paddingY="none"
                    height="x2"
                    size={Math.max(3, textFieldValue.length + 1)}
                    onChange={onChange}
                />
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
        </Box>
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
