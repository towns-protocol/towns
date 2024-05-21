// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
interface INodeOperatorBase {
  // =============================================================
  //                           Errors
  // =============================================================
  error NodeOperator__InvalidAddress();
  error NodeOperator__NotTransferable();
  error NodeOperator__AlreadyRegistered();
  error NodeOperator__StatusNotChanged();
  error NodeOperator__InvalidStatusTransition();
  error NodeOperator__NotRegistered();
  error NodeOperator__InvalidOperator();
  error NodeOperator__InvalidSpace();
  error NodeOperator__AlreadyDelegated(address operator);
  error NodeOperator__NotEnoughStake();
  error NodeOperator__InvalidStakeRequirement();
  error NodeOperator__ClaimAddressNotChanged();
  error NodeOperator__InvalidCommissionRate();
  error NodeOperator__NotClaimer();
  // =============================================================
  //                           Events
  // =============================================================
  event OperatorRegistered(address indexed operator);
  event OperatorStatusChanged(
    address indexed operator,
    NodeOperatorStatus indexed newStatus
  );
  event OperatorCommissionChanged(
    address indexed operator,
    uint256 indexed commission
  );
  event OperatorClaimAddressChanged(
    address indexed operator,
    address indexed claimAddress
  );
}

interface INodeOperator is INodeOperatorBase {
  // =============================================================
  //                           Registration
  // =============================================================
  /*
   * @notice  Registers an operator.
   */
  function registerOperator(address claimer) external;

  /*
   * @notice  Returns whether an operator is registered.
   * @param   operator Address of the operator.
   */
  function isOperator(address operator) external view returns (bool);

  /*
   * @notice  Returns the status of an operator.
   * @param   operator Address of the operator.
   * @return  The status of the operator.
   */
  function getOperatorStatus(
    address operator
  ) external view returns (NodeOperatorStatus);

  /*
   * @notice  Sets the status of an operator.
   * @param   operator Address of the operator.
   */
  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external;

  // =============================================================
  //                           Operator Information
  // =============================================================
  function setClaimAddressForOperator(
    address claimer,
    address operator
  ) external;

  function getClaimAddressForOperator(
    address operator
  ) external view returns (address);

  // =============================================================
  //                           Commission
  // =============================================================
  /*
   * @notice  Sets the commission rate of an operator.
   * @param   operator Address of the operator.
   * @param   commission The new commission rate.
   */
  function setCommissionRate(uint256 commission) external;

  /*
   * @notice  Returns the commission rate of an operator.
   * @param   operator Address of the operator.
   * @return  The commission rate of the operator.
   */
  function getCommissionRate(address operator) external view returns (uint256);
}
