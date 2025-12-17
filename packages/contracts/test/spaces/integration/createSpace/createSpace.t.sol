// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPausable, IPausableBase} from "@towns-protocol/diamond/src/facets/pausable/IPausable.sol";
import {IArchitectBase, IArchitect} from "src/factory/facets/architect/IArchitect.sol";
import {ICreateSpaceBase, ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlementBase} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IChannel} from "src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IMembershipBase, IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {IRolesBase, IRoles} from "src/spaces/facets/roles/IRoles.sol";

// libraries
import {stdError} from "forge-std/StdError.sol";
import {LibString} from "solady/utils/LibString.sol";
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {Validator} from "src/utils/libraries/Validator.sol";

// contracts
import {Test} from "forge-std/Test.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {MockERC721} from "test/mocks/MockERC721.sol";

contract IntegrationCreateSpace is
    IArchitectBase,
    ICreateSpaceBase,
    IPausableBase,
    IRolesBase,
    IRuleEntitlementBase,
    Test,
    BaseSetup
{
    using LibString for string;

    IArchitect public spaceArchitect;
    ICreateSpace public createSpaceFacet;

    function setUp() public override {
        super.setUp();
        spaceArchitect = IArchitect(spaceFactory);
        createSpaceFacet = ICreateSpace(spaceFactory);
    }

    function test_createEveryoneSpace(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(spaceInfo);

        // assert everyone can join
        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.JoinSpace));
    }

    function test_createEveryoneSpace_gas() external {
        test_createEveryoneSpace("TestSpace", makeAddr("founder"), makeAddr("user"));
    }

    function test_createUserGatedSpace(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) assumeEOA(user) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        address[] memory users = new address[](1);
        users[0] = user;

        SpaceInfo memory spaceInfo = _createUserSpaceInfo(spaceId, users);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;
        spaceInfo.membership.permissions = new string[](1);
        spaceInfo.membership.permissions[0] = Permissions.Read;

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(spaceInfo);

        assertTrue(
            IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.JoinSpace),
            "Bob should be entitled to mint a membership"
        );

        vm.prank(user);
        IMembership(newSpace).joinSpace(user);

        assertTrue(
            IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.Read),
            "Bob should be entitled to read"
        );
    }

    function test_createUserGatedSpace_gas() external {
        test_createUserGatedSpace("UserSpace", makeAddr("founder"), makeAddr("user"));
    }

    function test_createTokenGatedSpace(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) assumeEOA(user) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        address mock = address(new MockERC721());

        // We first define how many operations we want to have
        Operation[] memory operations = new Operation[](1);
        operations[0] = Operation({opType: CombinedOperationType.CHECK, index: 0});

        // We then define the type of operations we want to have
        CheckOperationV2[] memory checkOperations = new CheckOperationV2[](1);
        checkOperations[0] = CheckOperationV2({
            opType: CheckOperationType.ERC721,
            chainId: block.chainid,
            contractAddress: mock,
            params: abi.encode(uint256(1))
        });

        // We then define the logical operations we want to have
        LogicalOperation[] memory logicalOperations = new LogicalOperation[](0);

        // We then define the rule data
        RuleDataV2 memory ruleData = RuleDataV2({
            operations: operations,
            checkOperations: checkOperations,
            logicalOperations: logicalOperations
        });

        SpaceInfo memory spaceInfo = _createSpaceInfo(spaceId);
        spaceInfo.membership.requirements.ruleData = abi.encode(ruleData);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;

        vm.prank(founder);
        createSpaceFacet.createSpace(spaceInfo);

        MockERC721(mock).mint(user, 1);
    }

    function test_createTokenGatedSpace_gas() external {
        test_createTokenGatedSpace("TokenSpace", makeAddr("founder"), makeAddr("user"));
    }

    // =============================================================
    //                           Channels
    // =============================================================

    function test_createEveryoneSpace_with_separate_channels(
        string memory spaceId,
        address founder,
        address member
    ) external assumeEOA(founder) assumeEOA(member) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);
        vm.assume(founder != member);

        // create space with default channel
        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(spaceInfo);

        vm.prank(member);
        IMembership(newSpace).joinSpace(member);

        // look for user entitlement
        IEntitlementsManager.Entitlement[] memory entitlements = IEntitlementsManager(newSpace)
            .getEntitlements();

        address userEntitlement;

        for (uint256 i; i < entitlements.length; ++i) {
            if (entitlements[i].moduleType.eq("UserEntitlement")) {
                userEntitlement = entitlements[i].moduleAddress;
                break;
            }
        }

        if (userEntitlement == address(0)) {
            revert("User entitlement not found");
        }

        // create permissions for entitlement
        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Write;

        // create which entitlements have access to this role
        address[] memory users = new address[](1);
        users[0] = member;

        CreateEntitlement[] memory roleEntitlements = new CreateEntitlement[](1);

        // create entitlement adding users and user entitlement
        roleEntitlements[0] = CreateEntitlement({
            module: IEntitlement(userEntitlement),
            data: abi.encode(users)
        });

        // create role with permissions and entitlements attached to it
        vm.prank(founder);
        uint256 roleId = IRoles(newSpace).createRole({
            roleName: "Member",
            permissions: permissions,
            entitlements: roleEntitlements
        });

        // create channel with no roles attached to it
        vm.prank(founder);
        IChannel(newSpace).createChannel({
            channelId: "test2",
            metadata: "test2",
            roleIds: new uint256[](0)
        });

        // members can access the space
        assertTrue(
            IEntitlementsManager(newSpace).isEntitledToSpace({
                user: member,
                permission: Permissions.Write
            }),
            "Member should be able to access the space"
        );

        // however they cannot access the channel
        assertFalse(
            IEntitlementsManager(newSpace).isEntitledToChannel({
                channelId: "test2",
                user: member,
                permission: Permissions.Write
            }),
            "Member should not be able to access the channel"
        );

        // add role to channel to allow access
        vm.prank(founder);
        IChannel(newSpace).addRoleToChannel({channelId: "test2", roleId: roleId});

        bool isEntitledToChannelAfter = IEntitlementsManager(newSpace).isEntitledToChannel(
            "test2",
            member,
            Permissions.Write
        );
        // members can access the channel now
        assertTrue(isEntitledToChannelAfter, "Member should be able to access the channel");
    }

    function test_createSpaceWithPrepay_revertsIfETHSent() public {
        CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo("PrepaySpace");
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.requirements.everyone = true;

        address founder = makeAddr("founder");
        vm.deal(founder, 1 ether);

        vm.prank(founder);
        vm.expectRevert(Architect__UnexpectedETH.selector);
        createSpaceFacet.createSpaceWithPrepay{value: 1 ether}(spaceInfo);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CreateSpaceV2                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createSpaceV2_with_invalid_pricing_module() public {
        vm.prank(founder);
        vm.expectRevert(Validator.InvalidAddress.selector);
        createSpaceFacet.createSpaceV2(
            _createSpaceWithPrepayInfo("test"),
            SpaceOptions({to: founder})
        );
    }

    function test_createSpaceV2_with_invalid_to() public {
        CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo("test");
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.requirements.everyone = true;

        vm.prank(founder);
        vm.expectRevert(Validator.InvalidAddress.selector);
        createSpaceFacet.createSpaceV2(spaceInfo, SpaceOptions({to: address(0)}));
    }

    function test_createSpaceV2(
        string memory spaceId,
        address founder,
        address recipient
    ) public assumeEOA(founder) assumeEOA(recipient) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);
        vm.assume(founder != recipient);

        // create space with default channel
        CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.requirements.everyone = true;

        SpaceOptions memory options = SpaceOptions({to: recipient});

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpaceV2(spaceInfo, options);

        assertTrue(IERC173(newSpace).owner() == recipient);
    }

    function test_createSpaceV2_gas() external {
        test_createSpaceV2("V2Space", makeAddr("founder"), makeAddr("recipient"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Unified createSpace                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createSpace_CreateBasic(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;

        bytes memory data = abi.encode(spaceInfo);

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(Action.CreateBasic, data);

        // assert everyone can join
        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.JoinSpace));
    }

    function test_createSpace_CreateBasic_gas() external {
        test_createSpace_CreateBasic("BasicSpace", makeAddr("founder"), makeAddr("user"));
    }

    function test_createSpace_CreateWithPrepay_deprecated(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) assumeEOA(user) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        address[] memory users = new address[](1);
        users[0] = user;

        // prepay field is ignored (prepay functionality removed)
        CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.requirements.users = users;

        bytes memory data = abi.encode(spaceInfo);

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(Action.CreateWithPrepay, data);

        // prepay is now deprecated - just verify space was created with entitlements
        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.JoinSpace));
    }

    function test_createSpace_CreateWithPrepay_deprecated_gas() external {
        test_createSpace_CreateWithPrepay_deprecated(
            "PrepayUnified",
            makeAddr("founder"),
            makeAddr("user")
        );
    }

    function test_createSpace_CreateWithOptions(
        string memory spaceId,
        address founder,
        address recipient
    ) public assumeEOA(founder) assumeEOA(recipient) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);
        vm.assume(founder != recipient);

        CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo(spaceId);
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        spaceInfo.membership.requirements.everyone = true;

        SpaceOptions memory options = SpaceOptions({to: recipient});

        bytes memory data = abi.encode(spaceInfo, options);

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(Action.CreateWithOptions, data);

        assertTrue(IERC173(newSpace).owner() == recipient, "Recipient should own the space");
    }

    function test_createSpace_CreateWithOptions_gas() external {
        test_createSpace_CreateWithOptions(
            "OptionsSpace",
            makeAddr("founder"),
            makeAddr("recipient")
        );
    }

    function test_createSpace_CreateLegacy(
        string memory spaceId,
        address founder,
        address user
    ) public assumeEOA(founder) {
        vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

        // Use SpaceHelper to create legacy format space info
        CreateSpaceOld memory legacySpaceInfo = _createSpaceLegacy(
            spaceId,
            founder,
            tieredPricingModule
        );

        bytes memory data = abi.encode(legacySpaceInfo);

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(Action.CreateLegacy, data);

        // Verify space creation and legacy conversion
        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.JoinSpace));
    }

    function test_createSpace_CreateLegacy_gas() external {
        test_createSpace_CreateLegacy("LegacySpace", makeAddr("founder"), makeAddr("user"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Error Handling                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createSpace_invalidEnum() external {
        // Test invalid enum value - EVM validates enum bounds and causes panic
        vm.expectRevert(stdError.enumConversionError);

        bytes memory data = abi.encode(_createEveryoneSpaceInfo("test"));

        // Call with invalid enum value (4 is out of bounds for 0-3 enum)
        (bool success, ) = address(createSpaceFacet).call(
            abi.encodeWithSelector(
                bytes4(keccak256("createSpace(uint8,bytes)")),
                uint8(4), // Invalid enum value
                data
            )
        );
        assertFalse(success, "Should revert with enum conversion error");
    }

    function test_createSpace_whenPaused() external {
        // Set up the pause functionality test
        vm.prank(deployer);
        IPausable(address(spaceFactory)).pause();

        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("test");
        spaceInfo.membership.settings.pricingModule = tieredPricingModule;
        bytes memory data = abi.encode(spaceInfo);

        vm.prank(founder);
        vm.expectRevert(Pausable__Paused.selector);
        createSpaceFacet.createSpace(Action.CreateBasic, data);

        // Unpause and verify it works
        vm.prank(deployer);
        IPausable(address(spaceFactory)).unpause();

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(Action.CreateBasic, data);
        assertTrue(newSpace != address(0));
    }
}
