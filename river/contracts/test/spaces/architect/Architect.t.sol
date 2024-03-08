// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IPausableBase, IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";
import {IGuardian} from "contracts/src/spaces/facets/guardian/IGuardian.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {RuleEntitlement} from "contracts/src/crosschain/RuleEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Architect} from "contracts/src/spaces/facets/architect/Architect.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/user/UserEntitlement.sol";
import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";

// errors
import {Validator__InvalidStringLength} from "contracts/src/utils/Validator.sol";

contract ArchitectTest is
  BaseSetup,
  IArchitectBase,
  IOwnableBase,
  IPausableBase
{
  Architect public spaceArchitect;

  function setUp() public override {
    super.setUp();
    spaceArchitect = Architect(spaceFactory);
  }

  function test_createSpace() external {
    string memory name = "Test";
    address founder = _randomAddress();

    vm.prank(founder);
    address spaceInstance = spaceArchitect.createSpace(_createSpaceInfo(name));
    address spaceAddress = spaceArchitect.getSpaceById(name);

    assertEq(spaceAddress, spaceInstance, "Space address mismatch");

    assertTrue(spaceArchitect.isSpace(spaceAddress), "Space not registered");

    // expect owner to be founder
    assertTrue(
      IEntitlementsManager(spaceAddress).isEntitledToSpace(founder, "Read")
    );

    // expect no one to be entitled
    assertFalse(
      IEntitlementsManager(spaceAddress).isEntitledToSpace(
        _randomAddress(),
        "Read"
      )
    );
  }

  function test_getImplementations() external {
    (
      address spaceTokenAddress,
      IUserEntitlement userEntitlementAddress,
      IRuleEntitlement ruleEntitlementAddress,
      IWalletLink walletLinkAddress
    ) = spaceArchitect.getSpaceArchitectImplementations();

    assertEq(spaceOwner, spaceTokenAddress);
    assertEq(userEntitlement, address(userEntitlementAddress));
    assertEq(ruleEntitlement, address(ruleEntitlementAddress));
    assertEq(walletLink, address(walletLinkAddress));
  }

  function test_setImplementations() external {
    address newSpaceToken = address(new MockERC721());
    IUserEntitlement newUserEntitlement = new UserEntitlement();
    IRuleEntitlement newRuleEntitlement = new RuleEntitlement();
    IWalletLink newWalletLink = new WalletLink();

    address user = _randomAddress();

    vm.prank(user);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, user));
    spaceArchitect.setSpaceArchitectImplementations(
      newSpaceToken,
      newUserEntitlement,
      newRuleEntitlement,
      newWalletLink
    );

    vm.prank(deployer);
    spaceArchitect.setSpaceArchitectImplementations(
      newSpaceToken,
      newUserEntitlement,
      newRuleEntitlement,
      newWalletLink
    );

    (
      address spaceTokenAddress,
      IUserEntitlement userEntitlementAddress,
      IRuleEntitlement tokenEntitlementAddress,
      IWalletLink walletLink
    ) = spaceArchitect.getSpaceArchitectImplementations();

    assertEq(newSpaceToken, spaceTokenAddress);
    assertEq(address(newUserEntitlement), address(userEntitlementAddress));
    assertEq(address(newRuleEntitlement), address(tokenEntitlementAddress));
    assertEq(address(newWalletLink), address(walletLink));
  }

  function test_transfer_space_ownership(string memory spaceId) external {
    vm.assume(bytes(spaceId).length > 0);

    address founder = _randomAddress();
    address buyer = _randomAddress();

    vm.prank(founder);
    address newSpace = spaceArchitect.createSpace(_createSpaceInfo(spaceId));

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(founder, "Read")
    );

    (address spaceOwner, , , ) = spaceArchitect
      .getSpaceArchitectImplementations();
    uint256 tokenId = spaceArchitect.getTokenIdBySpaceId(spaceId);

    vm.prank(founder);
    IGuardian(spaceOwner).disableGuardian();

    vm.warp(IGuardian(spaceOwner).guardianCooldown(founder));

    vm.prank(founder);
    IERC721(spaceOwner).transferFrom(founder, buyer, tokenId);

    assertFalse(
      IEntitlementsManager(newSpace).isEntitledToSpace(founder, "Read")
    );

    assertTrue(IEntitlementsManager(newSpace).isEntitledToSpace(buyer, "Read"));
  }

  function test_revertWhen_createSpaceAndPaused(string memory name) external {
    vm.assume(bytes(name).length > 0);

    vm.prank(deployer);
    IPausable(address(spaceArchitect)).pause();

    address founder = _randomAddress();

    vm.prank(founder);
    vm.expectRevert(Pausable__Paused.selector);
    spaceArchitect.createSpace(_createSpaceInfo(name));

    vm.prank(deployer);
    IPausable(address(spaceArchitect)).unpause();

    vm.prank(founder);
    spaceArchitect.createSpace(_createSpaceInfo(name));
  }

  function test_revertIfInvalidSpaceId() external {
    address founder = _randomAddress();

    vm.expectRevert(Validator__InvalidStringLength.selector);

    vm.prank(founder);
    spaceArchitect.createSpace(_createSpaceInfo(""));
  }

  function test_revertIfNetworkIdTaken(string memory spaceId) external {
    vm.assume(bytes(spaceId).length > 0);

    address founder = _randomAddress();

    vm.prank(founder);
    spaceArchitect.createSpace(_createSpaceInfo(spaceId));

    vm.expectRevert(Architect__InvalidNetworkId.selector);
    vm.prank(_randomAddress());
    spaceArchitect.createSpace(_createSpaceInfo(spaceId));
  }

  function test_revertIfNotERC721Receiver(string memory spaceId) external {
    vm.assume(bytes(spaceId).length > 0);

    vm.expectRevert(
      IERC721ABase.TransferToNonERC721ReceiverImplementer.selector
    );
    spaceArchitect.createSpace(_createSpaceInfo(spaceId));
  }

  function test_createSpace_updateMemberPermissions(
    string memory spaceId
  ) external {
    vm.assume(bytes(spaceId).length > 0);

    address founder = _randomAddress();
    address user = _randomAddress();

    vm.prank(founder);
    address spaceInstance = spaceArchitect.createSpace(
      _createEveryoneSpaceInfo(spaceId)
    );

    // have another user join the space
    IMembership(spaceInstance).joinTown(user);

    // assert that he cannot modify channels
    assertFalse(
      IEntitlementsManager(spaceInstance).isEntitledToSpace(
        user,
        Permissions.ModifyChannels
      )
    );

    // get the current member role
    IRoles.Role[] memory roles = IRoles(spaceInstance).getRoles();
    IRoles.Role memory memberRole;

    for (uint256 i = 0; i < roles.length; i++) {
      if (keccak256(abi.encodePacked(roles[i].name)) == keccak256("Member")) {
        memberRole = roles[i];
        break;
      }
    }

    // update the permissions of the member role
    // string[] memory permissions = new string[](3);
    // permissions[0] = Permissions.Read;
    // permissions[1] = "Write";
    // permissions[2] = Permissions.ModifyChannels;
    // IRoles.CreateEntitlement[]
    //   memory entitlements = new IRoles.CreateEntitlement[](0);
    // vm.prank(founder);
    // IRoles(spaceInstance).updateRole(
    //   memberRole.id,
    //   memberRole.name,
    //   permissions,
    //   entitlements
    // );

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.ModifyChannels;

    vm.prank(founder);
    IRoles(spaceInstance).addPermissionsToRole(memberRole.id, permissions);

    assertTrue(
      IEntitlementsManager(spaceInstance).isEntitledToSpace(
        user,
        Permissions.ModifyChannels
      )
    );
  }
}
