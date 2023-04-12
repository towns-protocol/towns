import React, { ChangeEvent } from 'react'
import { FormRender } from '@ui'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { LargeUploadImageTemplate } from './LargeUploadImageTemplate'

export const UploadImageDebugger = () => {
    const [spaceId, setSpaceId] = React.useState<string>(
        window.localStorage.getItem('TEST_SPACE_ID') ?? '',
    )

    function onChange(e: ChangeEvent<HTMLInputElement>) {
        const spaceId = e.target.value
        window.localStorage.setItem('TEST_SPACE_ID', spaceId)
        setSpaceId(spaceId)
    }

    return (
        <>
            <h2>Space Id</h2>
            <input type="text" value={spaceId} onChange={onChange} />
            <FormRender onSubmit={() => undefined}>
                {(props) => (
                    <>
                        <LargeUploadImageTemplate
                            {...props}
                            canEdit
                            type="spaceIcon"
                            formFieldName="debugger"
                            resourceId={spaceId}
                        >
                            <InteractiveSpaceIcon
                                spaceId={spaceId}
                                size="lg"
                                spaceName={spaceId}
                                address="0x123456"
                            />
                        </LargeUploadImageTemplate>
                    </>
                )}
            </FormRender>
        </>
    )
}
