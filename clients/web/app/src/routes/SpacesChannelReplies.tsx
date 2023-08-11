import React from 'react'
import { useNavigate, useParams } from 'react-router'
import { MessageThreadPanel } from '@components/MessageThread/MessageThreadPanel'
import { Box } from '@ui'

export const SpacesChannelReplies = (props: {
    children?: React.ReactNode
    parentRoute?: string
}) => {
    const { parentRoute } = props
    const { messageId } = useParams()
    const navigate = useNavigate()

    const handleClose = !parentRoute
        ? undefined
        : () => {
              navigate(parentRoute)
          }

    // keep to make TS happy. this should never occur with since empty messageId
    // woultn't target this route
    const isValid = !!messageId

    const eventHash = window.location.hash?.replace(/^#/, '')
    const highlightId = eventHash?.match(/^\$[a-z0-9_-]{16,128}/i) ? eventHash : undefined

    return isValid ? (
        <MessageThreadPanel
            key={messageId}
            messageId={messageId}
            highlightId={highlightId}
            onClose={handleClose}
        />
    ) : (
        <>Invalid Thread</>
    )
}
