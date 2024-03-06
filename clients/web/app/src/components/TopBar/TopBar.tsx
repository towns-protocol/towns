import React from 'react'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SearchBar } from '@components/SearchBar/SearchBar'
import { Box, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'

export const TopBar = () => {
    return (
        <Stack horizontal minHeight="x7">
            <Box centerContent width="x8">
                <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                    <LogoSingleLetter />
                </a>
            </Box>
            <Box grow centerContent>
                <SearchBar />
            </Box>

            <Stack horizontal gap="sm" paddingRight="md">
                <BugReportButton />
                <Box centerContent width="x6">
                    <ProfileCardButton />
                </Box>
            </Stack>
        </Stack>
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
