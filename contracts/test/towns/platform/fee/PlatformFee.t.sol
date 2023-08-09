// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

//interfaces
import {IPlatformFeeBase} from "contracts/src/towns/facets/platform/fee/IPlatformFee.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {PlatformFeeSetup} from "./PlatformFeeSetup.sol";

contract PlatformFeeTest is PlatformFeeSetup, IPlatformFeeBase, IOwnableBase {
  function test_getPlatformFee() external {
    (address recipient, uint16 basisPoints, uint256 flatFee) = platformFee
      .getPlatformFee();

    assertEq(recipient, address(deployer));
    assertEq(basisPoints, 0);
    assertEq(flatFee, 0);
  }

  function test_setPlatformFeeRecipient() external {
    address newRecipient = _randomAddress();

    vm.prank(deployer);
    platformFee.setPlatformFeeRecipient(newRecipient);

    (address recipient, , ) = platformFee.getPlatformFee();

    assertEq(recipient, newRecipient);
  }

  function test_setPlatformFee() external {
    uint16 newBps = 1000;
    uint256 newFlat = 100;

    vm.prank(deployer);
    platformFee.setPlatformFee(newBps, newFlat);

    (, uint16 basisPoints, uint256 flatFee) = platformFee.getPlatformFee();

    assertEq(basisPoints, newBps);
    assertEq(flatFee, newFlat);
  }

  // =============================================================
  //                           Reverts
  // =============================================================
  function test_revert_setPlatformFeeRecipient_notOwner() external {
    address notOwner = _randomAddress();

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    platformFee.setPlatformFeeRecipient(_randomAddress());
  }

  function test_revert_setPlatformFee_notOwner() external {
    address notOwner = _randomAddress();

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    platformFee.setPlatformFee(0, 0);
  }

  function test_revert_setPlatformFeeRecipient_zeroAddress() external {
    vm.prank(deployer);
    vm.expectRevert(InvalidPlatformFeeRecipient.selector);
    platformFee.setPlatformFeeRecipient(address(0));
  }

  function test_revert_setPlatformFee_bpsOverDenominator() external {
    uint16 bpsOverDenominator = uint16(platformFee.getPlatformDenominator());

    vm.prank(deployer);
    vm.expectRevert(InvalidPlatformFee.selector);
    platformFee.setPlatformFee(bpsOverDenominator + 1, 0);
  }
}
