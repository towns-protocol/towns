// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MockEntitlement} from "contracts/test/mocks/MockEntitlement.sol";

import {console} from "forge-std/console.sol";

contract SetEntitlementTest is SpaceBaseSetup {
  MockEntitlement public implementation;
  address public entitlementAddress;

  function setUp() public {
    implementation = new MockEntitlement();
    entitlementAddress = address(new ERC1967Proxy(address(implementation), ""));
  }

  function testRevertIfRemovingDefaultEntitlement() external {
    address _space = createSimpleSpace();

    address _userEntitlement = getSpaceUserEntitlement(_space);

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setEntitlementModule(_userEntitlement, false);
  }

  function testSetEntitlement() external {
    address _space = createSimpleSpace();

    Space(_space).setEntitlementModule(entitlementAddress, true);

    assertTrue(Space(_space).hasEntitlement(entitlementAddress));
  }

  function testSetFalseEntitlement() external {
    address _space = createSimpleSpace();
    address _randomEntitlement = address(
      new ERC1967Proxy(address(new MockEntitlement()), "")
    );

    Space(_space).setEntitlementModule(_randomEntitlement, true);
    Space(_space).setEntitlementModule(entitlementAddress, true);
    Space(_space).setEntitlementModule(entitlementAddress, false);

    assertFalse(Space(_space).hasEntitlement(entitlementAddress));

    DataTypes.EntitlementModule[] memory entitlements = Space(_space)
      .getEntitlementModules();
    bool found = false;

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (entitlements[i].moduleAddress != entitlementAddress) continue;
      found = true;
      break;
    }

    assertFalse(found);
  }

  function testRevertIfEntitlementAlreadyWhitelisted() external {
    address _space = createSimpleSpace();

    Space(_space).setEntitlementModule(entitlementAddress, true);

    vm.expectRevert(Errors.EntitlementAlreadyWhitelisted.selector);
    Space(_space).setEntitlementModule(entitlementAddress, true);
  }

  function testRevertIfNotAllowedToSetEntitlement() external {
    address _space = createSimpleSpace();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setEntitlementModule(entitlementAddress, true);
  }

  function testRevertIfNotSupported() external {
    address _space = createSimpleSpace();

    UnsupportedEntitlement unsupportedEntitlement = new UnsupportedEntitlement();
    address unsupportedProxy = address(
      new ERC1967Proxy(address(unsupportedEntitlement), "")
    );

    vm.expectRevert(Errors.EntitlementModuleNotSupported.selector);
    Space(_space).setEntitlementModule(unsupportedProxy, true);
  }
}

contract UnsupportedEntitlement is MockEntitlement {
  function supportsInterface(
    bytes4
  ) public view virtual override returns (bool) {
    return false;
  }
}
