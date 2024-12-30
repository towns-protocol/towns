import React, { PropsWithChildren, useState } from 'react'
import { LookupUser } from 'use-towns-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
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
                        onTip={() => props.onCloseTip({ closeMessageMenu: true })}
                        onInsufficientBalance={() => {
                            props.onCloseTip({ closeMessageMenu: true })
                        }}
                    />
                }
            />
        </ModalContainer>
    )
}
