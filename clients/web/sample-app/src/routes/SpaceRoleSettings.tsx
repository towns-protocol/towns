import React, { useCallback, useState } from 'react'

export enum MembershipRequirement {
    Everyone = 'Everyone',
    CouncilNFT = 'CouncilNFT',
    ZioneerNFT = 'ZioneerNFT',
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
                case MembershipRequirement.CouncilNFT:
                    setMembershipRequirement(MembershipRequirement.CouncilNFT)
                    props.onChangeValue(MembershipRequirement.CouncilNFT)
                    break
                case MembershipRequirement.ZioneerNFT:
                    setMembershipRequirement(MembershipRequirement.ZioneerNFT)
                    props.onChangeValue(MembershipRequirement.ZioneerNFT)
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
                    value={MembershipRequirement.CouncilNFT}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.CouncilNFT}
                />{' '}
                Council NFT
                <input
                    readOnly
                    type="radio"
                    value={MembershipRequirement.ZioneerNFT}
                    name="membershipRequirement"
                    checked={membershipRequirement === MembershipRequirement.ZioneerNFT}
                />{' '}
                Zioneer NFT
            </fieldset>
        </div>
    )
}
