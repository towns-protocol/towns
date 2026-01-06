// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IEntitlementBase} from "src/spaces/entitlements/IEntitlement.sol";
import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";
import {IChannel} from "src/spaces/facets/channels/IChannel.sol";
import {IRoles, IRolesBase} from "src/spaces/facets/roles/IRoles.sol";

// libraries

// contracts

import {Roles} from "src/spaces/facets/roles/Roles.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// mocks
import {MockUserEntitlement} from "test/mocks/MockUserEntitlement.sol";

abstract contract RolesBaseSetup is BaseSetup, IRolesBase, IEntitlementBase {
    MockUserEntitlement internal mockEntitlement;
    Roles internal roles;

    bytes32 CHANNEL_ID = "channel1";
    uint256 ROLE_ID;

    function setUp() public override {
        super.setUp();

        mockEntitlement = new MockUserEntitlement();
        mockEntitlement.initialize(everyoneSpace);

        roles = Roles(everyoneSpace);
    }

    modifier givenRoleExists() {
        string memory roleName = "role1";

        // create a role
        vm.prank(founder);
        ROLE_ID = roles.createRole(roleName, new string[](0), new IRoles.CreateEntitlement[](0));

        _;
    }

    modifier givenRoleIsInChannel() {
        // create a channel
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = ROLE_ID;

        vm.prank(founder);
        IChannel(everyoneSpace).createChannel(CHANNEL_ID, "ipfs://test", roleIds);

        _;
    }
}
