import React from 'react'
import { Button, Stack } from '@ui'
import { useStore } from 'store/store'

type Props = {
    onClick: () => void
    text: string
    disabled?: boolean
}

export function BottomBar({ onClick, text, disabled }: Props) {
    const theme = useStore((state) => state.theme)
    return (
        <Stack centerContent width="100%" borderTop="level4">
            <Stack
                width="100%"
                maxWidth="1200"
                background={theme === 'dark' ? 'transparentDark' : 'transparentBright'}
            >
                <Stack
                    width="100%"
                    maxWidth="420"
                    alignSelf={{
                        desktop: 'end',
                        mobile: 'center',
                    }}
                    paddingY={{
                        mobile: 'md',
                        desktop: 'lg',
                    }}
                    paddingX={{
                        mobile: 'sm',
                    }}
                >
                    <Button tone="cta1" width="100%" disabled={disabled} onClick={onClick}>
                        {text}
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    )
}
