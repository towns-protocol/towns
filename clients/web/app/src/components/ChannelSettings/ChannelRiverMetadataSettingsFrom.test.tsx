import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as townsClient from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import { ChannelRiverMetadataSettingsForm } from './ChannelRiverMetadataSettingsForm'

const Wrapper = () => {
    return (
        <TestApp>
            <ChannelRiverMetadataSettingsForm />
        </TestApp>
    )
}

const autojoinSpy = vi.fn()
const hideUserJoinLeaveSpy = vi.fn()

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof townsClient
    return {
        ...actual,
        useSetChannelAutojoin: () => {
            return {
                mutateAsync: autojoinSpy,
            }
        },
        useSetHideUserJoinLeave: () => {
            return {
                mutateAsync: hideUserJoinLeaveSpy,
            }
        },
    }
})

vi.mock('framer-motion', async () => {
    return {
        AnimatePresence: ({ children }: { children: JSX.Element }) => children,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        motion: (c: any) => c,
    }
})

describe('<ChannelRiverMetadataSettingsForm />', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test('renders correct prefilled values when true', async () => {
        vi.spyOn(townsClient, 'useChannelData').mockImplementation(() => {
            return {
                spaceId: 'town1',
                channelId: 'channel1',
                channel: {
                    id: 'channel1',
                    label: 'some channel',
                    isAutojoin: true,
                    hideUserJoinLeaveEvents: true,
                },
            } satisfies ReturnType<typeof townsClient.useChannelData>
        })

        render(<Wrapper />)

        const autojoinCheckbox = screen.getByRole('checkbox', { name: /auto-join new members/i })
        const hideUserJoinLeaveEventsCheckbox = screen.getByRole('checkbox', {
            name: /hide join and leave/i,
        })
        expect(autojoinCheckbox).toBeChecked()
        expect(hideUserJoinLeaveEventsCheckbox).toBeChecked()
    })

    test('renders correct prefilled values when false', async () => {
        vi.spyOn(townsClient, 'useChannelData').mockImplementation(() => {
            return {
                spaceId: 'town1',
                channelId: 'channel1',
                channel: {
                    id: 'channel1',
                    label: 'some channel',
                    isAutojoin: false,
                    hideUserJoinLeaveEvents: false,
                },
            } satisfies ReturnType<typeof townsClient.useChannelData>
        })

        render(<Wrapper />)

        const autojoinCheckbox = screen.getByRole('checkbox', { name: /auto-join new members/i })
        const hideUserJoinLeaveEventsCheckbox = screen.getByRole('checkbox', {
            name: /hide join and leave/i,
        })
        expect(autojoinCheckbox).not.toBeChecked()
        expect(hideUserJoinLeaveEventsCheckbox).not.toBeChecked()
    })

    test('submits correct values', async () => {
        vi.spyOn(townsClient, 'useChannelData').mockImplementation(() => {
            return {
                spaceId: 'town1',
                channelId: 'channel1',
                channel: {
                    id: 'channel1',
                    label: 'some channel',
                    isAutojoin: false,
                    hideUserJoinLeaveEvents: false,
                },
            } satisfies ReturnType<typeof townsClient.useChannelData>
        })

        render(<Wrapper />)

        const autojoinCheckbox = screen.getByRole('checkbox', { name: /auto-join new members/i })
        const hideUserJoinLeaveEventsCheckbox = screen.getByRole('checkbox', {
            name: /hide join and leave/i,
        })
        const submitButton = screen.getByRole('button', { name: /update/i })

        autojoinCheckbox.click()
        hideUserJoinLeaveEventsCheckbox.click()

        expect(autojoinCheckbox).toBeChecked()
        expect(hideUserJoinLeaveEventsCheckbox).toBeChecked()
        await waitFor(() => expect(submitButton).toBeEnabled())

        fireEvent.click(submitButton)

        await waitFor(() =>
            expect(autojoinSpy).toHaveBeenCalledWith({
                autojoin: true,
                channelId: 'channel1',
                spaceId: 'town1',
            }),
        )

        await waitFor(() =>
            expect(hideUserJoinLeaveSpy).toHaveBeenCalledWith({
                hideEvents: true,
                channelId: 'channel1',
                spaceId: 'town1',
            }),
        )
    })
})
