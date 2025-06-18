// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "scripts/common/Interaction.s.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

import {console} from "forge-std/console.sol";

contract InteractMembership is Interaction {
    address SPACE = 0xDEeB21eD094Ec950C51D90aCCa2790D43FA9b432;
    address MEMBERSHIP_FACET = 0xD842F3D97B73BfEC5b2Cd3DB71309Db69a9344EE;
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
