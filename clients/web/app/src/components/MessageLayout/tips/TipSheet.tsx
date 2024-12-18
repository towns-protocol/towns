import React, { PropsWithChildren, useState } from 'react'
import { LookupUser } from 'use-towns-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TipOption } from './types'
import { TipMenu } from './TipMenu'
import { TipConfirm } from './TipConfirm'

export function TipSheet(
    props: {
        senderUser: LookupUser
        eventId: string
        onCloseTip: (args: { closeMessageMenu?: boolean }) => void
    } & PropsWithChildren,
) {
    const [tipValue, setTipValue] = useState<TipOption | undefined>()

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
                        senderUser={props.senderUser}
                        eventId={props.eventId}
                        onTip={() => props.onCloseTip({ closeMessageMenu: true })}
                    />
                }
            />
        </ModalContainer>
    )
}
