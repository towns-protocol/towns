import React, { useEffect, useMemo, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { getCouncilNftAddress } from 'use-zion-client'
import uniqBy from 'lodash/uniqBy'
import { Box, Button, Checkbox, Text, TextField, VList } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { getCachedTokensForWallet, useTokenContractsForAddress } from 'api/lib/tokenContracts'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn } from '@components/Transitions'
import { env, hasVitalkTokensParam } from 'utils'
import { TokenAvatar } from './TokenAvatar'
import { TokenProps } from './types'

export const searchArrayOfData = (array: TokenProps[], query: string): TokenProps[] => {
    const searchTerm = query
    const regEx = new RegExp(searchTerm, 'i')
    return array.filter((obj) =>
        Object.values(obj).some((v) => {
            if (typeof v === 'string') {
                return v.match(regEx)
            }
        }),
    )
}

const TokenCheckboxLabel = ({ imgSrc, label, contractAddress }: TokenProps) => {
    return (
        <Box flexDirection="row" alignItems="center" paddingY="sm">
            <TokenAvatar imgSrc={imgSrc} />
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

type TokenListProps = {
    isChecked: boolean
    wallet: string
    chainId?: number
} & UseFormReturn

type TokenPropsForVList = TokenProps & { id: string }

export const TokenList = ({
    isChecked,
    register,
    setValue,
    watch,
    chainId,
    wallet,
}: TokenListProps) => {
    const zionTokenAddress = useMemo(
        () => (chainId ? getCouncilNftAddress(chainId) : null),
        [chainId],
    )

    const [results, setResults] = React.useState<TokenPropsForVList[]>([])
    const [search, setSearch] = React.useState('')
    const selectedTokens = watch('tokens')
    const [page, setPage] = useState(getCachedTokensForWallet().previousPageKey || '')
    const loadMore = (pageKey: string) => {
        setPage(pageKey)
    }

    // NOTE: on Goerli, this is only going to return the Zion token, even if it is not in user's wallet
    // Fetching tokens via worker is only for local dev for now, until the worker is deployed (pending auth flow)
    const { data, isFetching, isLoading, isError } = useTokenContractsForAddress({
        wallet: hasVitalkTokensParam() ? 'vitalik.eth' : wallet,
        zionTokenAddress,
        enabled: Boolean(zionTokenAddress),
        pageKey: page,
        all: true,
        chainId,
    })

    useEffect(() => {
        if (!data?.tokens) {
            return
        }
        const unique = uniqBy(
            [...getCachedTokensForWallet().tokens, ...data.tokens],
            'contractAddress',
        )
        const _results = searchArrayOfData(unique, search).map((res) => ({
            ...res,
            id: res.contractAddress,
        }))
        setResults(_results)
        // do not depend on cached data
    }, [search, data])

    function handleClick(contractAddress: string) {
        const _selectedTokens = selectedTokens.filter((token: string) => token !== contractAddress)
        setValue('tokens', _selectedTokens)
    }

    return (
        <Box paddingTop="md" cursor="default">
            {!selectedTokens.length ? null : (
                <Box display="flex" flexDirection="row" gap="md" paddingY="md">
                    {selectedTokens.map((contractAddress: string) => {
                        const token = getCachedTokensForWallet().tokens.find(
                            (t) => t.contractAddress === contractAddress,
                        )
                        return (
                            <TokenAvatar
                                key={contractAddress}
                                imgSrc={token?.imgSrc || ''}
                                label={token?.label || ''}
                                contractAddress={contractAddress}
                                onClick={handleClick}
                            />
                        )
                    })}
                </Box>
            )}

            <TextField
                background="level3"
                placeholder="Search or paste contract address"
                onChange={(e) => setSearch(e.target.value)}
            />

            {isError && (
                <Box paddingTop="sm">
                    <Text size="sm" color="negative">
                        There was an error fetching your tokens
                    </Text>
                </Box>
            )}
            {env.IS_DEV && chainId === 31337 && (
                <Box padding="sm">
                    <Text size="sm">
                        Localhost will only return the zion token for anvil accounts. To test a long
                        list, add ?vitalikTokens to url
                    </Text>
                </Box>
            )}
            {isChecked && (
                <Box paddingTop="md" minHeight="100" maxHeight="500">
                    <VList<TokenPropsForVList>
                        list={results}
                        viewMargin={200}
                        esimtateItemSize={64}
                        itemRenderer={(item) => {
                            return (
                                <Box key={item.contractAddress} paddingX="sm">
                                    <Checkbox
                                        name="tokens"
                                        width="100%"
                                        value={item.contractAddress}
                                        label={<TokenCheckboxLabel {...item} />}
                                        register={register}
                                    />
                                </Box>
                            )
                        }}
                    />

                    {isLoading && <Loader />}

                    {data?.nextPageKey && (
                        <Box paddingY="md">
                            <Button
                                type="button"
                                animate={false}
                                onClick={() => loadMore(data?.nextPageKey || '')}
                            >
                                {isFetching && <ButtonSpinner />}
                                Load more
                            </Button>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}
