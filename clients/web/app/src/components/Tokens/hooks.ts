import { useMemo } from 'react'
import { Token } from './TokenSelector/tokenSchemas'
import { TokenType } from './types'

export function useValidAndSortedTokens(args: {
    tokenMetadata: Token[] | undefined
    allowedTokenTypes: TokenType[]
}) {
    return useMemo(() => {
        if (!args.tokenMetadata) {
            return undefined
        }
        const validTokens = args.tokenMetadata.filter((t) =>
            args.allowedTokenTypes.includes(t.data.type),
        )

        return validTokens.length > 0
            ? validTokens.sort((a, b) => {
                  if (a.data.label && b.data.label) {
                      return a.data.label.localeCompare(b.data.label)
                  }
                  return 1
              })
            : undefined
    }, [args.allowedTokenTypes, args.tokenMetadata])
}
