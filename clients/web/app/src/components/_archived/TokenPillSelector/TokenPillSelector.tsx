import React, { useCallback, useRef, useState } from 'react'
import { isAddress } from 'ethers/lib/utils'
import { TokenData, TokenType } from '@components/Tokens/types'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import { Box, Icon, IconButton, Paragraph, Text } from '@ui'
import { shortAddress } from 'workers/utils'
import { Field } from 'ui/components/_internal/Field'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { PillSelector } from '@components/DirectMessages/CreateDirectMessage/PillSelector'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { tokenIdSchema } from '@components/Tokens/TokenSelector/tokenSchemas'
import {
    generateTokenIdKey,
    splitKeyToContractAddressAndTokenId,
} from '@components/SpaceSettingsPanel/utils'
import { TokenPill } from './TokenPill'

type Props = {
    nftApiData: ReturnType<typeof useCollectionsForOwner>['data']
    isNftApiError: ReturnType<typeof useCollectionsForOwner>['isError']
    isValidationError: boolean
    initialSelection?: Set<string>
    inputContainerRef?: React.RefObject<HTMLDivElement>
    onSelectionChange: (addresses: Set<string>) => void
    fieldRefOverride?: React.RefObject<HTMLInputElement>
}

/**
 * @deprecated
 */
export function TokenPillSelector(props: Props) {
    const {
        nftApiData,
        isNftApiError,
        onSelectionChange: onSelectionChangeProp,
        initialSelection,
        inputContainerRef,
        isValidationError,
        fieldRefOverride,
    } = props
    const [selectedTokens, setSelectedTokens] = useState(() => new Set<string>())

    const optionRenderer = useCallback(
        ({
            option,
            selected,
            onAddItem,
        }: {
            option: TokenData
            selected: boolean
            onAddItem: () => void
        }) => {
            return (
                <TokenOption
                    option={{ ...option, contractAddress: option.address }}
                    selected={selected}
                    onAddItem={onAddItem}
                />
            )
        },
        [],
    )

    const pillRenderer = useCallback(
        (params: {
            key: string
            onDelete: (customKey?: string) => void
            selection: Set<string>
        }) => {
            return (
                <TokenPill
                    selectionId={params.key}
                    selection={params.selection}
                    onDelete={params.onDelete}
                />
            )
        },
        [],
    )

    const transformSelectionForPillRendering = useCallback((keys: Set<string>) => {
        const newSet = new Set<string>()
        keys.forEach((k) => {
            const [contractAddress] = splitKeyToContractAddressAndTokenId(k)
            newSet.add(contractAddress)
        })
        return newSet
    }, [])

    const onSelectionChange = useCallback(
        (tokenContractAddresses: Set<string>) => {
            const tokens = nftApiData?.tokens.filter((t) => tokenContractAddresses.has(t.address))
            if (tokens) {
                onSelectionChangeProp(tokenContractAddresses)
                setSelectedTokens(tokenContractAddresses)
            }
        },
        [nftApiData?.tokens, onSelectionChangeProp],
    )

    const emptySelectionElement = useCallback(
        ({
            searchTerm,
            onAddItem,
        }: {
            searchTerm: string
            onAddItem: (specialKey: string) => void
        }) => (
            <>
                {isNftApiError ? (
                    <></>
                ) : (
                    <EmptySelectionElement searchTerm={searchTerm} onAddItem={onAddItem} />
                )}
            </>
        ),
        [isNftApiError],
    )

    return (
        <>
            <PillSelector
                hideResultsWhenNotActive
                initialSelection={initialSelection}
                inputContainerRef={inputContainerRef}
                options={nftApiData?.tokens ?? []}
                autoFocus={false}
                keys={['label', 'contractAddress']}
                label="Your Wallet"
                placeholder={
                    selectedTokens.size ? 'Add token...' : 'Search or paste contract address'
                }
                optionRenderer={optionRenderer}
                pillRenderer={pillRenderer}
                optionSorter={(t) => t}
                getOptionKey={(o) => o.address}
                emptySelectionElement={emptySelectionElement}
                transformSelectionForPillRendering={transformSelectionForPillRendering}
                isError={isValidationError}
                fieldRefOverride={fieldRefOverride}
                onSelectionChange={onSelectionChange}
            />
            {isNftApiError && (
                <Box
                    horizontal
                    gap="sm"
                    paddingTop="sm"
                    alignContent="center"
                    justifyContent="end"
                    fontSize="sm"
                    color="gray2"
                >
                    <Icon type="alert" size="square_xs" />
                    <Box>Failed to load your tokens</Box>
                </Box>
            )}
        </>
    )
}

function EmptySelectionElement({
    searchTerm,
    onAddItem,
}: {
    searchTerm: string
    onAddItem: (specialKey: string) => void
}) {
    if (!searchTerm.length) {
        return <></>
    }

    if (isAddress(searchTerm)) {
        return (
            <Box
                padding
                horizontal
                gap="sm"
                background="level2"
                height="x7"
                alignItems="center"
                rounded="sm"
                color="gray2"
                boxShadow="card"
            >
                <TokenOption
                    selected
                    option={{
                        contractAddress: searchTerm,
                    }}
                    onAddItem={(key) => {
                        key && onAddItem(key)
                    }}
                />
            </Box>
        )
    }

    return (
        <Box
            padding
            horizontal
            gap="sm"
            background="level2"
            height="x7"
            alignItems="center"
            rounded="sm"
            color="gray2"
            boxShadow="card"
        >
            <Icon type="alert" size="square_xs" />
            <Paragraph>No matches for &quot;{searchTerm}&quot;</Paragraph>
        </Box>
    )
}

export function TokenOption({
    option,
    onAddItem,
    selected,
}: {
    option: Partial<TokenData> & { contractAddress: string }
    onAddItem: (specialKey?: string) => void
    selected: boolean
}) {
    const isERC1155 = option.type === TokenType.ERC1155

    const [tokenIdErrorMessage, setTokenIdErrorMessage] = useState<string | undefined>()

    const [textInputValue, setTextInputValue] = useState<string>('')

    const onTextInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        const result = tokenIdSchema.safeParse({
            tokenId: Number(value?.length ? value : undefined),
        })
        if (!result.success) {
            if (value === '') {
                setTextInputValue('')
            }
            setTokenIdErrorMessage(result.error.flatten().fieldErrors?.tokenId?.[0])
            return
        } else {
            setTokenIdErrorMessage(undefined)
        }
        setTextInputValue(value)
    }, [])

    const addTokenId = useCallback(() => {
        if (textInputValue) {
            const tokenId = Number(textInputValue)
            onAddItem(
                generateTokenIdKey({
                    contractAddress: option.contractAddress,
                    tokenId,
                }),
            )
            setTokenIdErrorMessage(undefined)
            setTextInputValue('')
        }
    }, [onAddItem, option.contractAddress, textInputValue])

    const onTextInputKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                addTokenId()
            }
        },
        [addTokenId],
    )

    const textInputRef = useRef<HTMLInputElement>(null)

    const onAddTokenClick = useCallback(
        (e: React.MouseEvent<HTMLInputElement>) => {
            e.stopPropagation()
            addTokenId()
        },
        [addTokenId],
    )

    return (
        <>
            <Box
                horizontal
                gap="sm"
                padding="sm"
                rounded={selected ? 'xs' : undefined}
                background={selected ? 'level3' : undefined}
                cursor={!isERC1155 ? 'pointer' : 'default'}
                data-testid={`token-pill-selector-option-${option.contractAddress}`}
                onClick={() => {
                    if (!isERC1155) {
                        onAddItem(option.contractAddress)
                    }
                }}
            >
                <TAvatarComponent contractAddress={option.contractAddress} />
                <Box justifyContent="spaceBetween" height="x4" overflow="hidden">
                    <Box
                        display="block"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        style={{
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {option.label}
                    </Box>
                    <Box color="gray2" fontSize="sm" tooltip={option.contractAddress}>
                        {shortAddress(option.contractAddress)}
                    </Box>
                </Box>
                {isERC1155 && (
                    <Box
                        horizontal
                        alignItems="start"
                        justifySelf="end"
                        style={{
                            marginLeft: 'auto',
                        }}
                        height="x4"
                    >
                        {/* <Box width="x4" /> */}
                        <Box alignItems="start" paddingLeft="sm">
                            <Box horizontal centerContent gap>
                                <Box position="relative">
                                    <Field width="100" paddingX="none" tone="neutral">
                                        {(overlays, { className, ...inputProps }) => (
                                            <>
                                                <Box
                                                    ref={textInputRef}
                                                    as="input"
                                                    width="100%"
                                                    {...inputProps}
                                                    rounded="sm"
                                                    height="input_sm"
                                                    type="text"
                                                    placeholder="Token ID"
                                                    value={textInputValue}
                                                    border="level4"
                                                    fontSize="xs"
                                                    background="level2"
                                                    color="default"
                                                    paddingX="sm"
                                                    // className={styles.input}
                                                    onClick={onTextInputClick}
                                                    onFocus={onTextInputFocus}
                                                    onChange={onTextInputChange}
                                                    onKeyDown={onTextInputKeyDown}
                                                />
                                                {overlays}
                                            </>
                                        )}
                                    </Field>

                                    <Box
                                        centerContent
                                        tooltip={
                                            <Box background="level4" padding="sm" rounded="sm">
                                                <Text size="sm">
                                                    This is an ERC1155 token and requires a token
                                                    ID.
                                                </Text>
                                            </Box>
                                        }
                                        padding="xs"
                                        rounded="full"
                                        position="absolute"
                                        background="level4"
                                        top="-sm"
                                        right="-sm"
                                        width="x2"
                                        aspectRatio="square"
                                    >
                                        <Text size="xs">?</Text>
                                    </Box>
                                </Box>
                                <IconButton
                                    icon="plus"
                                    color="default"
                                    border="level4"
                                    rounded="full"
                                    size="square_xxs"
                                    type="button"
                                    onClick={onAddTokenClick}
                                />
                            </Box>

                            <Box paddingTop="sm">
                                {tokenIdErrorMessage ? (
                                    <ErrorMessageText size="xs" message={tokenIdErrorMessage} />
                                ) : (
                                    <Text size="xs">&nbsp;</Text>
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </>
    )
}

function TAvatarComponent({ contractAddress }: { contractAddress: string }) {
    return <TokenImage imgSrc="" />
}
