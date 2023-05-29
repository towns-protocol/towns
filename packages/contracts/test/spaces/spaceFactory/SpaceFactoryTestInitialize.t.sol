// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {TestUtils} from "contracts/test/utils/TestUtils.sol";

/** Interfaces */
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";

/** Libraries */
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {TownOwner} from "contracts/src/tokens/TownOwner.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {Pioneer} from "contracts/src/tokens/Pioneer.sol";

contract SpaceFactoryTestInitialize is TestUtils {
  SpaceFactory internal _spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  TownOwner internal spaceToken;
  Pioneer internal pioneer;
  string[] public initialPermissions;

  function setUp() public {
    pioneer = new Pioneer("Pioneer", "PNR", "");
    spaceToken = new TownOwner("Town Owner", "TNR", address(this), 0);
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
            address(pioneer),
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
