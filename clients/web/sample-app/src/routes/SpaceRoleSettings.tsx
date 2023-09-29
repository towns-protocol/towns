import React, { useCallback, useState } from 'react'

export enum MembershipRequirement {
    Everyone = 'Everyone',
    MemberNFT = 'MemberNFT',
    PioneerNFT = 'PioneerNFT',
}

interface Props {
    onChangeValue: (membershipRequirement: MembershipRequirement) => void
}

export function SpaceRoleSettings(props: Props): JSX.Element {
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
                case MembershipRequirement.MemberNFT:
                    setMembershipRequirement(MembershipRequirement.MemberNFT)
                    props.onChangeValue(MembershipRequirement.MemberNFT)
                    break
                case MembershipRequirement.PioneerNFT:
                    setMembershipRequirement(MembershipRequirement.PioneerNFT)
                    props.onChangeValue(MembershipRequirement.PioneerNFT)
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
                <legend>Who can mint?</legend>
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
                    value={MembershipRequirement.MemberNFT}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.MemberNFT}
                />{' '}
                Member NFT
                <input
                    readOnly
                    type="radio"
                    value={MembershipRequirement.PioneerNFT}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.PioneerNFT}
                />{' '}
                Pioneer NFT
            </fieldset>
        </div>
    )
}
