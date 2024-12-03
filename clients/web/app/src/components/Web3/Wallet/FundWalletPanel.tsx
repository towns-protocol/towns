import React from 'react'
import { Panel } from '@components/Panel/Panel'
import { Onboarding } from '../Decent/Onboarding'

export const FundWalletPanel = React.memo(() => {
    return (
        <Panel>
            <Onboarding />
        </Panel>
    )
})
