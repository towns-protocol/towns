// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {INodeOperator, INodeOperatorBase} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";
import {ISpaceDelegationBase} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";

// libraries

// structs
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {OwnableFacet} from "@river-build/diamond/src/facets/ownable/OwnableFacet.sol";
import {IntrospectionFacet} from "@river-build/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

contract NodeOperatorFacetTest is
  BaseSetup,
  INodeOperatorBase,
  ISpaceDelegationBase,
  IOwnableBase,
  IERC721ABase
{
  OwnableFacet internal ownable;
  IntrospectionFacet internal introspection;
  Towns internal towns;
  ERC721A internal erc721;
  INodeOperator internal operator;

  uint256 internal stakeRequirement = 10 ether;

  // =============================================================
  //                           Initialization
  // =============================================================
  function setUp() public override {
    super.setUp();

    ownable = OwnableFacet(address(baseRegistry));
    introspection = IntrospectionFacet(address(baseRegistry));
    erc721 = ERC721A(address(baseRegistry));
    towns = Towns(townsToken);
  }

  function test_initialization() public view {
    assertTrue(
      introspection.supportsInterface(type(INodeOperator).interfaceId)
    );
  }

  // =============================================================
  //                           registerOperator
  // =============================================================
  modifier givenOperatorIsRegistered(address _operator) {
    vm.assume(_operator != address(0));
    vm.assume(_operator != ZERO_SENTINEL);
    vm.assume(!nodeOperator.isOperator(_operator));

    vm.expectEmit();
    emit OperatorRegistered(_operator);
    emit OperatorRegistered(_operator);
    vm.prank(_operator);
    nodeOperator.registerOperator(_operator);
    _;
  }

  function test_revertWhen_registerOperatorWithAlreadyRegisteredOperator(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    vm.expectRevert(NodeOperator__AlreadyRegistered.selector);
    vm.prank(randomOperator);
    nodeOperator.registerOperator(randomOperator);
  }

  function test_registerOperatorWithValidAddress(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Standby
    );
  }

  function test_getOperatorsAfterRegisterOperator(
    address randomOperator1,
    address randomOperator2
  ) public {
    vm.assume(randomOperator1 != address(0));
    vm.assume(randomOperator2 != address(0));
    vm.assume(randomOperator1 != randomOperator2);
    vm.assume(!nodeOperator.isOperator(randomOperator1));
    vm.assume(!nodeOperator.isOperator(randomOperator2));
    address[] memory baseOperators = nodeOperator.getOperators();
    assertEq(baseOperators.length, 0);
    vm.prank(randomOperator1);
    nodeOperator.registerOperator(randomOperator1);
    baseOperators = nodeOperator.getOperators();
    assertEq(baseOperators.length, 1);
    assertEq(baseOperators[0], randomOperator1);
    vm.prank(randomOperator2);
    nodeOperator.registerOperator(randomOperator2);
    baseOperators = nodeOperator.getOperators();
    assertEq(baseOperators.length, 2);
    assertEq(baseOperators[0], randomOperator1);
    assertEq(baseOperators[1], randomOperator2);
  }

  // =============================================================
  //                           isOperator
  // =============================================================
  function test_revertWhen_isOperatorWithInvalidOperator(
    address randomOperator
  ) external view {
    vm.assume(randomOperator != address(0));
    vm.assume(nodeOperator.isOperator(randomOperator) == false);
    assertFalse(nodeOperator.isOperator(randomOperator));
  }

  function test_isOperatorWithValidOperator(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    assertTrue(nodeOperator.isOperator(randomOperator));
  }

  // =============================================================
  //                       setOperatorStatus
  // =============================================================

  function test_revertWhen_setOperatorStatusIsCalledByNonOwner(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    address randomOwner = _randomAddress();

    vm.prank(randomOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, randomOwner)
    );
    nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
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
    nodeOperator.setOperatorStatus(address(0), NodeOperatorStatus.Approved);
  }

  function test_revert_setOperatorStatus_withNotRegistered(
    address notRegisteredOperator
  ) public whenCalledByDeployer {
    vm.assume(notRegisteredOperator != address(0));
    vm.expectRevert(NodeOperator__NotRegistered.selector);
    nodeOperator.setOperatorStatus(
      notRegisteredOperator,
      NodeOperatorStatus.Approved
    );
  }

  function test_revertWhen_setOperatorStatusWithStatusNotChanged(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) whenCalledByDeployer {
    vm.expectRevert(NodeOperator__StatusNotChanged.selector);
    nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Standby);
  }

  function test_revertWhen_setOperatorStatusFromStandbyToExiting(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) whenCalledByDeployer {
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Exiting);
  }

  // function test_revertWhen_setOperatorStatusFromStandbyToApprovedWithNoStake(
  //   address randomOperator
  // ) public givenOperatorIsRegistered(randomOperator) whenCalledByDeployer {
  //   vm.expectRevert(NodeOperator__NotEnoughStake.selector);
  //   nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
  // }

  modifier whenSetOperatorStatusIsCalledByTheOwner(
    address _operator,
    NodeOperatorStatus _newStatus
  ) {
    vm.assume(_operator != address(0));
    vm.assume(_operator != ZERO_SENTINEL);

    vm.prank(deployer);
    vm.expectEmit();
    emit OperatorStatusChanged(_operator, _newStatus);
    nodeOperator.setOperatorStatus(_operator, _newStatus);
    _;
  }

  modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
    vm.assume(caller != address(0));
    vm.assume(caller != ZERO_SENTINEL);
    amount = bound(amount, stakeRequirement, stakeRequirement * 10);

    vm.prank(bridge);
    towns.mint(caller, amount);
    _;
  }

  modifier givenNodeOperatorHasStake(address delegator, address _operator) {
    vm.assume(delegator != address(0));
    vm.assume(delegator != ZERO_SENTINEL);
    vm.assume(_operator != address(0));
    vm.assume(_operator != ZERO_SENTINEL);
    vm.assume(_operator != delegator);

    vm.prank(delegator);
    towns.delegate(_operator);
    _;
  }

  modifier givenOperatorHasSetClaimAddress(
    address _operator,
    address _claimAddress
  ) {
    vm.assume(_claimAddress != address(0));
    vm.assume(_operator != address(0));
    vm.assume(_operator != _claimAddress);
    vm.prank(_operator);
    nodeOperator.setClaimAddressForOperator(_claimAddress, _operator);
    _;
  }

  // function test_setOperatorStatus_toApprovedFromMainnetDelegation(
  //   address delegator,
  //   address randomOperator
  // )
  //   public
  //   givenOperatorIsRegistered(randomOperator)
  //   givenStakeComesFromMainnetDelegation(delegator, randomOperator)
  //   whenSetOperatorStatusIsCalledByTheOwner(
  //     randomOperator,
  //     NodeOperatorStatus.Approved
  //   )
  // {
  //   assertEq(
  //     mainnetDelegate.getDelegatedStakeByOperator(randomOperator),
  //     stakeRequirement
  //   );
  //   assertTrue(
  //     nodeOperator.getOperatorStatus(randomOperator) == NodeOperatorStatus.Approved
  //   );
  // }

  function test_setOperatorStatus_toApprovedFromBridgedTokens(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    vm.assume(randomOperator != address(0));
    vm.assume(randomOperator != ZERO_SENTINEL);

    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Approved
    );
  }

  function test_revertWhen_setOperatorStatusIsCalledFromApprovedToStandby(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    vm.prank(deployer);
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Standby);
  }

  function test_revertWhen_setOperatorStatusIsCalledFromExitingToApproved(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
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
    vm.assume(randomOperator != address(0));
    vm.assume(randomOperator != ZERO_SENTINEL);

    vm.prank(deployer);
    vm.expectRevert(NodeOperator__InvalidStatusTransition.selector);
    nodeOperator.setOperatorStatus(randomOperator, NodeOperatorStatus.Approved);
  }

  function test_setOperatorStatus_toExiting(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
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
    vm.assume(randomOperator != address(0));
    vm.assume(randomOperator != ZERO_SENTINEL);

    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Exiting
    );

    // assertEq(totalApprovedOperators, 0);
  }

  // =============================================================
  //                           getOperatorStatus
  // =============================================================

  function test_getOperatorStatus_operatorNotRegistered(
    address randomOperator
  ) public view {
    vm.assume(!nodeOperator.isOperator(randomOperator));
    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Exiting
    );
  }

  function test_getOperatorStatus_registeredOperator(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Standby
    );
  }

  function test_getOperatorStatus_whenStatusIsApproved(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
    givenNodeOperatorHasStake(delegator, randomOperator)
    whenSetOperatorStatusIsCalledByTheOwner(
      randomOperator,
      NodeOperatorStatus.Approved
    )
  {
    assertTrue(
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Approved
    );
  }

  function test_getOperatorStatus_whenStatusIsExiting(
    address delegator,
    uint256 amount,
    address randomOperator
  )
    public
    givenCallerHasBridgedTokens(delegator, amount)
    givenOperatorIsRegistered(randomOperator)
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
      nodeOperator.getOperatorStatus(randomOperator) ==
        NodeOperatorStatus.Exiting
    );
  }

  // =============================================================
  //                           setOperationsAddress
  // =============================================================

  function test_revertWhen_setClaimAddressIsCalledByInvalidOperator(
    address randomOperator,
    address randomClaimer
  ) public {
    vm.expectRevert(NodeOperator__NotClaimer.selector);
    vm.prank(randomClaimer);
    nodeOperator.setClaimAddressForOperator(randomClaimer, randomOperator);
  }

  function test_setClaimAddress(
    address randomOperator,
    address randomClaimer
  )
    public
    givenOperatorIsRegistered(randomOperator)
    givenOperatorHasSetClaimAddress(randomOperator, randomClaimer)
  {
    assertEq(
      nodeOperator.getClaimAddressForOperator(randomOperator),
      randomClaimer
    );
  }

  // =============================================================
  //                           setCommissionRate
  // =============================================================
  function test_setCommissionRate(
    address randomOperator,
    uint256 rate
  ) external givenOperatorIsRegistered(randomOperator) {
    rate = bound(rate, 0, 10000);

    vm.prank(randomOperator);
    vm.expectEmit(address(nodeOperator));
    emit OperatorCommissionChanged(randomOperator, rate);
    nodeOperator.setCommissionRate(rate);

    assertEq(nodeOperator.getCommissionRate(randomOperator), rate);
  }

  function test_revertWhen_setCommissionRateIsCalledByInvalidOperator(
    address randomOperator,
    uint256 rate
  ) external {
    vm.assume(randomOperator != address(0));
    vm.assume(!nodeOperator.isOperator(randomOperator));
    rate = bound(rate, 0, 10000);

    vm.expectRevert(NodeOperator__NotRegistered.selector);
    vm.prank(randomOperator);
    nodeOperator.setCommissionRate(rate);
  }

  // =============================================================
  //                           addSpaceDelegation
  // =============================================================
  // function test_revertWhen_addSpaceDelegationIsCalledWithZeroSpaceAddress(
  //   address randomOperator
  // ) public givenOperatorIsRegistered(randomOperator) {
  //   vm.expectRevert(NodeOperator__InvalidAddress.selector);
  //   nodeOperator.addSpaceDelegation(address(0), randomOperator);
  // }

  // function test_revertWhen_addSpaceDelegationIsCalledWithZeroOperatorAddress()
  //   public
  // {
  //   vm.expectRevert(NodeOperator__InvalidAddress.selector);
  //   nodeOperator.addSpaceDelegation(space, address(0));
  // }

  // function test_revertWhen_addSpaceDelegationIsCalledByInvalidSpaceOwner(
  //   address randomUser,
  //   address randomOperator
  // ) public givenOperatorIsRegistered(randomOperator) {
  //   vm.assume(randomUser != address(0));

  //   vm.prank(randomUser);
  //   vm.expectRevert(NodeOperator__InvalidSpace.selector);
  //   nodeOperator.addSpaceDelegation(space, randomOperator);
  // }

  // function test_revertWhen_addSpaceDelegationIsCalledWithInvalidOperator(
  //   address randomOperator
  // ) public {
  //   vm.assume(randomOperator != address(0));
  //   vm.expectRevert(NodeOperator__NotRegistered.selector);
  //   nodeOperator.addSpaceDelegation(space, randomOperator);
  // }

  // modifier givenSpaceHasDelegatedToOperator(address _operator) {
  //   vm.prank(founder);
  //   vm.expectEmit();
  //   emit SpaceDelegatedToOperator(space, _operator);
  //   nodeOperator.addSpaceDelegation(space, _operator);
  //   _;
  // }

  // function test_revertWhen_addSpaceDelegationIsCalledWithAlreadyDelegatedOperator(
  //   address randomOperator
  // )
  //   public
  //   givenOperatorIsRegistered(randomOperator)
  //   givenSpaceHasDelegatedToOperator(randomOperator)
  // {
  //   vm.prank(founder);
  //   vm.expectRevert(
  //     abi.encodeWithSelector(
  //       NodeOperator__AlreadyDelegated.selector,
  //       randomOperator
  //     )
  //   );
  //   nodeOperator.addSpaceDelegation(space, randomOperator);
  // }

  // function test_addSpaceDelegation(
  //   address randomOperator
  // )
  //   public
  //   givenOperatorIsRegistered(randomOperator)
  //   givenSpaceHasDelegatedToOperator(randomOperator)
  // {
  //   assertEq(nodeOperator.getSpaceDelegation(space), randomOperator);
  // }

  // =============================================================
  //                        Non-Transferable
  // =============================================================
  function test_revertWhen_transferIsCalled(
    address randomOperator
  ) public givenOperatorIsRegistered(randomOperator) {
    vm.assume(randomOperator != address(0));

    vm.prank(randomOperator);
    vm.expectRevert(TransferFromIncorrectOwner.selector);
    erc721.transferFrom(randomOperator, _randomAddress(), 0);
  }

  function test_revertWhen_transferIsCalledNotRegistered(
    address notRegisteredOperator,
    address someAddress
  ) public {
    vm.assume(notRegisteredOperator != address(0));
    vm.assume(erc721.balanceOf(notRegisteredOperator) == 0);

    uint256 tokenId = erc721.totalSupply() + 1;

    vm.prank(notRegisteredOperator);
    vm.expectRevert(OwnerQueryForNonexistentToken.selector);
    erc721.transferFrom(notRegisteredOperator, someAddress, tokenId);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _getOperatorsByStatus(
    NodeOperatorStatus status
  ) internal view returns (address[] memory) {
    uint256 totalOperators = erc721.totalSupply();
    uint256 totalApprovedOperators = 0;

    address[] memory expectedOperators = new address[](totalOperators);

    for (uint256 i = 0; i < totalOperators; i++) {
      address operatorAddress = erc721.ownerOf(i);

      NodeOperatorStatus currentStatus = nodeOperator.getOperatorStatus(
        operatorAddress
      );

      if (currentStatus == status) {
        expectedOperators[i] = operatorAddress;
        totalApprovedOperators++;
      }
    }

    // trim the array
    assembly {
      mstore(expectedOperators, totalApprovedOperators)
    }

    return expectedOperators;
  }
}
