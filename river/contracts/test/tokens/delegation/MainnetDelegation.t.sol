// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

//interfaces
import {IMainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

/**
 * when setDelegation is called
 *   given caller is not owner
 *     it should revert with Ownable__NotOwner
 *   given caller is owner
 *     when values are valid
 *       it should set delegation and emit DelegationSet
 *     when delegator is address(0)
 *       it should revert with InvalidDelegator
 *     when operator is address(0)
 *      it should revert with InvalidOperator
 *    when quantity is 0
 *     it should revert with InvalidQuantity
 *   when delegation is already set
 *    it should revert with DelegationAlreadySet
 * when removeDelegation is called
 *  given caller is not owner
 *   it should revert with Ownable__NotOwner
 *  given caller is owner
 *   given delegation is already set
 *     it should remove delegation and emit DelegationRemoved
 *   given delegation is not set
 *    it should revert with DelegationNotSet
 * when getDelegationByDelegator is called
 *  it should return delegation
 * when getDelegationsByOperator is called
 *  it should return delegations
 * when getDelegatedStakeByOperator is called
 *  it should return total delegated stake
 */

contract MainnetDelegationTest is
  BaseSetup,
  IMainnetDelegationBase,
  IOwnableBase
{
  MainnetDelegation internal delegation;

  function setUp() public override {
    super.setUp();
    delegation = MainnetDelegation(mainnetDelegation);
  }

  // =============================================================
  //                           MODIFIERS
  // =============================================================

  modifier givenCallerIsOwner() {
    vm.prank(deployer);
    _;
  }

  modifier givenDelegationIsAlreadySet(
    address delegator,
    address operator,
    uint256 quantity
  ) {
    vm.assume(delegator != address(0));
    vm.assume(operator != address(0));
    vm.assume(quantity != 0);
    delegation.setDelegation(delegator, operator, quantity);
    _;
  }

  // =============================================================
  //                           TESTS
  // =============================================================

  // =============================================================
  //                           setDelegation
  // =============================================================

  function test_revertWhen_setDelegationNotAsOwner(
    address notOwner,
    address delegator,
    address operator,
    uint256 quantity
  ) public {
    vm.assume(deployer != notOwner);
    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    delegation.setDelegation(delegator, operator, quantity);
  }

  function test_setDelegationAsOwner(
    address delegator,
    address operator,
    uint256 quantity
  ) public givenCallerIsOwner {
    vm.assume(delegator != address(0));
    vm.assume(operator != address(0));
    vm.assume(quantity != 0);

    vm.expectEmit();
    emit DelegationSet(delegator, operator, quantity);
    delegation.setDelegation(delegator, operator, quantity);
  }

  function test_revertWhen_setDelegationWithInvalidDelegator(
    address operator,
    uint256 quantity
  ) public givenCallerIsOwner {
    address delegator = address(0);
    vm.expectRevert(
      abi.encodeWithSelector(InvalidDelegator.selector, delegator)
    );
    delegation.setDelegation(delegator, operator, quantity);
  }

  function test_revertWhen_setDelegationWithInvalidOperator(
    address delegator,
    uint256 quantity
  ) public givenCallerIsOwner {
    vm.assume(delegator != address(0));
    vm.assume(quantity != 0);

    address operator = address(0);
    vm.expectRevert(abi.encodeWithSelector(InvalidOperator.selector, operator));
    delegation.setDelegation(delegator, operator, quantity);
  }

  function test_revertWhen_setDelegationWithInvalidQuantity(
    address delegator,
    address operator
  ) public givenCallerIsOwner {
    vm.assume(delegator != address(0));
    vm.assume(operator != address(0));

    uint256 quantity = 0;
    vm.expectRevert(abi.encodeWithSelector(InvalidQuantity.selector, quantity));
    delegation.setDelegation(delegator, operator, quantity);
  }

  function test_revertWhen_setDelegationWithDelegationAlreadySet(
    address delegator,
    address operator,
    uint256 quantity
  )
    public
    givenCallerIsOwner
    givenDelegationIsAlreadySet(delegator, operator, quantity)
  {
    vm.prank(deployer);
    vm.expectRevert(
      abi.encodeWithSelector(DelegationAlreadySet.selector, delegator, operator)
    );
    delegation.setDelegation(delegator, operator, quantity);
  }

  // =============================================================
  //                           removeDelegation
  // =============================================================
  function test_revertWhen_removeDelegationNotAsOwner(address notOwner) public {
    vm.assume(deployer != notOwner);
    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    delegation.removeDelegation(notOwner);
  }

  function test_removeDelegationAsOwner(
    address delegator,
    address operator,
    uint256 quantity
  )
    public
    givenCallerIsOwner
    givenDelegationIsAlreadySet(delegator, operator, quantity)
  {
    vm.prank(deployer);
    vm.expectEmit();
    emit DelegationRemoved(delegator);
    delegation.removeDelegation(delegator);
  }

  function test_revertWhen_removeDelegationWithDelegationNotSet(
    address delegator
  ) public givenCallerIsOwner {
    vm.expectRevert(DelegationNotSet.selector);
    delegation.removeDelegation(delegator);
  }

  // =============================================================
  //                           getDelegationByDelegator
  // =============================================================

  function test_getDelegationByDelegator(
    address delegator,
    address operator,
    uint256 quantity
  )
    public
    givenCallerIsOwner
    givenDelegationIsAlreadySet(delegator, operator, quantity)
  {
    Delegation memory delegationResult = delegation.getDelegationByDelegator(
      delegator
    );

    assertEq(operator, delegationResult.operator);
    assertEq(quantity, delegationResult.quantity);
  }

  // =============================================================
  //                           getDelegationsByOperator
  // =============================================================
  function test_getDelegationsByOperator(
    address delegator,
    address operator,
    uint256 quantity
  )
    public
    givenCallerIsOwner
    givenDelegationIsAlreadySet(delegator, operator, quantity)
  {
    Delegation[] memory delegations = delegation.getDelegationsByOperator(
      operator
    );
    assertEq(1, delegations.length);
    assertEq(operator, delegations[0].operator);
    assertEq(quantity, delegations[0].quantity);
  }

  // =============================================================
  //                  getDelegatedStakeByOperator
  // =============================================================
  function test_getDelegatedStakeByOperator(
    address delegator,
    address operator,
    uint256 quantity
  )
    public
    givenCallerIsOwner
    givenDelegationIsAlreadySet(delegator, operator, quantity)
  {
    uint256 delegatedStake = delegation.getDelegatedStakeByOperator(operator);
    assertEq(quantity, delegatedStake);
  }
}
