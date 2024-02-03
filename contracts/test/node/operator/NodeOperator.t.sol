// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperatorBase, INodeOperator} from "contracts/src/node/operator/INodeOperator.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// contracts
import {NodeBaseSetup} from "../NodeBaseSetup.sol";

contract NodeOperatorTest is
  NodeBaseSetup,
  INodeOperatorBase,
  IOwnableBase,
  IERC721ABase
{
  // =============================================================
  //                           Initialization
  // =============================================================

  function test_initialization() public {
    assertEq(operator.name(), "Operator");
    assertEq(operator.symbol(), "OPR");
    assertTrue(
      introspection.supportsInterface(type(INodeOperator).interfaceId)
    );
  }

  // =============================================================
  //                           Registration
  // =============================================================

  modifier givenAnOperatorIsRegistered(address _operator) {
    vm.assume(address(_operator) != address(0));
    vm.expectEmit();
    emit OperatorRegistered(_operator);
    operator.registerOperator(_operator);
    _;
  }

  function test_registerOperatorIsCalledWithValidAddress(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) {
    assertEq(operator.balanceOf(randomOperator), 1);
    assertTrue(
      operator.operatorStatus(randomOperator) == NodeOperatorStatus.Standby
    );
  }

  function test_revertWhen_registerOperatorIsCalledWithZeroAddress() public {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.registerOperator(address(0));
  }

  function test_revertWhen_registerOperatorIsCalledwithAlreadyRegisteredOperator(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) {
    vm.expectRevert(NodeOperator__AlreadyRegistered.selector);
    operator.registerOperator(randomOperator);
  }

  // =============================================================
  //                       Operator Status
  // =============================================================
  function test_revertWhen_setOperatorStatusIsCalledByNonOwner(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) {
    address randomOwner = _randomAddress();

    vm.prank(randomOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, randomOwner)
    );
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
  }

  modifier whenCalledByTheOwner() {
    vm.startPrank(deployer);
    _;
  }

  function test_revertWhen_setOperatorStatusIsCalledWithInvalidAddress()
    public
    whenCalledByTheOwner
  {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.setOperatorStatus(address(0), NodeOperatorStatus.Approved);
  }

  function test_revert_setOperatorStatus_withNotRegistered(
    address notRegisteredOperator
  ) public whenCalledByTheOwner {
    vm.assume(notRegisteredOperator != address(0));
    vm.expectRevert(NodeOperator__NotRegistered.selector);
    operator.setOperatorStatus(
      notRegisteredOperator,
      NodeOperatorStatus.Approved
    );
  }

  function test_revert_setOperatorStatus_withStatusNotChanged(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) whenCalledByTheOwner {
    vm.expectRevert(NodeOperator__StatusNotChanged.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Standby);
  }

  function test_RevertWhen_setOperatorStatusIsCalledFromStandbyToExiting(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) whenCalledByTheOwner {
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Exiting);
  }

  modifier whenSetOperatorStatusIsCalledByTheOwner(
    address _operator,
    NodeOperatorStatus _newStatus
  ) {
    vm.prank(deployer);
    vm.expectEmit();
    emit OperatorStatusChanged(_operator, _newStatus);
    operator.setOperatorStatus(_operator, _newStatus);
    _;
  }

  function test_revertWhen_setOperatorStatusIsCalledFromApprovedToStandby(
    address randomOperator
  )
    public
    givenAnOperatorIsRegistered(randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    vm.prank(deployer);
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Standby);
  }

  function test_revertWhen_setOperatorStatusIsCalledFromExitingToApproved(
    address randomOperator
  )
    public
    givenAnOperatorIsRegistered(randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Exiting
    )
  {
    vm.prank(deployer);
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
  }

  function test_setOperatorStatus_toApproved(
    address randomOperator
  )
    public
    givenAnOperatorIsRegistered(randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertTrue(
      operator.operatorStatus(randomOperator) == NodeOperatorStatus.Approved
    );
    assertContains(operator.approvedOperators(), randomOperator);
  }

  function test_setOperatorStatus_toExiting(
    address randomOperator
  )
    public
    givenAnOperatorIsRegistered(randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Exiting
    )
  {
    assertTrue(
      operator.operatorStatus(randomOperator) == NodeOperatorStatus.Exiting
    );

    address[] memory approvedOperators = operator.approvedOperators();
    for (uint256 i = 0; i < approvedOperators.length; i++) {
      assertNotEq(approvedOperators[i], randomOperator);
    }
  }

  // =============================================================
  //                        Non-Transferable
  // =============================================================
  function test_revertWhen_transferIsCalled(
    address randomOperator
  ) public givenAnOperatorIsRegistered(randomOperator) {
    vm.prank(randomOperator);
    vm.expectRevert(NodeOperator__NotTransferable.selector);
    erc721.transferFrom(randomOperator, _randomAddress(), 0);
  }

  function test_revertWhen_transferIsCalledNotRegistered(
    address notRegisteredOperator
  ) public {
    vm.prank(notRegisteredOperator);
    vm.expectRevert(OwnerQueryForNonexistentToken.selector);
    erc721.transferFrom(notRegisteredOperator, _randomAddress(), 0);
  }
}
