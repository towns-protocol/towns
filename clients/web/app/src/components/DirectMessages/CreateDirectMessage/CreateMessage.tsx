import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { PanelStack } from '@components/Panel/PanelContext'
import { useDevice } from 'hooks/useDevice'
import { DraftDirectMessage } from './CreateMessageDraft'
import { CreateMessageSelect } from './CreateMessageSelect'

export const CreateMessage = () => {
    const { isTouch } = useDevice()
    const [searchParams] = useSearchParams()

    const stackId =
        searchParams.get('stackId') === PanelStack.DIRECT_MESSAGES
            ? PanelStack.DIRECT_MESSAGES
            : PanelStack.MAIN

    const userIdsFromParams = searchParams.get('to')?.split(',')
    const isDraft = !!userIdsFromParams?.length
    const messageKey = userIdsFromParams?.sort().join() ?? 'new'

    return isTouch ? (
        <>
            <Panel label="New Message" padding="none" stackId={stackId}>
                <CreateMessageSelect />
            </Panel>
            {isDraft && (
                <Panel label="Draft" padding="none" stackId={stackId}>
                    <DraftDirectMessage userIdsFromParams={userIdsFromParams} />
                </Panel>
            )}
        </>
    ) : !isDraft ? (
        <CreateMessageSelect />
    ) : (
        <DraftDirectMessage userIdsFromParams={userIdsFromParams} key={messageKey} />
    )
}
