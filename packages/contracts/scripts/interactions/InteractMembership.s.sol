// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "scripts/common/Interaction.s.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

import {console} from "forge-std/console.sol";

contract InteractMembership is Interaction {
    address SPACE = 0x5494249cFF3F856d4611159f00C0eE916A96396D;
    address MEMBERSHIP_FACET = 0xfE645928B2EdB6176E6b792c09708d9421E7f91b;
    address SPACE_FACTORY = 0xC09Ac0FFeecAaE5100158247512DC177AeacA3e3;

    function __interact(address) internal override {
        IPlatformRequirements requirements = _getMembershipReqs();

        console.log("requirements.getMembershipMinPrice()", requirements.getMembershipMinPrice());
        console.log("requirements.getMembershipFee()", requirements.getMembershipFee());

        MembershipFacet facet = new MembershipFacet();
        bytes memory bytecode = address(facet).code;
        vm.etch(MEMBERSHIP_FACET, bytecode);

        IMembership membership = IMembership(SPACE);

        console.log("membership.getMembershipPrice()", membership.getMembershipPrice());
        console.log(
            "membership.getMembershipRenewalPrice(0)",
            membership.getMembershipRenewalPrice(0)
        );
        console.log(
            "membership.getMembershipRenewalPrice(1)",
            membership.getMembershipRenewalPrice(1)
        );
    }

    function _getMembershipReqs() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(SPACE_FACTORY);
    }
}
