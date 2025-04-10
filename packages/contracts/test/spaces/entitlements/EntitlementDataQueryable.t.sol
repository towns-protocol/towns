// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";
import {IChannel} from "src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementDataQueryable, IEntitlementDataQueryableBase} from "src/spaces/facets/entitlements/extensions/IEntitlementDataQueryable.sol";
import {IRoles, IRolesBase} from "src/spaces/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";

// contracts
import {MembershipBaseSetup} from "test/spaces/membership/MembershipBaseSetup.sol";
import {EntitlementTestUtils} from "test/utils/EntitlementTestUtils.sol";

// mocks
import {MockUserEntitlement} from "test/mocks/MockUserEntitlement.sol";

contract EntitlementDataQueryableTest is
    EntitlementTestUtils,
    MembershipBaseSetup,
    IEntitlementDataQueryableBase,
    IRolesBase
{
    IEntitlementDataQueryable internal entitlements;
    MockUserEntitlement internal mockEntitlement;

    function setUp() public override {
        super.setUp();

        entitlements = IEntitlementDataQueryable(everyoneSpace);
        mockEntitlement = new MockUserEntitlement();
        mockEntitlement.initialize(everyoneSpace);

        vm.prank(founder);
        IEntitlementsManager(everyoneSpace).addEntitlementModule(address(mockEntitlement));
    }

    function test_getEntitlementDataByPermission() external view {
        EntitlementData[] memory entitlement = entitlements.getEntitlementDataByPermission(
            Permissions.JoinSpace
        );

        assertEq(entitlement.length, 1);
        assertEq(entitlement[0].entitlementType, "UserEntitlement");
    }

    function test_fuzz_getChannelEntitlementDataByPermission(address[] memory users) external {
        vm.assume(users.length > 0);
        for (uint256 i; i < users.length; ++i) {
            if (users[i] == address(0)) users[i] = vm.randomAddress();
        }

        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Read;

        CreateEntitlement[] memory createEntitlements = new CreateEntitlement[](1);
        createEntitlements[0] = CreateEntitlement({
            module: IEntitlement(mockEntitlement),
            data: abi.encode(users)
        });

        vm.prank(founder);
        uint256 roleId = IRoles(everyoneSpace).createRole(
            "test-channel-member",
            permissions,
            createEntitlements
        );

        uint256[] memory roles = new uint256[](1);
        roles[0] = roleId;
        bytes32 channelId = "test-channel";

        vm.prank(founder);
        IChannel(everyoneSpace).createChannel(channelId, "Metadata", roles);

        EntitlementData[] memory channelEntitlements = entitlements
            .getChannelEntitlementDataByPermission(channelId, Permissions.Read);

        assertEq(channelEntitlements.length, 1);
        assertEq(channelEntitlements[0].entitlementType, "MockUserEntitlement");
        assertEq(channelEntitlements[0].entitlementData, abi.encode(users));
    }

    function test_fuzz_getCrossChainEntitlementData(address user) external assumeEOA(user) {
        // TODO: find a better way to exclude user from being a minter
        vm.assume(user != alice && user != charlie);

        vm.recordLogs();

        vm.prank(user);
        membership.joinSpace(user);

        (, , , bytes32 transactionId, uint256 roleId, ) = _getRequestV2EventData(
            vm.getRecordedLogs()
        );

        EntitlementData memory data = IEntitlementDataQueryable(userSpace)
            .getCrossChainEntitlementData(transactionId, roleId);

        assertTrue(data.entitlementData.length > 0);
        assertEq(data.entitlementType, "RuleEntitlementV2");
    }
}
