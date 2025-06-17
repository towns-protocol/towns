// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "scripts/common/Interaction.s.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";

contract InteractMembership is Interaction {
    address SPACE = 0xa38bCF15ab6B94d404c201Dee9f67c6428c0eCB1;
    address MEMBERSHIP_FACET = 0x33456B9fB51b4a4144c65C2AF0bF7EEA69403A9e;

    function __interact(address) internal override {
        MembershipFacet facet = new MembershipFacet();

        bytes memory bytecode = address(facet).code;

        vm.etch(MEMBERSHIP_FACET, bytecode);

        IMembership membership = IMembership(SPACE);

        require(
            membership.getMembershipPrice() == membership.getMembershipRenewalPrice(167),
            "Price mismatch"
        );
    }
}
