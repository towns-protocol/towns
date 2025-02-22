// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IGuardian} from "contracts/src/spaces/facets/guardian/IGuardian.sol";
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {ISpaceOwnerBase} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {Validator__InvalidStringLength, Validator__InvalidAddress} from "contracts/src/utils/Validator.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";

contract SpaceOwnerTest is ISpaceOwnerBase, IOwnableBase, BaseSetup {
  string internal name = "Awesome Space";
  string internal uri = "ipfs://space-name";
  string internal shortDescription = "short description";
  string internal longDescription = "long description";

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

    uint256 tokenId = mintSpace(uri, spaceAddress);
    vm.prank(spaceFactory);
    spaceOwnerToken.transferFrom(spaceFactory, alice, tokenId);

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
    spaceOwnerToken.mintSpace(
      name,
      uri,
      spaceAddress,
      shortDescription,
      longDescription
    );
  }

  function test_mintSpace_revert_invalidName() external {
    address spaceAddress = _randomAddress();

    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.mintSpace(
      "",
      uri,
      spaceAddress,
      shortDescription,
      longDescription
    );
  }

  function test_mintSpace_revert_invalidAddress() external {
    vm.expectRevert(Validator__InvalidAddress.selector);
    mintSpace(uri, address(0));
  }

  // ------------ updateSpace ------------

  function test_updateSpaceInfo() external {
    address spaceAddress = everyoneSpace;

    uint256 tokenId = mintSpace(uri, spaceAddress);

    vm.expectEmit(address(spaceOwnerToken));
    emit IERC4906.MetadataUpdate(tokenId);

    vm.prank(spaceFactory);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "New Name",
      "ipfs://new-name",
      "new short description",
      "new long description"
    );

    Space memory space = spaceOwnerToken.getSpaceInfo(spaceAddress);

    assertEq(space.name, "New Name");
    assertEq(space.uri, "ipfs://new-name");
    assertEq(space.shortDescription, "new short description");
    assertEq(space.longDescription, "new long description");
  }

  function test_updateSpace_revert_notSpaceOwner() external {
    address spaceAddress = _randomAddress();
    address alice = _randomAddress();

    uint256 tokenId = mintSpace(uri, spaceAddress);
    vm.prank(spaceFactory);
    spaceOwnerToken.transferFrom(spaceFactory, alice, tokenId);

    vm.prank(alice);
    IGuardian(spaceOwner).disableGuardian();

    vm.warp(IGuardian(spaceOwner).guardianCooldown(alice));

    vm.prank(_randomAddress());
    vm.expectRevert(SpaceOwner__OnlySpaceOwnerAllowed.selector);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "New Name",
      "ipfs://new-name",
      "new short description",
      "new long description"
    );
  }

  function test_updateSpace_revert_invalidName() external {
    address spaceAddress = _randomAddress();

    mintSpace(uri, spaceAddress);

    vm.prank(spaceFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "",
      "ipfs://new-name",
      "new short description",
      "new long description"
    );
  }

  function test_updateSpace_emptyUri() external {
    string memory defaultUri = "ipfs://default-uri";

    vm.prank(deployer);
    spaceOwnerToken.setDefaultUri(defaultUri);

    address spaceAddress = everyoneSpace;

    mintSpace(uri, spaceAddress);

    vm.prank(spaceFactory);
    spaceOwnerToken.updateSpaceInfo(
      spaceAddress,
      "New Name",
      "",
      "new short description",
      "new long description"
    );

    Space memory space = spaceOwnerToken.getSpaceInfo(spaceAddress);
    string memory tokenUri = spaceOwnerToken.tokenURI(space.tokenId);

    assertEq(space.uri, "");
    assertTrue(
      LibString.endsWith(
        LibString.toCase(tokenUri, false),
        LibString.toHexString(spaceAddress)
      )
    );
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

  // ------------ setDefaultUri ------------

  function test_setDefaultUri() external {
    string memory newUri = "ipfs://new-uri";

    vm.prank(deployer);
    spaceOwnerToken.setDefaultUri(newUri);

    assertEq(spaceOwnerToken.getDefaultUri(), newUri);
  }

  function test_setDefaultUri_revert_notOwner() external {
    address notOwner = _randomAddress();

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    spaceOwnerToken.setDefaultUri("ipfs://new-uri");
  }

  function test_setDefaultUri_revert_invalidUri() external {
    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    spaceOwnerToken.setDefaultUri("");
  }

  // ------------ tokenURI ------------

  function test_tokenURI() external {
    address spaceAddress = _randomAddress();

    uint256 tokenId = mintSpace(uri, spaceAddress);
    string memory tokenUri = spaceOwnerToken.tokenURI(tokenId);

    assertEq(tokenUri, uri);
  }

  function test_tokenURI_revert_nonexistentToken() external {
    uint256 tokenId = spaceOwnerToken.nextTokenId();
    vm.expectRevert(IERC721ABase.URIQueryForNonexistentToken.selector);
    spaceOwnerToken.tokenURI(tokenId);
  }

  function test_tokenURI_withDefaultUri() external {
    address spaceAddress = _randomAddress();
    string memory defaultUri = "ipfs://default-uri";

    vm.prank(deployer);
    spaceOwnerToken.setDefaultUri(defaultUri);

    uint256 tokenId = mintSpace("", spaceAddress);

    string memory tokenUri = spaceOwnerToken.tokenURI(tokenId);
    string memory expectedUri = string.concat(
      defaultUri,
      "/",
      Strings.toHexString(spaceAddress)
    );
    assertEq(LibString.toCase(tokenUri, false), expectedUri);
  }

  function test_tokenURI_withSlash() external {
    address spaceAddress = _randomAddress();
    string memory uriWithSlash = "ipfs://default-uri/";

    vm.prank(deployer);
    spaceOwnerToken.setDefaultUri(uriWithSlash);

    uint256 tokenId = mintSpace("", spaceAddress);

    string memory tokenUri = spaceOwnerToken.tokenURI(tokenId);
    string memory expectedUri = string.concat(
      uriWithSlash,
      Strings.toHexString(spaceAddress)
    );
    assertEq(LibString.toCase(tokenUri, false), expectedUri);
  }

  // ------------ getSpace ------------

  function test_fuzz_getSpaceInfo(address spaceAddress) external {
    vm.assume(spaceAddress != address(0));
    uint256 tokenId = mintSpace(uri, spaceAddress);

    Space memory space = spaceOwnerToken.getSpaceInfo(spaceAddress);

    assertEq(space.name, name);
    assertEq(space.uri, uri);
    assertEq(space.tokenId, tokenId);
    assertEq(space.shortDescription, shortDescription);
    assertEq(space.longDescription, longDescription);
  }

  function test_fuzz_getSpaceByTokenId(address spaceAddress) external {
    vm.assume(spaceAddress != address(0));
    uint256 tokenId = mintSpace(uri, spaceAddress);

    address space = spaceOwnerToken.getSpaceByTokenId(tokenId);

    assertEq(space, spaceAddress);
  }

  function test_getVotes() external {
    assertEq(spaceOwnerToken.getVotes(deployer), 0);

    vm.prank(spaceFactory);
    spaceOwnerToken.mintSpace(name, "", _randomAddress(), "", "");

    vm.prank(spaceFactory);
    spaceOwnerToken.delegate(deployer);

    assertEq(spaceOwnerToken.getVotes(deployer), 1);
  }

  function mintSpace(
    string memory _uri,
    address space
  ) internal returns (uint256 tokenId) {
    vm.prank(spaceFactory);
    tokenId = spaceOwnerToken.mintSpace(
      name,
      _uri,
      space,
      shortDescription,
      longDescription
    );
  }
}
