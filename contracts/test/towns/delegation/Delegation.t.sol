// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDelegationBase} from "contracts/src/towns/facets/delegation/IDelegation.sol";

// libraries

// contracts
import {DelegationSetup} from "./DelegationSetup.sol";

contract DelegationTest is IDelegationBase, DelegationSetup {
  function test_delegateForAll() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    // act as the wallet owner
    vm.prank(wallet);
    // delegate to rootKey
    delegation.delegateForAll(rootKey, true);

    // check if the root key was delegated by the wallet
    assertTrue(delegation.checkDelegateForAll(rootKey, wallet));
  }

  function test_revokeForall() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    vm.prank(wallet);
    delegation.delegateForAll(rootKey, true);

    assertTrue(delegation.checkDelegateForAll(rootKey, wallet));

    vm.prank(wallet);
    delegation.delegateForAll(rootKey, false);

    assertFalse(delegation.checkDelegateForAll(rootKey, wallet));
  }

  function test_getDelegationsByDelegate() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    vm.prank(wallet);
    delegation.delegateForAll(rootKey, true);

    // get all the delegations made to the rootKey
    DelegationInfo[] memory info = delegation.getDelegationsByDelegate(rootKey);

    assertTrue(info.length == 1);
    assertEq(info[0].vault, wallet);
    assertEq(info[0].delegate, rootKey);
  }

  function test_multipleDelegations() external {
    address wallet = _randomAddress();
    address rootKey1 = _randomAddress();
    address rootKey2 = _randomAddress();

    vm.prank(wallet);
    delegation.delegateForAll(rootKey1, true);

    vm.prank(wallet);
    vm.expectRevert(
      abi.encodeWithSelector(DelegateAlreadyExists.selector, wallet, rootKey2)
    );
    delegation.delegateForAll(rootKey2, true);
  }
}
