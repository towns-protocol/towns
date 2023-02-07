// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../../utils/TestUtils.sol";

/** Interfaces */
import {IEntitlement} from "contracts/src/interfaces/IEntitlement.sol";

/** Libraries */
import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";
import {SpaceOwner} from "contracts/src/core/tokens/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/core/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/core/spaces/entitlements/TokenEntitlement.sol";

contract SpaceFactoryTestInitialize is TestUtils {
  SpaceFactory internal _spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  SpaceOwner internal spaceToken;
  string[] public initialPermissions;

  function setUp() public {
    spaceToken = new SpaceOwner("Space Token", "ZION");
    spaceImplementation = new Space();
    tokenImplementation = new TokenEntitlement();
    userImplementation = new UserEntitlement();
    _spaceFactory = new SpaceFactory();
    initialPermissions.push("Read");
  }

  function testUpgradeTo() external {
    address _item = _randomAddress();

    address spaceFactoryAddress = address(
      new ERC1967Proxy(
        address(_spaceFactory),
        abi.encodeCall(
          _spaceFactory.initialize,
          (
            address(spaceImplementation),
            address(tokenImplementation),
            address(userImplementation),
            address(spaceToken),
            initialPermissions
          )
        )
      )
    );
    spaceToken.setFactory(spaceFactoryAddress);
    _spaceFactory = SpaceFactory(spaceFactoryAddress);

    SpaceFactoryV2 spaceFactoryV2Implementation = new SpaceFactoryV2();

    _spaceFactory.upgradeTo(address(spaceFactoryV2Implementation));

    SpaceFactoryV2 spaceFactoryV2 = SpaceFactoryV2(spaceFactoryAddress);

    spaceFactoryV2.addItem(_item);
    assertEq(spaceFactoryV2.items(0), _item);

    assertEq(
      spaceFactoryV2.TOKEN_IMPLEMENTATION_ADDRESS(),
      address(tokenImplementation)
    );
  }
}

contract SpaceFactoryV2 is SpaceFactory {
  address[] public items;

  function addItem(address _item) external onlyOwner {
    items.push(_item);
  }
}
