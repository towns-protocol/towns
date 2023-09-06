import { AnimatePresence } from 'framer-motion'
import uniqBy from 'lodash/uniqBy'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getMemberNftAddress } from 'use-zion-client'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { Box, BoxProps, Checkbox, MotionBox, Paragraph, Text, TextField } from '@ui'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import { shortAddress } from 'ui/utils/utils'
import { env } from 'utils'
import { fetchVitalikTokens, vitalikAddress } from 'hooks/useNetworkForNftApi'
import {
    AddressListSearch,
    SelectedItemsList,
    useTokenSearch,
    useWatchItems,
} from '@components/AddressListSearch/AddressListSearch'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { TokenAvatar } from './TokenAvatar'
import { TokenData, TokenProps } from './types'

const TokenCheckboxLabel = ({ imgSrc, label, contractAddress }: TokenProps) => {
    return (
        <Box flexDirection="row" alignItems="center" paddingY="sm">
            <TokenAvatar
                noLabel
                contractAddress={contractAddress}
                size="avatar_x4"
                imgSrc={imgSrc}
            />
            <Box paddingX="md">
                <Text>{label}</Text>
            </Box>
            <Text color="gray2">{shortAddress(contractAddress)}</Text>
        </Box>
    )
}

const loadingMessages = [
    'Grabbing your NFTs...',
    'Still grabbing your NFTs...',
    'Wow, you must have a lot of NFTs...',
    'How long have you been collecting NFTs??',
    'With all these NFTs you could build a bridge to the moon...',
]

const Loader = () => {
    const [message, setMessage] = useState(loadingMessages[0])
    const count = useRef(1)
    useEffect(() => {
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
    }, [])
    return (
        <Box centerContent paddingTop="md" flexDirection="row" gap="md">
            <ButtonSpinner />
            <FadeIn key={message}>
                <Text>{message}</Text>
            </FadeIn>
        </Box>
    )
}

type TokenPropsForVList = TokenData & { id: string }

export function TokensList({
    wallet,
    showTokenList,
    initialItems,
    onUpdate,
    listMaxHeight,
}: {
    wallet: string
    showTokenList: boolean
    initialItems?: TokenDataStruct[]
    onUpdate: (items: TokenDataStruct[]) => void
    listMaxHeight?: BoxProps['maxHeight']
}) {
    const { chainId } = useEnvironment()
    const zionTokenAddress = useMemo(() => getMemberNftAddress(chainId), [chainId])
    const { data, isLoading, isError } = useCollectionsForOwner({
        wallet: fetchVitalikTokens ? vitalikAddress : wallet,
        zionTokenAddress,
        enabled: Boolean(chainId),
        chainId,
    })

    const dataWithIdForVList = useMemo(() => {
        const _data = data?.tokens.map((t) => ({ ...t, id: t.contractAddress })) ?? []
        return uniqBy(_data, 'contractAddress')
    }, [data])

    const { search, results, setSearch, isCustomAddress } = useTokenSearch<TokenPropsForVList>({
        data: dataWithIdForVList,
    })

    const { selectedItems, onItemClick } = useWatchItems({
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
                    const token = data?.tokens.find((t) => t.contractAddress === item)
                    return (
                        <TokenAvatar
                            imgSrc={token?.imgSrc || ''}
                            label={token?.label || ''}
                            contractAddress={item}
                            size="avatar_md"
                            onClick={onItemClick}
                        />
                    )
                }}
            </SelectedItemsList>
            <MotionBox layout="position">
                <TextField
                    data-testid="token-search"
                    background="level2"
                    placeholder="Search or paste contract address"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </MotionBox>
            {isCustomAddress && (
                <Box padding="md" background="level3" rounded="sm">
                    <Checkbox
                        name="tokens"
                        width="100%"
                        value={search}
                        label={
                            <TokenCheckboxLabel
                                contractAddress={search}
                                label="Add token"
                                imgSrc=""
                            />
                        }
                        checked={selectedItems.map((t) => t.contractAddress).includes(search)}
                        onChange={() => onItemClick({ contractAddress: search })}
                    />
                </Box>
            )}
            <AnimatePresence mode="wait">
                {isError && (
                    <FadeInBox key="error">
                        <Paragraph size="sm" color="error">
                            There was an error fetching your tokens
                        </Paragraph>
                    </FadeInBox>
                )}
                {env.IS_DEV && chainId === 31337 && (
                    <FadeInBox key="dev-message" maxWidth="400">
                        <Paragraph size="sm" color="error">
                            DEV message: Localhost will only return the zion token for anvil
                            accounts. To test a long list, add ?vitalikTokens to url. To test your
                            goerli tokens, add ?goerli. Please note that if you use these query
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
                    noResultsText="No members found."
                    data={results}
                    loader={() => {
                        return isLoading ? <Loader /> : undefined
                    }}
                    header={() => (
                        <Box paddingBottom="md">
                            <Text textTransform="uppercase" color="gray2">
                                Your wallet
                            </Text>
                        </Box>
                    )}
                    itemRenderer={(data) => (
                        <Box key={data.contractAddress} paddingX="sm">
                            <Checkbox
                                name="tokens"
                                width="100%"
                                value={data.contractAddress}
                                label={<TokenCheckboxLabel {...data} />}
                                checked={selectedItems
                                    .map((t) => t.contractAddress)
                                    .includes(data.contractAddress)}
                                onChange={() =>
                                    onItemClick({ contractAddress: data.contractAddress })
                                }
                            />
                        </Box>
                    )}
                />
            )}
        </>
    )
}
