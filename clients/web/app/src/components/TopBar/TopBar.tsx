import React from 'react'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SearchBar } from '@components/SearchBar/SearchBar'
import { Box, Stack } from '@ui'
import { vars } from 'ui/styles/vars.css'

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

const LogoSingleLetter = () => (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.57642 1.34138C5.95367 0.87431 6.47023 0.557307 7.03587 0.424578C7.36833 0.306477 7.72627 0.242188 8.09923 0.242188H20.8241C22.5781 0.242188 24 1.66409 24 3.4181V6.39219C24 6.55675 23.9875 6.71838 23.9634 6.8762L23.9759 6.87238V7.03103C23.9759 8.69872 22.9259 10.0506 21.2582 10.0506C20.6807 10.0506 20.2125 10.5188 20.2125 11.0963V18.3218C20.2125 19.8551 20.2125 20.3477 19.4866 21.1916L17.2616 23.4376C17.2236 23.4854 17.1845 23.5325 17.1446 23.5788C16.5444 24.2752 15.8086 24.6287 15.0376 24.6287H8.40237C7.63131 24.6287 6.8955 24.2752 6.29533 23.5788C5.67489 22.8589 5.57642 21.9581 5.57642 21.2538V19.109C5.57642 17.7609 4.48355 16.6681 3.13544 16.6681C2.48805 16.6681 1.86718 16.4109 1.4094 15.9531L0.77776 15.3215C0.279769 14.8235 0 14.1481 0 13.4438V9.54305C0 8.93581 0.208118 8.34693 0.589664 7.87454C0.971209 7.40215 5.57642 1.34138 5.57642 1.34138ZM7.03711 3.46291C7.03711 2.87628 7.51266 2.40073 8.09928 2.40073H20.8241C21.4108 2.40073 21.8863 2.87628 21.8863 3.46291V6.437C21.8863 7.02362 21.4108 7.49917 20.8241 7.49917H18.5154C17.9288 7.49917 17.4533 7.97472 17.4533 8.56135V16.36C17.4533 16.9466 16.9777 17.4222 16.3911 17.4222H12.5323C11.9457 17.4222 11.4702 16.9466 11.4702 16.36V8.56135C11.4702 7.97472 10.9946 7.49917 10.408 7.49917H8.09928C7.51266 7.49917 7.03711 7.02362 7.03711 6.437V3.46291Z"
            fill={vars.color.foreground.gray2}
        />
    </svg>
)
