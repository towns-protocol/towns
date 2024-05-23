import React, { useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Box, BoxProps, IconButton, Paragraph, Stack } from '@ui'
import { formatUptime } from 'utils/formatDates'
import { shortAddress } from 'workers/utils'
import { SVGDot } from './SVGDot'
import { NodeData } from './hooks/useNodeData'
import { ConnectionStatusBanner } from './ConnectionStatusBanner'

type Props = {
    nodeData: NodeData
    contentBefore?: JSX.Element
    connectionStatus?: 'disconnected' | 'syncing' | 'synced' | undefined
} & BoxProps

export const NodeStatusPill = ({
    nodeData,
    contentBefore,
    connectionStatus,
    ...boxProps
}: Props) => {
    const nodeStatus = NodeStatus[nodeData.status]

    const [isToggled, setIsToggled] = useState(false)

    const onToggleClick = useCallback(() => {
        setIsToggled(!isToggled)
    }, [isToggled])

    const backgroundColor =
        connectionStatus === 'disconnected' || connectionStatus === 'syncing'
            ? 'negativeSubtle'
            : connectionStatus === 'synced'
            ? 'positiveSubtle'
            : 'level2'

    return (
        <Box padding gap="sm" rounded="sm" background={backgroundColor} {...boxProps}>
            <AnimatePresence mode="wait">
                {connectionStatus && (
                    <ConnectionStatusBanner status={connectionStatus} key={connectionStatus} />
                )}
            </AnimatePresence>
            <Stack gap="sm">
                <Stack
                    horizontal
                    alignItems="center"
                    gap="sm"
                    style={{ color: `#${nodeData.color.getHexString()}` }}
                >
                    <Box minWidth="x1" paddingRight="xs">
                        <SVGDot />
                    </Box>

                    <Paragraph truncate>{nodeData.nodeUrl}</Paragraph>

                    {nodeStatus && (
                        <Box alignItems="end">
                            <Box
                                fontSize="sm"
                                rounded="md"
                                paddingX="paragraph"
                                paddingY="sm"
                                background={nodeStatus.background}
                                tooltip={nodeStatus.description}
                            >
                                <Paragraph size="sm">{nodeData.statusText}</Paragraph>
                            </Box>
                        </Box>
                    )}
                    <Box grow alignItems="end">
                        <IconButton icon={isToggled ? 'minus' : 'plus'} onClick={onToggleClick} />
                    </Box>
                </Stack>

                {
                    <InfoRow
                        label="Health"
                        value={
                            <>
                                {nodeData.data?.grpc?.elapsed || 0} gRPC &bull;{' '}
                                {nodeData.data?.http20?.elapsed || 0} HTTP/2
                            </>
                        }
                    />
                }
                {isToggled && (
                    <>
                        <InfoRow
                            label="Uptime"
                            value={formatUptime(new Date(nodeData.data?.grpc?.start_time ?? 0))}
                        />
                        <InfoRow label="Version" value={nodeData.data?.grpc?.version ?? 0} />
                        <InfoRow
                            label="Address"
                            value={
                                <ClipboardCopy
                                    color="gray1"
                                    label={shortAddress(nodeData.operatorAddress)}
                                    clipboardContent={nodeData.operatorAddress}
                                />
                            }
                        />
                        <InfoRow
                            label="Operator"
                            value={
                                <ClipboardCopy
                                    color="gray1"
                                    label={shortAddress(nodeData.operator)}
                                    clipboardContent={nodeData.operator}
                                />
                            }
                        />
                    </>
                )}
            </Stack>
        </Box>
    )
}

const InfoRow = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => {
    return (
        <Stack horizontal gap="xs">
            <Paragraph color="gray2">{label}</Paragraph>
            <Paragraph truncate color="gray1">
                {value}
            </Paragraph>
        </Stack>
    )
}

const NodeStatus = [
    {
        statusCode: 0,
        statusText: 'Not Initialized',
        description: 'Initial entry, node is not contacted in any way',
        background: 'level4',
    },
    {
        status: 1,
        statusText: 'Remote Only',
        description: 'Node proxies data, does not store any data',
        background: 'level4',
    },
    {
        status: 2,
        statusText: 'Operational',
        description: 'Node serves existing data, accepts stream creation',
        background: 'positiveSubtle',
    },
    {
        status: 3,
        statusText: 'Failed',
        description: 'Node crash-exited, can be set by DAO',
        background: 'negativeSubtle',
    },
    {
        status: 4,
        statusText: 'Departing',
        description:
            'Node continues to serve traffic, new streams are not allocated, data needs to be moved out to other nodes before grace period.',

        background: 'negativeSubtle',
    },
    {
        status: 5,
        statusText: 'Deleted',
        description: 'Final state before RemoveNode can be called',
        background: 'negativeSubtle',
    },
] as const
