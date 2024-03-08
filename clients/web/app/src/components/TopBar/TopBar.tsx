import React, { useRef } from 'react'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SearchBar } from '@components/SearchBar/SearchBar'
import { Box, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { MintAnimation } from '@components/MintAnimation/MintAnimation'
import { useShouldDisplayMintAnimation } from 'hooks/useShouldDisplayMintAnimation'

export const TopBar = () => {
    const { shouldDisplayMintAnimation } = useShouldDisplayMintAnimation()
    const profileButtonRef = useRef<HTMLElement>(null)

    return (
        <>
            <Stack horizontal minHeight="x7">
                <Box centerContent width="x8">
                    <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                        <LogoSingleLetter />
                    </a>
                </Box>
                <Box grow centerContent>
                    <SearchBar />
                </Box>

                <Stack horizontal gap="md" paddingRight="lg" alignItems="center">
                    <BugReportButton />
                    <Box ref={profileButtonRef}>
                        <ProfileCardButton />
                    </Box>
                </Stack>
            </Stack>
            {shouldDisplayMintAnimation && <MintAnimation targetRef={profileButtonRef} />}
        </>
    )
}

export const TopBarSkeleton = () => {
    return (
        <Stack horizontal minHeight="x7">
            <Box centerContent width="x8">
                <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                    <LogoSingleLetter />
                </a>
            </Box>
            <Box grow />
        </Stack>
    )
}
