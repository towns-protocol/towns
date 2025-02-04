import React from 'react'
import { Stack } from '@ui'

export function Section({ children }: { children: React.ReactNode | React.ReactNode[] }) {
    return (
        <Stack rounded="md" padding="md" background="lightHover">
            {children}
        </Stack>
    )
}
