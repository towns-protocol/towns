import React from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Stack, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PATHS } from 'routes'
import { useSettingsTransactionsStore } from '../store/hooks/settingsTransactionStore'
import { ModifiedRole } from '../store/hooks/useModifiedRoles'
import { MotionNotification, notificationMotion } from './Notification'

export const ResultsToast = (props: { modifiedRoles: ModifiedRole[] }) => {
    const { modifiedRoles } = props
    const spaceId = useSpaceIdFromPathname()
    const navigate = useNavigate()
    const settledTransactions = useSettingsTransactionsStore((state) => state.settledTransactions)

    const failedTransactions = Object.keys(settledTransactions)
        .filter((id) => settledTransactions[id].status === 'failed')
        .map((id) => settledTransactions[id])

    const successfulTransactions = Object.keys(settledTransactions)
        .filter((id) => settledTransactions[id].status === 'success')
        .map((id) => settledTransactions[id])

    const allSuccessful = failedTransactions.length === 0
    const hasChanges = modifiedRoles.length > 0
    const hasSettledTransactions = Object.keys(settledTransactions).length > 0

    return (
        <>
            <Stack position="absolute" bottom="md" left="md" right="md">
                <AnimatePresence>
                    {!hasChanges && hasSettledTransactions && (
                        <motion.div {...notificationMotion}>
                            <MotionNotification>
                                {allSuccessful ? (
                                    <Stack grow justifyContent="center" color="positive">
                                        Your changes have been saved
                                    </Stack>
                                ) : (
                                    <Stack grow gap justifyContent="center">
                                        {successfulTransactions.length > 0 && (
                                            <Stack horizontal>
                                                <Text color="positive">
                                                    Saved changes for:&nbsp;
                                                </Text>
                                                {successfulTransactions.map((data, index) => {
                                                    return (
                                                        <Text
                                                            key={data.changeData.metadata.name}
                                                            color="gray1"
                                                        >
                                                            {data.changeData.metadata.name}{' '}
                                                            {index <
                                                            successfulTransactions.length - 1
                                                                ? ', '
                                                                : ''}
                                                        </Text>
                                                    )
                                                })}
                                            </Stack>
                                        )}

                                        {failedTransactions.length > 0 && (
                                            <Stack horizontal>
                                                <Text color="error">
                                                    Failed to save changes for:&nbsp;
                                                </Text>
                                                {failedTransactions.map((data, index) => {
                                                    return (
                                                        <Text key={data.changeData.metadata.name}>
                                                            {data.changeData.metadata.name}{' '}
                                                            {index < failedTransactions.length - 1
                                                                ? ', '
                                                                : ''}
                                                        </Text>
                                                    )
                                                })}
                                            </Stack>
                                        )}
                                    </Stack>
                                )}

                                <Stack horizontal gap>
                                    <Button
                                        tone="level2"
                                        onClick={
                                            useSettingsTransactionsStore.getState().clearSettled
                                        }
                                    >
                                        Make more changes
                                    </Button>
                                    <Button
                                        tone="cta1"
                                        onClick={() => navigate(`/${PATHS.SPACES}/${spaceId}`)}
                                    >
                                        Close Settings
                                    </Button>
                                </Stack>
                            </MotionNotification>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>
        </>
    )
}
