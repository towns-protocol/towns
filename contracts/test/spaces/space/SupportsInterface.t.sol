// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";

contract SpaceSupportsInterfaceTest is SpaceBaseSetup {
  function testSupportsInterface() external {
    address _space = createSimpleSpace();
    assertTrue(ISpace(_space).supportsInterface(type(ISpace).interfaceId));
  }

  function testRevertSupportsInterface() external {
    address _space = createSimpleSpace();
    assertFalse(
      ISpace(_space).supportsInterface(type(IEntitlement).interfaceId)
    );
  }
}
