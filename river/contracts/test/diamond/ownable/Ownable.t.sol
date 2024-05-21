// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {OwnableSetup} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

// errors
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

contract OwnableTest is OwnableSetup, IOwnableBase {
  function test_revertIfNotOwner() external {
    vm.stopPrank();
    address newOwner = _randomAddress();
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, newOwner)
    );
    vm.prank(newOwner);
    ownable.transferOwnership(newOwner);
  }

  function test_revertIZeroAddress() external {
    vm.expectRevert(Ownable__ZeroAddress.selector);
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

  function test_renounceOwnership() external {
    OwnableV2 ownableV2 = new OwnableV2();
    ownableV2.renounceOwnership();
    assertEq(ownableV2.owner(), address(0));
  }
}

contract OwnableV2 is OwnableFacet {
  function renounceOwnership() external {
    _renounceOwnership();
  }
}
