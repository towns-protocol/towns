import React, { useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useDevice } from 'hooks/useDevice'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { PanelButton } from '@components/Panel/PanelButton'
import { Icon, Paragraph, Stack } from '@ui'
import { EditMembershipSettingsPanel } from './EditMembershipSettingsPanel'
import { EditPrepaidPanel } from './EditPrepaidPanel'

export function SpaceSettingsNavigationPanel() {
    const { openPanel } = usePanelActions()
    const { isTouch } = useDevice()
    const [activeModal, setActiveModal] = useState<
        (typeof CHANNEL_INFO_PARAMS)[keyof typeof CHANNEL_INFO_PARAMS] | undefined
    >(undefined)

    const onEditSpaceSettingsClick = useEvent(() => {
        if (isTouch) {
            setActiveModal(CHANNEL_INFO_PARAMS.EDIT_MEMBERSHIP)
        } else {
            openPanel(CHANNEL_INFO_PARAMS.EDIT_MEMBERSHIP)
        }
    })

    const onEditPrepaidMembershipsClick = useEvent(() => {
        if (isTouch) {
            setActiveModal(CHANNEL_INFO_PARAMS.PREPAID_MEMBERSHIPS)
        } else {
            openPanel(CHANNEL_INFO_PARAMS.PREPAID_MEMBERSHIPS)
        }
    })

    const onHideModal = () => {
        setActiveModal(undefined)
    }

    return (
        <>
            <PanelButton onClick={onEditSpaceSettingsClick}>
                <Icon type="treasury" size="square_sm" color="gray2" />
                <Paragraph color="default">Edit Who Can Join, Price and Limit</Paragraph>
            </PanelButton>
            <PanelButton onClick={onEditPrepaidMembershipsClick}>
                <Icon type="personAdd" size="square_sm" color="gray2" />
                <Paragraph color="default">Add Prepaid Memberships</Paragraph>
            </PanelButton>
            {activeModal === 'edit-membership' && (
                <ModalContainer touchTitle="Edit Memberships" onHide={onHideModal}>
                    <Stack padding>
                        <EditMembershipSettingsPanel />
                    </Stack>
                </ModalContainer>
            )}
            {activeModal === 'prepaid-memberships' && (
                <ModalContainer touchTitle="Add Prepaid Memberships" onHide={onHideModal}>
                    <Stack padding>
                        <EditPrepaidPanel />
                    </Stack>
                </ModalContainer>
            )}
        </>
    )
}
