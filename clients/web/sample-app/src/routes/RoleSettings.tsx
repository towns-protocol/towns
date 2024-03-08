import React, { useCallback, useState } from 'react'

export enum MembershipRequirement {
    Everyone = 'Everyone',
    TownsToken = 'TownsNFT',
}

interface Props {
    onChangeValue: (membershipRequirement: MembershipRequirement) => void
}

export function RoleSettings(props: Props): JSX.Element {
    const [membershipRequirement, setMembershipRequirement] = useState<MembershipRequirement>(
        MembershipRequirement.Everyone,
    )

    const onChangeValue = useCallback(
        function (event: React.ChangeEvent<HTMLInputElement>): void {
            switch (event.target.value) {
                case MembershipRequirement.Everyone:
                    setMembershipRequirement(MembershipRequirement.Everyone)
                    props.onChangeValue(MembershipRequirement.Everyone)
                    break
                case MembershipRequirement.TownsToken:
                    setMembershipRequirement(MembershipRequirement.TownsToken)
                    props.onChangeValue(MembershipRequirement.TownsToken)
                    break
                default:
                    console.error('Unknown membership requirement')
                    break
            }
        },
        [props],
    )

    return (
        <div onChange={onChangeValue}>
            <fieldset>
                <legend>Member Role</legend>
                <input
                    readOnly
                    type="radio"
                    value={MembershipRequirement.Everyone}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.Everyone}
                />{' '}
                Everyone
                <input
                    readOnly
                    type="radio"
                    value={MembershipRequirement.TownsToken}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.TownsToken}
                />{' '}
                Towns NFT
            </fieldset>
        </div>
    )
}
