// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IERC173, IERC173Events} from "contracts/src/diamond/extensions/ownable/IERC173.sol";
import {IERC165} from "contracts/src/diamond/extensions/introspection/IERC165.sol";

//libraries

//contracts
import {DiamondBaseSetup} from "contracts/test/diamond/DiamondBaseSetup.sol";

// errors
import {Ownable_ZeroAddress, Ownable_NotOwner} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

contract OwnableTest is DiamondBaseSetup, IERC173Events {
  IERC173 internal ownable;

  function setUp() external {
    ownable = IERC173(diamond);
  }

  function test_supportsInterface() external {
    assertTrue(IERC165(diamond).supportsInterface(type(IERC173).interfaceId));
  }

  function test_revertIfNotOwner() external {
    vm.stopPrank();

    address newOwner = _randomAddress();

    vm.expectRevert(
      abi.encodeWithSelector(Ownable_NotOwner.selector, newOwner)
    );

    vm.prank(newOwner);
    ownable.transferOwnership(newOwner);
  }

  function test_revertIZeroAddress() external {
    vm.expectRevert(Ownable_ZeroAddress.selector);

    ownable.transferOwnership(address(0));
  }

  function test_emitOwnershipTransferred() external {
    address newOwner = _randomAddress();

    vm.expectEmit(true, true, true, true, diamond);
    emit OwnershipTransferred(deployer, newOwner);

    ownable.transferOwnership(newOwner);
  }

  function test_transerOwnership() external {
    address newOwner = _randomAddress();
    ownable.transferOwnership(newOwner);

    assertEq(ownable.owner(), newOwner);
  }
}
