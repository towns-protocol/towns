// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../../utils/TestUtils.sol";

/** Interfaces */
import {IEntitlement} from "contracts/src/spacesv2/interfaces/IEntitlement.sol";

/** Libraries */
import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";
import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/spacesv2/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spacesv2/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spacesv2/entitlements/TokenEntitlement.sol";

contract SpaceFactoryTestInitialize is TestUtils {
  SpaceFactory internal spaceFactory;
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
    spaceFactory = new SpaceFactory();
    initialPermissions.push("Read");
  }

  function testInitialize() external {
    spaceFactory.initialize(
      address(spaceImplementation),
      address(tokenImplementation),
      address(userImplementation),
      address(spaceToken),
      initialPermissions
    );

    assertEq(
      address(spaceFactory.TOKEN_IMPLEMENTATION_ADDRESS()),
      address(tokenImplementation)
    );
  }

  function testUpgradeTo() external {
    address _item = _randomAddress();

    address spaceFactoryAddress = address(
      new ERC1967Proxy(
        address(spaceFactory),
        abi.encodeCall(
          spaceFactory.initialize,
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
    spaceFactory = SpaceFactory(spaceFactoryAddress);

    SpaceFactoryV2 spaceFactoryV2Implementation = new SpaceFactoryV2();

    spaceFactory.upgradeTo(address(spaceFactoryV2Implementation));

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
