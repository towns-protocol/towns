import { AnimatePresence } from 'framer-motion'
import uniqBy from 'lodash/uniqBy'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getTestGatingNftAddress } from 'use-zion-client'
import { Address } from 'wagmi'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { Box, BoxProps, MotionBox, Paragraph, Text, TextField } from '@ui'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import { env } from 'utils'
import { fetchVitalikTokens, vitalikAddress } from 'hooks/useNetworkForNftApi'
import {
    AddressListSearch,
    SelectedItemsList,
    useTokenSearch,
    useUpdateSelectedItems,
} from '@components/AddressListSearch/AddressListSearch'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { TokenAvatar } from './TokenAvatar'
import { TokenPropsForVList } from './types'
import { CustomTokenWrapper, TokenListItem } from './TokenListItem'

const loadingMessages = [
    'Grabbing your NFTs...',
    'Still grabbing your NFTs...',
    'Wow, you must have a lot of NFTs...',
    'How long have you been collecting NFTs??',
    'With all these NFTs you could build a bridge to the moon...',
]

const Loader = ({ simpleLoadingMessage }: { simpleLoadingMessage?: string }) => {
    const [message, setMessage] = useState(simpleLoadingMessage ?? loadingMessages[0])
    const count = useRef(1)
    useEffect(() => {
        if (simpleLoadingMessage) {
            return
        }
        const interval = setInterval(() => {
            setMessage(loadingMessages[count.current])
            count.current = count.current + 1
            if (count.current === loadingMessages.length) {
                clearInterval(interval)
            }
        }, 4000)

        return () => {
            clearInterval(interval)
        }
    }, [simpleLoadingMessage])
    return (
        <Box centerContent paddingTop="md" flexDirection="row" gap="md">
            <ButtonSpinner />
            <FadeIn key={message}>
                <Text>{message}</Text>
            </FadeIn>
        </Box>
    )
}

export function TokensList({
    wallet,
    showTokenList,
    initialItems,
    onUpdate,
    listMaxHeight,
    singleContractAddress,
}: {
    wallet: string
    showTokenList: boolean
    initialItems?: TokenDataStruct[]
    onUpdate: (items: TokenDataStruct[]) => void
    listMaxHeight?: BoxProps['maxHeight']
    // if present, will not show the search input, and will only show the data for this address
    singleContractAddress?: string
}) {
    const { chainId } = useEnvironment()
    const zionTokenAddress = useMemo(() => getTestGatingNftAddress(chainId), [chainId])
    const showTokenSearch = !singleContractAddress

    const {
        data: nftApiData,
        isLoading,
        isError,
    } = useCollectionsForOwner({
        wallet: fetchVitalikTokens ? vitalikAddress : wallet,
        zionTokenAddress,
        enabled: Boolean(chainId),
        chainId,
    })

    const nftApiDataWithId = useMemo(() => {
        const _data =
            nftApiData?.tokens
                .map((t) => ({ ...t, id: t.contractAddress }))
                .filter((t) => {
                    if (singleContractAddress) {
                        return t.contractAddress === singleContractAddress
                    }
                    return true
                }) ?? []
        return uniqBy(_data, 'contractAddress')
    }, [nftApiData?.tokens, singleContractAddress])

    const { search, results, setSearch, isCustomAddress } = useTokenSearch<TokenPropsForVList>({
        data: nftApiDataWithId,
    })

    const {
        selectedItems,
        tokenIdsMap,
        addContract,
        toggleContract,
        removeContract,
        addTokenIdForContract,
        removeTokenIdForContract,
        clearTokenIdsForContract,
    } = useUpdateSelectedItems({
        initialItems,
        onUpdate: (items) => {
            onUpdate(items)
        },
    })

    const noResults = !results.length && !isCustomAddress && !isLoading

    return (
        <>
            <SelectedItemsList items={selectedItems}>
                {({ item }) => {
                    const tokenDataFromApi = nftApiData?.tokens.find(
                        (t) => t.contractAddress === item,
                    )
                    const tokenDataFromSelectedItems = selectedItems.find(
                        (t) => t.contractAddress === item,
                    )
                    return (
                        <TokenAvatar
                            imgSrc={tokenDataFromApi?.imgSrc || ''}
                            label={tokenDataFromApi?.label || ''}
                            contractAddress={item}
                            tokenIds={tokenDataFromSelectedItems?.tokenIds ?? []}
                            size="avatar_md"
                            onClick={({ contractAddress }) => removeContract(contractAddress)}
                        />
                    )
                }}
            </SelectedItemsList>
            {showTokenSearch && (
                <MotionBox layout="position">
                    <TextField
                        data-testid="token-search"
                        background="level2"
                        placeholder="Search or paste contract address"
                        border="level3"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </MotionBox>
            )}

            <CustomTokenWrapper
                address={search as Address}
                selectedItems={selectedItems}
                isCustomAddress={isCustomAddress}
                tokenIdsMap={tokenIdsMap}
                addTokenIdForContract={addTokenIdForContract}
                removeTokenIdForContract={removeTokenIdForContract}
                clearTokenIdsForContract={clearTokenIdsForContract}
                toggleContract={toggleContract}
                addContract={addContract}
                removeContract={removeContract}
            />

            <AnimatePresence mode="wait">
                {isError && (
                    <FadeInBox key="error">
                        <Paragraph size="sm" color="error">
                            There was an error fetching your tokens
                        </Paragraph>
                    </FadeInBox>
                )}
                {env.DEV && chainId === 31337 && (
                    <FadeInBox key="dev-message" maxWidth="400">
                        <Paragraph size="sm" color="error">
                            DEV message: Localhost will only return the zion token for anvil
                            accounts. To test a long list, add ?vitalikTokens to url. To test your
                            sepolia tokens, add ?sepolia. Please note that if you use these query
                            params, you may get unexpected behavior in other parts of the app, if
                            you are pointed to local homeserver.
                        </Paragraph>
                    </FadeInBox>
                )}
            </AnimatePresence>
            {showTokenList && !isCustomAddress && (
                <AddressListSearch<TokenPropsForVList>
                    listMaxHeight={listMaxHeight ?? '500'}
                    noResults={noResults}
                    noResultsText="No items found."
                    data={results}
                    loader={() => {
                        return isLoading ? (
                            <Loader
                                simpleLoadingMessage={!showTokenSearch ? 'Loading ...' : undefined}
                            />
                        ) : undefined
                    }}
                    header={() => (
                        <Box paddingBottom="md">
                            <Text textTransform="uppercase" color="gray2">
                                Your wallet
                            </Text>
                        </Box>
                    )}
                    itemRenderer={(data) => (
                        <TokenListItem
                            data={data}
                            selectedItems={selectedItems}
                            tokenIds={tokenIdsMap[data.contractAddress] ?? []}
                            clearTokenIdsForContract={clearTokenIdsForContract}
                            removeTokenIdForContract={removeTokenIdForContract}
                            addTokenIdForContract={addTokenIdForContract}
                            toggleContract={toggleContract}
                            addContract={addContract}
                            removeContract={removeContract}
                        />
                    )}
                />
            )}
        </>
    )
}
