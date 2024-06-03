// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IGuardian} from "contracts/src/spaces/facets/guardian/IGuardian.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {ISpaceOwnerBase} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {Validator__InvalidStringLength, Validator__InvalidAddress} from "contracts/src/utils/Validator.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";

contract SpaceOwnerTest is ISpaceOwnerBase, IOwnableBase, BaseSetup {
  string internal name = "Awesome Space";
  string internal uri = "ipfs://space-name";

  SpaceOwner internal spaceOwnerToken;

  function setUp() public override {
    super.setUp();
    spaceOwnerToken = SpaceOwner(spaceOwner);
  }

  // ------------ mintSpace ------------
  function test_mintSpace() external {
    address spaceAddress = _randomAddress();
    address alice = _randomAddress();
    address bob = _randomAddress();

    vm.startPrank(spaceFactory);
    uint256 tokenId = spaceOwnerToken.mintSpace(name, uri, spaceAddress);
    spaceOwnerToken.transferFrom(spaceFactory, alice, tokenId);
    vm.stopPrank();

    vm.prank(alice);
    IGuardian(spaceOwner).disableGuardian();

    vm.warp(IGuardian(spaceOwner).guardianCooldown(alice));

    vm.prank(alice);
    spaceOwnerToken.transferFrom(alice, bob, tokenId);

    assertEq(spaceOwnerToken.ownerOf(tokenId), bob);
  }

  function test_mintSpace_revert_notFactory() external {
    address spaceAddress = _randomAddress();

    vm.prank(_randomAddress());
    vm.expectRevert(SpaceOwner__OnlyFactoryAllowed.selector);
    spaceOwnerToken.mintSpace(name, uri, spaceAddress);
  }

  function test_mintSpace_revert_invalidName() external {
    address spaceAddress = _randomAddress();

    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.mintSpace("", uri, spaceAddress);
  }

  function test_mintSpace_revert_invalidAddress() external {
    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidAddress.selector);
    spaceOwnerToken.mintSpace(name, uri, address(0));
  }

  // ------------ updateSpace ------------

  function test_updateSpaceInfo() external {
    address spaceAddress = _randomAddress();

    vm.prank(spaceFactory);
    spaceOwnerToken.mintSpace(name, uri, spaceAddress);

    vm.prank(spaceFactory);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "New Name",
      "ipfs://new-name"
    );

    Space memory space = spaceOwnerToken.getSpaceInfo(spaceAddress);

    assertEq(space.name, "New Name");
    assertEq(space.uri, "ipfs://new-name");
  }

  function test_updateSpace_revert_notSpaceOwner() external {
    address spaceAddress = _randomAddress();
    address alice = _randomAddress();

    vm.startPrank(spaceFactory);
    uint256 tokenId = spaceOwnerToken.mintSpace(name, uri, spaceAddress);
    spaceOwnerToken.transferFrom(spaceFactory, alice, tokenId);
    vm.stopPrank();

    vm.prank(alice);
    IGuardian(spaceOwner).disableGuardian();

    vm.warp(IGuardian(spaceOwner).guardianCooldown(alice));

    vm.prank(_randomAddress());
    vm.expectRevert(SpaceOwner__OnlySpaceOwnerAllowed.selector);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "New Name",
      "ipfs://new-name"
    );
  }

  function test_updateSpace_revert_invalidName() external {
    address spaceAddress = _randomAddress();

    vm.prank(spaceFactory);
    spaceOwnerToken.mintSpace(name, uri, spaceAddress);

    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.updateSpaceInfo(spaceAddress, "", "ipfs://new-name");
  }

  function test_updateSpace_revert_invalidUri() external {
    address spaceAddress = _randomAddress();

    vm.prank(spaceFactory);
    spaceOwnerToken.mintSpace(name, uri, spaceAddress);

    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.updateSpaceInfo(spaceAddress, "New Name", "");
  }

  // ------------ setFactory ------------

  function test_setFactory() external {
    address factory = _randomAddress();

    vm.prank(deployer);
    spaceOwnerToken.setFactory(factory);

    assertEq(spaceOwnerToken.getFactory(), factory);
  }

  function test_setFactory_revert_notOwner() external {
    address notFactory = _randomAddress();

    vm.prank(notFactory);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notFactory)
    );
    spaceOwnerToken.setFactory(notFactory);
  }

  function test_setFactory_revert_invalidAddress() external {
    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidAddress.selector);
    spaceOwnerToken.setFactory(address(0));
  }

  function test_getVotes() external {
    assertEq(spaceOwnerToken.getVotes(deployer), 0);

    vm.prank(spaceFactory);
    spaceOwnerToken.mintSpace(name, "", _randomAddress());

    vm.prank(spaceFactory);
    spaceOwnerToken.delegate(deployer);

    assertEq(spaceOwnerToken.getVotes(deployer), 1);
  }
}
