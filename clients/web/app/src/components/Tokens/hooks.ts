import { useMemo } from 'react'
import { Token } from './TokenSelector/tokenSchemas'
import { TokenType } from './types'

export function useValidTokens(args: {
    tokenMetadata: Token[] | undefined
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

export function useSorted(tokenMetadata: Token[] | undefined) {
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
