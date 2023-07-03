// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// interfaces

// libraries

// contracts

import {Town} from "contracts/src/towns/Town.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {TownProxy} from "contracts/src/towns/facets/proxy/TownProxy.sol";
import {TownProxyController} from "contracts/src/towns/facets/proxy/TownProxyController.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockProxyManager} from "contracts/test/mocks/MockProxyManager.sol";
import {IManagedProxy} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";

contract TownProxyTest is TestUtils {
  address internal town;
  address internal deployer;
  address internal townOwner;
  address internal townOwnerToken;
  uint256 internal tokenId;

  MockProxyManager internal proxyManager;
  TownProxy internal townProxy;

  function setUp() public {
    deployer = _randomAddress();
    townOwner = _randomAddress();

    vm.startPrank(deployer);

    town = address(new Town());
    townOwnerToken = address(new MockERC721());

    proxyManager = new MockProxyManager();
    proxyManager.init(town);

    tokenId = MockERC721(townOwnerToken).mintTo(townOwner);

    townProxy = new TownProxy(
      proxyManager.getImplementation.selector,
      address(proxyManager),
      "test",
      townOwnerToken,
      tokenId
    );

    vm.stopPrank();
  }

  function test_owner() external {
    address newOwner = _randomAddress();

    assertEq(townProxy.owner(), townOwner);

    vm.prank(townOwner);
    MockERC721(townOwnerToken).transferFrom(townOwner, newOwner, tokenId);

    assertEq(townProxy.owner(), newOwner);
  }

  function test_transferOwnership() external {
    assertEq(townProxy.owner(), townOwner);

    vm.prank(townOwner);
    MockERC721(townOwnerToken).approve(address(townProxy), tokenId);

    vm.prank(townOwner);
    townProxy.transferOwnership(_randomAddress());
  }

  function test_revert_when_invalid_implementation() external {
    proxyManager = new MockProxyManager();
    proxyManager.init(address(this));

    townProxy = new TownProxy(
      proxyManager.getImplementation.selector,
      address(proxyManager),
      "test",
      townOwnerToken,
      tokenId
    );

    vm.expectRevert(
      IManagedProxy.ManagedProxy__FetchImplementationFailed.selector
    );
    MockERC721(address(townProxy)).mintTo(_randomAddress());
  }

  function test_init() external {
    TownProxyV2 townProxyV2 = new TownProxyV2();
    townProxyV2.init();
  }
}

contract TownProxyV2 is TownProxyController {
  function init() external {
    __TownProxy_init("test");
  }
}
