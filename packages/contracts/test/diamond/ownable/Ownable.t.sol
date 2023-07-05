// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

//interfaces
import {IERC173, IERC173Events} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";

//libraries

//contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Ownable} from "contracts/src/diamond/facets/ownable/Ownable.sol";
import {MockOwnable} from "contracts/test/mocks/MockOwnable.sol";

// errors
import {Ownable__ZeroAddress, Ownable__NotOwner} from "contracts/src/diamond/facets/ownable/OwnableService.sol";

contract OwnableTest is FacetTest, IERC173Events {
  IERC173 internal ownable;

  function setUp() public override {
    super.setUp();
    ownable = IERC173(diamond);
  }

  function test_init() external {
    MockOwnable mock = new MockOwnable();
    mock.init();
    assertEq(mock.owner(), address(deployer));
  }

  function test_supportsInterface() external {
    assertTrue(IERC165(diamond).supportsInterface(type(IERC173).interfaceId));
  }

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

contract OwnableV2 is Ownable {
  function renounceOwnership() external {
    _renounceOwnership();
  }
}
