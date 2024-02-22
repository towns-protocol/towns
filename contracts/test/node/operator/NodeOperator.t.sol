// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperatorBase, INodeOperator} from "contracts/src/node/operator/INodeOperator.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";

import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

contract NodeOperatorTest is
  BaseSetup,
  INodeOperatorBase,
  IOwnableBase,
  IERC721ABase
{
  NodeOperatorFacet internal operator;
  OwnableFacet internal ownable;
  IntrospectionFacet internal introspection;
  ERC721A internal erc721;
  River internal riverFacet;
  MainnetDelegation internal mainnetDelegate;

  // =============================================================
  //                           Initialization
  // =============================================================
  function setUp() public override {
    super.setUp();

    operator = NodeOperatorFacet(nodeOperator);
    ownable = OwnableFacet(nodeOperator);
    introspection = IntrospectionFacet(nodeOperator);
    erc721 = ERC721A(nodeOperator);
    riverFacet = River(riverToken);
    mainnetDelegate = MainnetDelegation(mainnetDelegation);
  }

  function test_initialization() public {
    assertEq(operator.name(), "Operator");
    assertEq(operator.symbol(), "OPR");
    assertTrue(
      introspection.supportsInterface(type(INodeOperator).interfaceId)
    );
  }

  // =============================================================
  //                           registerOperator
  // =============================================================

  function test_revertWhen_registerOperatorIsCalledWithZeroAddress() public {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.registerOperator(address(0));
  }

  modifier givenNodeOperatorIsRegistered(address _operator) {
    vm.assume(address(_operator) != address(0));
    vm.expectEmit();
    emit OperatorRegistered(_operator);
    operator.registerOperator(_operator);
    _;
  }

  function test_revertWhen_registerOperatorWithAlreadyRegisteredOperator(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    vm.expectRevert(NodeOperator__AlreadyRegistered.selector);
    operator.registerOperator(randomOperator);
  }

  function test_registerOperatorWithValidAddress(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    assertEq(operator.balanceOf(randomOperator), 1);
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Standby
    );
  }

  // =============================================================
  //                           isOperator
  // =============================================================
  function test_revertWhen_isOperatorWithInvalidOperator(
    address randomOperator
  ) external {
    assertFalse(operator.isOperator(randomOperator));
  }

  function test_isOperatorWithValidOperator(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    assertTrue(operator.isOperator(randomOperator));
  }

  // =============================================================
  //                       setOperatorStatus
  // =============================================================

  function test_revertWhen_setOperatorStatusIsCalledByNonOwner(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    address randomOwner = _randomAddress();

    vm.prank(randomOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, randomOwner)
    );
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
  }

  modifier whenCalledByDeployer() {
    vm.startPrank(deployer);
    _;
  }

  function test_revertWhen_setOperatorStatusIsCalledWithZeroAddress()
    public
    whenCalledByDeployer
  {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.setOperatorStatus(address(0), NodeOperatorStatus.Approved);
  }

  function test_revert_setOperatorStatus_withNotRegistered(
    address notRegisteredOperator
  ) public whenCalledByDeployer {
    vm.assume(notRegisteredOperator != address(0));
    vm.expectRevert(NodeOperator__NotRegistered.selector);
    operator.setOperatorStatus(
      notRegisteredOperator,
      NodeOperatorStatus.Approved
    );
  }

  function test_revertWhen_setOperatorStatusWithStatusNotChanged(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) whenCalledByDeployer {
    vm.expectRevert(NodeOperator__StatusNotChanged.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Standby);
  }

  function test_revertWhen_setOperatorStatusFromStandbyToExiting(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) whenCalledByDeployer {
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Exiting);
  }

  function test_revertWhen_setOperatorStatusFromStandbyToApprovedWithNoStake(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) whenCalledByDeployer {
    vm.expectRevert(NodeOperator__NotEnoughStake.selector);
    operator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
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

  modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
    vm.assume(caller != address(0));
    vm.assume(amount >= stakeRequirement && amount <= stakeRequirement * 10);
    vm.prank(bridge);
    riverFacet.mint(caller, amount);
    _;
  }

  modifier givenStakeComesFromMainnetDelegation(
    address _delegator,
    address _operator
  ) {
    vm.assume(_delegator != address(0));
    vm.assume(_operator != address(0));
    vm.prank(deployer);
    mainnetDelegate.setDelegation(_delegator, _operator, stakeRequirement);
    _;
  }

  modifier givenNodeOperatorHasStake(address delegator, address _operator) {
    vm.prank(delegator);
    riverFacet.delegate(_operator);
    _;
  }

  function test_setOperatorStatus_toApprovedFromMainnetDelegation(
    address delegator,
    address randomOperator
  )
    public
    givenNodeOperatorIsRegistered(randomOperator)
    givenStakeComesFromMainnetDelegation(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertEq(
      mainnetDelegate.getDelegatedStakeByOperator(randomOperator),
      stakeRequirement
    );
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Approved
    );
    assertContains(operator.getApprovedOperators(), randomOperator);
  }

  function test_setOperatorStatus_toApprovedFromBridgedTokens(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Approved
    );
    assertContains(operator.getApprovedOperators(), randomOperator);
  }

  function test_revertWhen_setOperatorStatusIsCalledFromApprovedToStandby(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
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
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
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

  function test_setOperatorStatus_toExiting(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
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
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Exiting
    );

    address[] memory approvedOperators = operator.getApprovedOperators();
    for (uint256 i = 0; i < approvedOperators.length; i++) {
      assertNotEq(approvedOperators[i], randomOperator);
    }
  }

  // =============================================================
  //                           getOperatorStatus
  // =============================================================

  function test_getOperatorStatus_operatorNotRegistered(
    address randomOperator
  ) public {
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Exiting
    );
  }

  function test_getOperatorStatus_registeredOperator(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Standby
    );
  }

  function test_getOperatorStatus_whenStatusIsApproved(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertTrue(
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Approved
    );
  }

  function test_getOperatorStatus_whenStatusIsExiting(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
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
      operator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Exiting
    );
  }

  // =============================================================
  //                           getOperators
  // =============================================================
  function test_getOperators_whenEmpty() public {
    assertEq(operator.getOperators().length, 0);
  }

  function test_getOperators(
    address randomOperator1
  ) public givenNodeOperatorIsRegistered(randomOperator1) {
    assertContains(operator.getOperators(), randomOperator1);
  }

  // =============================================================
  //                           getOperatorsByStatus
  // =============================================================
  function test_getOperatorsByStatus_whenEmpty() public {
    assertEq(
      operator.getOperatorsByStatus(NodeOperatorStatus.Standby).length,
      0
    );
  }

  function test_getOperatorsByStatus(
    address randomOperator1
  ) public givenNodeOperatorIsRegistered(randomOperator1) {
    assertContains(
      operator.getOperatorsByStatus(NodeOperatorStatus.Standby),
      randomOperator1
    );
    // make sure other statuses are empty
    assertEq(
      operator.getOperatorsByStatus(NodeOperatorStatus.Approved).length,
      0
    );
    assertEq(
      operator.getOperatorsByStatus(NodeOperatorStatus.Exiting).length,
      0
    );
  }

  // =============================================================
  //                           getApprovedOperators
  // =============================================================
  function test_getApprovedOperators_whenEmpty(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    assertEq(operator.getApprovedOperators().length, 0);
  }

  function test_getApprovedOperators(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenNodeOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertContains(operator.getApprovedOperators(), randomOperator);
  }

  // =============================================================
  //                           addSpaceDelegation
  // =============================================================
  function test_revertWhen_addSpaceDelegationIsCalledWithZeroSpaceAddress(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.addSpaceDelegation(address(0), randomOperator);
  }

  function test_revertWhen_addSpaceDelegationIsCalledWithZeroOperatorAddress()
    public
  {
    vm.expectRevert(NodeOperator__InvalidAddress.selector);
    operator.addSpaceDelegation(space, address(0));
  }

  function test_revertWhen_addSpaceDelegationIsCalledByInvalidSpaceOwner(
    address randomUser,
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
    vm.assume(randomUser != address(0));

    vm.prank(randomUser);
    vm.expectRevert(NodeOperator__InvalidSpace.selector);
    operator.addSpaceDelegation(space, randomOperator);
  }

  function test_revertWhen_addSpaceDelegationIsCalledWithInvalidOperator(
    address randomOperator
  ) public {
    vm.assume(randomOperator != address(0));
    vm.expectRevert(NodeOperator__NotRegistered.selector);
    operator.addSpaceDelegation(space, randomOperator);
  }

  modifier givenSpaceHasDelegatedToOperator(address _operator) {
    vm.prank(founder);
    vm.expectEmit();
    emit OperatorSpaceDelegated(space, _operator);
    operator.addSpaceDelegation(space, _operator);
    _;
  }

  function test_revertWhen_addSpaceDelegationIsCalledWithAlreadyDelegatedOperator(
    address randomOperator
  )
    public
    givenNodeOperatorIsRegistered(randomOperator)
    givenSpaceHasDelegatedToOperator(randomOperator)
  {
    vm.prank(founder);
    vm.expectRevert(
      abi.encodeWithSelector(
        NodeOperator__AlreadyDelegated.selector,
        randomOperator
      )
    );
    operator.addSpaceDelegation(space, randomOperator);
  }

  function test_addSpaceDelegation(
    address randomOperator
  )
    public
    givenNodeOperatorIsRegistered(randomOperator)
    givenSpaceHasDelegatedToOperator(randomOperator)
  {
    assertEq(operator.getSpaceDelegation(space), randomOperator);
  }

  // =============================================================
  //                        Non-Transferable
  // =============================================================
  function test_revertWhen_transferIsCalled(
    address randomOperator
  ) public givenNodeOperatorIsRegistered(randomOperator) {
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
