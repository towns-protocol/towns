import React from 'react'
import { Box, Text } from '@ui'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { useEnvironment } from 'hooks/useEnvironmnet'

type Props = {
    switchNetwork?: ReturnType<typeof useRequireTransactionNetwork>['switchNetwork']
    postCta?: string
    cta?: string
    children?: React.ReactNode
}

export const RequireTransactionNetworkMessage = ({
    switchNetwork,
    children,
    cta,
    postCta,
}: Props) => {
    const { chainName: name } = useEnvironment()
    return (
        <Text color="gray1" size="sm">
            {children || (
                <>
                    <Box
                        display="inline"
                        as="span"
                        cursor="pointer"
                        fontSize="sm"
                        color="cta1"
                        onClick={() => switchNetwork?.()}
                    >
                        {cta || `Switch to ${name}`}
                    </Box>{' '}
                    {postCta}
                </>
            )}
        </Text>
    )
}
