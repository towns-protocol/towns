// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPausable, IPausableBase} from "@towns-protocol/diamond/src/facets/pausable/IPausable.sol";
import {IERC721ABase} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IRuleEntitlement, IRuleEntitlementV2} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {RuleEntitlement} from "src/spaces/entitlements/rule/RuleEntitlement.sol";
import {RuleEntitlementV2} from "src/spaces/entitlements/rule/RuleEntitlementV2.sol";
import {IUserEntitlement} from "src/spaces/entitlements/user/IUserEntitlement.sol";
import {IEntitlementsManager} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IGuardian} from "src/spaces/facets/guardian/IGuardian.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {IRoles} from "src/spaces/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "test/crosschain/RuleEntitlementUtil.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Architect} from "src/factory/facets/architect/Architect.sol";
import {UserEntitlement} from "src/spaces/entitlements/user/UserEntitlement.sol";
import {Factory} from "src/utils/libraries/Factory.sol";
import {MockERC721} from "test/mocks/MockERC721.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// errors
import {Validator} from "src/utils/libraries/Validator.sol";

contract ArchitectTest is BaseSetup, IArchitectBase, IOwnableBase, IPausableBase {
    Architect public spaceArchitect;
    ICreateSpace public createSpaceFacet;

    function setUp() public override {
        super.setUp();
        spaceArchitect = Architect(spaceFactory);
        createSpaceFacet = ICreateSpace(spaceFactory);
    }

    function test_fuzz_createSpace(address founder, address user) external assumeEOA(founder) {
        vm.assume(founder != user);

        SpaceInfo memory spaceInfo = _createSpaceInfo("Test");
        spaceInfo.membership.settings.pricingModule = pricingModule;

        vm.prank(founder);
        address spaceAddress = createSpaceFacet.createSpace(spaceInfo);

        // expect owner to be founder
        assertTrue(IEntitlementsManager(spaceAddress).isEntitledToSpace(founder, Permissions.Read));

        // expect no one to be entitled
        assertFalse(IEntitlementsManager(spaceAddress).isEntitledToSpace(user, Permissions.Read));
    }

    function test_fuzz_createUserSpace_syncedEntitlements(
        address founder
    ) external assumeEOA(founder) {
        vm.prank(founder);

        address[] memory users = new address[](1);
        users[0] = _randomAddress();

        IArchitectBase.SpaceInfo memory spaceInfo = _createUserSpaceInfo("Test", users);
        spaceInfo.membership.settings.pricingModule = pricingModule;
        spaceInfo.membership.requirements.syncEntitlements = true;
        address spaceAddress = createSpaceFacet.createSpace(spaceInfo);

        IRoles.Role[] memory roles = IRoles(spaceAddress).getRoles();
        IRoles.Role memory memberRole;
        for (uint256 i; i < roles.length; ++i) {
            if (LibString.eq(roles[i].name, "Member")) {
                memberRole = roles[i];
                break;
            }
        }

        IEntitlementsManager.Entitlement[] memory entitlements = IEntitlementsManager(spaceAddress)
            .getEntitlements();
        address entitlementAddress;
        for (uint256 i; i < entitlements.length; ++i) {
            if (LibString.eq(entitlements[i].moduleType, "UserEntitlement")) {
                entitlementAddress = entitlements[i].moduleAddress;
                break;
            }
        }

        bytes memory entitlementData = IUserEntitlement(entitlementAddress)
            .getEntitlementDataByRoleId(memberRole.id);
        assertEq(entitlementData, abi.encode(users));
    }

    function test_fuzz_createGatedSpace_syncedEntitlements(
        address founder
    ) external assumeEOA(founder) {
        vm.prank(founder);
        IArchitectBase.SpaceInfo memory spaceInfo = _createGatedSpaceInfo("Test");
        spaceInfo.membership.settings.pricingModule = pricingModule;
        spaceInfo.membership.requirements.syncEntitlements = true;
        address spaceAddress = createSpaceFacet.createSpace(spaceInfo);

        IRoles.Role[] memory roles = IRoles(spaceAddress).getRoles();
        IRoles.Role memory memberRole;
        for (uint256 i; i < roles.length; ++i) {
            if (LibString.eq(roles[i].name, "Member")) {
                memberRole = roles[i];
                break;
            }
        }

        IEntitlementsManager.Entitlement[] memory entitlements = IEntitlementsManager(spaceAddress)
            .getEntitlements();
        address ruleEntitlementAddress;
        for (uint256 i; i < entitlements.length; ++i) {
            if (LibString.eq(entitlements[i].moduleType, "RuleEntitlementV2")) {
                ruleEntitlementAddress = entitlements[i].moduleAddress;
                break;
            }
        }

        IRuleEntitlement.RuleDataV2 memory ruleData = IRuleEntitlementV2(ruleEntitlementAddress)
            .getRuleDataV2(memberRole.id);

        assertEq(abi.encode(ruleData), abi.encode(RuleEntitlementUtil.getMockERC721RuleData()));
    }

    function test_fuzz_minterRoleEntitlementExists(address founder) external assumeEOA(founder) {
        vm.prank(founder);
        IArchitectBase.SpaceInfo memory spaceInfo = _createGatedSpaceInfo("Test");
        spaceInfo.membership.settings.pricingModule = pricingModule;
        address spaceAddress = createSpaceFacet.createSpace(spaceInfo);

        IEntitlementsManager.Entitlement[] memory entitlements = IEntitlementsManager(spaceAddress)
            .getEntitlements();

        address ruleEntitlementAddress;
        for (uint256 i; i < entitlements.length; ++i) {
            if (LibString.eq(entitlements[i].moduleType, "RuleEntitlementV2")) {
                ruleEntitlementAddress = entitlements[i].moduleAddress;
                break;
            }
        }

        // ruleData for minter role
        uint256 minterRoleId = 1;
        IRuleEntitlement.RuleDataV2 memory ruleData = IRuleEntitlementV2(ruleEntitlementAddress)
            .getRuleDataV2(minterRoleId);

        assertEq(abi.encode(ruleData), abi.encode(RuleEntitlementUtil.getMockERC721RuleData()));
    }

    function test_getImplementations() external view {
        (
            ISpaceOwner spaceTokenAddress,
            IUserEntitlement userEntitlementAddress,
            IRuleEntitlementV2 ruleEntitlementAddress,
            IRuleEntitlement legacyRuleEntitlementAddress
        ) = spaceArchitect.getSpaceArchitectImplementations();

        assertEq(spaceOwner, address(spaceTokenAddress));
        assertEq(userEntitlement, address(userEntitlementAddress));
        assertEq(ruleEntitlement, address(ruleEntitlementAddress));
        assertEq(legacyRuleEntitlement, address(legacyRuleEntitlementAddress));
    }

    function test_fuzz_setImplementations(address user) external {
        ISpaceOwner newSpaceToken = ISpaceOwner(address(new MockERC721()));
        IUserEntitlement newUserEntitlement = new UserEntitlement();
        IRuleEntitlement newRuleEntitlement = new RuleEntitlement();
        IRuleEntitlementV2 newRuleEntitlementV2 = new RuleEntitlementV2();

        vm.assume(user != deployer);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, user));
        spaceArchitect.setSpaceArchitectImplementations(
            newSpaceToken,
            newUserEntitlement,
            newRuleEntitlementV2,
            newRuleEntitlement
        );

        vm.prank(deployer);
        spaceArchitect.setSpaceArchitectImplementations(
            newSpaceToken,
            newUserEntitlement,
            newRuleEntitlementV2,
            newRuleEntitlement
        );

        (
            ISpaceOwner spaceTokenAddress,
            IUserEntitlement userEntitlementAddress,
            IRuleEntitlementV2 ruleEntitlementAddress,
            IRuleEntitlement legacyRuleEntitlement
        ) = spaceArchitect.getSpaceArchitectImplementations();

        assertEq(address(newSpaceToken), address(spaceTokenAddress));
        assertEq(address(newUserEntitlement), address(userEntitlementAddress));
        assertEq(address(newRuleEntitlementV2), address(ruleEntitlementAddress));
        assertEq(address(newRuleEntitlement), address(legacyRuleEntitlement));
    }

    function test_fuzz_transfer_space_ownership(
        string memory spaceName,
        address founder,
        address buyer
    ) external assumeEOA(founder) assumeEOA(buyer) {
        vm.assume(bytes(spaceName).length > 2);
        vm.assume(founder != buyer);

        SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
        spaceInfo.membership.settings.pricingModule = pricingModule;

        vm.prank(founder);
        address newSpace = createSpaceFacet.createSpace(spaceInfo);

        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(founder, Permissions.Read));

        (ISpaceOwner spaceOwner, , , ) = spaceArchitect.getSpaceArchitectImplementations();
        uint256 tokenId = spaceArchitect.getTokenIdBySpace(newSpace);

        vm.prank(founder);
        IGuardian(address(spaceOwner)).disableGuardian();

        vm.warp(IGuardian(address(spaceOwner)).guardianCooldown(founder));

        vm.prank(founder);
        IERC721(address(spaceOwner)).transferFrom(founder, buyer, tokenId);

        assertFalse(IEntitlementsManager(newSpace).isEntitledToSpace(founder, Permissions.Read));

        assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(buyer, Permissions.Read));
    }

    function test_fuzz_revertWhen_createSpaceAndPaused(
        string memory spaceName,
        address founder
    ) external assumeEOA(founder) {
        vm.assume(bytes(spaceName).length > 2);

        vm.prank(deployer);
        IPausable(address(spaceArchitect)).pause();

        SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
        spaceInfo.membership.settings.pricingModule = pricingModule;

        vm.prank(founder);
        vm.expectRevert(Pausable__Paused.selector);
        createSpaceFacet.createSpace(spaceInfo);

        vm.prank(deployer);
        IPausable(address(spaceArchitect)).unpause();

        vm.prank(founder);
        createSpaceFacet.createSpace(spaceInfo);
    }

    function test_fuzz_revertIfInvalidSpaceId(address founder) external assumeEOA(founder) {
        vm.expectRevert(Validator.InvalidLength.selector);

        SpaceInfo memory spaceInfo = _createSpaceInfo("");
        spaceInfo.membership.settings.pricingModule = pricingModule;

        vm.prank(founder);
        createSpaceFacet.createSpace(spaceInfo);
    }

    function test_revertIfNotProperReceiver(string memory spaceName) external {
        vm.assume(bytes(spaceName).length > 2);

        SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
        spaceInfo.membership.settings.pricingModule = pricingModule;

        vm.expectRevert(
            abi.encodeWithSelector(
                Factory.Factory__FailedDeployment.selector,
                abi.encodeWithSelector(IERC721ABase.TransferToNonERC721ReceiverImplementer.selector)
            )
        );

        vm.prank(address(this));
        createSpaceFacet.createSpace(spaceInfo);
    }

    function test_fuzz_revertIfInvalidPricingModule(
        string memory spaceName,
        address founder,
        address _pricingModule
    ) external assumeEOA(founder) {
        vm.assume(bytes(spaceName).length > 2);
        vm.assume(
            _pricingModule == address(0) ||
                !IPricingModules(address(spaceArchitect)).isPricingModule(_pricingModule)
        );

        SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
        spaceInfo.membership.settings.pricingModule = _pricingModule;

        vm.prank(founder);
        vm.expectRevert(Architect__InvalidPricingModule.selector);
        createSpaceFacet.createSpace(spaceInfo);
    }

    function test_fuzz_createSpace_updateMemberPermissions(
        string memory spaceName,
        address founder,
        address user
    ) external assumeEOA(founder) assumeEOA(user) {
        vm.assume(bytes(spaceName).length > 2);
        vm.assume(founder != user);

        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceName);
        spaceInfo.membership.settings.pricingModule = pricingModule;
        spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;

        vm.prank(founder);
        address spaceInstance = createSpaceFacet.createSpace(spaceInfo);

        // have another user join the space
        vm.prank(user);
        IMembership(spaceInstance).joinSpace(user);

        // assert that he cannot modify channels
        assertFalse(
            IEntitlementsManager(spaceInstance).isEntitledToSpace(
                user,
                Permissions.AddRemoveChannels
            )
        );

        // get the current member role
        IRoles.Role[] memory roles = IRoles(spaceInstance).getRoles();
        IRoles.Role memory memberRole;

        for (uint256 i; i < roles.length; ++i) {
            if (LibString.eq(roles[i].name, "Member")) {
                memberRole = roles[i];
                break;
            }
        }

        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.AddRemoveChannels;

        vm.prank(founder);
        IRoles(spaceInstance).addPermissionsToRole(memberRole.id, permissions);

        assertTrue(
            IEntitlementsManager(spaceInstance).isEntitledToSpace(
                user,
                Permissions.AddRemoveChannels
            )
        );
    }
}
