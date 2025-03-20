import React, { PropsWithChildren, useCallback, useState } from 'react'
import { LookupUser, TipParams } from 'use-towns-client'
import { useQueryClient } from '@tanstack/react-query'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { optimisticallyUpdateTipLeaderboard } from '@components/TipsLeaderboard/useTipLeaderboard'
import { TipOption } from './types'
import { TipMenu } from './TipMenu'
import { TipConfirm } from './TipConfirm'

export function TipSheet(
    props: {
        messageOwner: LookupUser
        eventId: string
        onCloseTip: (args: { closeMessageMenu?: boolean }) => void
    } & PropsWithChildren,
) {
    const [tipValue, setTipValue] = useState<TipOption | undefined>()
    const qc = useQueryClient()
    const onTip = useCallback(
        (tip: TipParams) => {
            props.onCloseTip({ closeMessageMenu: true })
            optimisticallyUpdateTipLeaderboard(qc, tip)
        },
        [props, qc],
    )

    return (
        <ModalContainer asSheet onHide={() => props.onCloseTip({ closeMessageMenu: false })}>
            <TipMenu
                inSheet
                tipValue={tipValue}
                setTipValue={setTipValue}
                confirmRenderer={
                    <TipConfirm
                        tipValue={tipValue}
                        setTipValue={setTipValue}
                        messageOwner={props.messageOwner}
                        eventId={props.eventId}
                        onTip={onTip}
                        onInsufficientBalance={() => {
                            props.onCloseTip({ closeMessageMenu: true })
                        }}
                    />
                }
            />
        </ModalContainer>
    )
}
