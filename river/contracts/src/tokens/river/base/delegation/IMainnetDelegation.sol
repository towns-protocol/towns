// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IMainnetDelegationBase {
  // =============================================================
  //                           Structs
  // =============================================================

  /// @notice Delegation struct
  /// @param operator The operator address
  /// @param quantity The quantity delegated
  struct Delegation {
    address operator;
    uint256 quantity;
    address delegator;
    uint256 delegationTime;
  }

  // =============================================================
  //                           Events
  // =============================================================
  event DelegationSet(
    address indexed delegator,
    address indexed operator,
    uint256 quantity
  );

  event DelegationRemoved(address indexed delegator);

  // =============================================================
  //                           Errors
  // =============================================================
  error InvalidDelegator(address delegator);
  error InvalidOperator(address operator);
  error InvalidQuantity(uint256 quantity);
  error DelegationAlreadySet(address delegator, address operator);
  error DelegationNotSet();
  error InvalidClaimer(address claimer);
  error InvalidOwner(address owner);
}

interface IMainnetDelegation is IMainnetDelegationBase {
  /**
   * @notice Set batch cross-chain delegation
   * @param delegators The delegator address
   * @param delegates The address the delegator is delegating to
   * @param claimers The address the delegator is allowing to claim
   * @param quantities The quantity to delegate
   */
  function setBatchDelegation(
    address[] calldata delegators,
    address[] calldata delegates,
    address[] calldata claimers,
    uint256[] calldata quantities
  ) external;

  /**
   * @notice Set batch authorized claimers
   * @param delegators The delegator address
   * @param claimers The address the delegator is allowing to claim
   */
  function setBatchAuthorizedClaimers(
    address[] calldata delegators,
    address[] calldata claimers
  ) external;

  /**
   * @notice Set delegation of a delegator to a operator
   * @param delegator The delegator address
   * @param operator The operator address to delegate to
   * @param quantity The quantity to delegate
   */
  function setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) external;

  /**
   * @notice Get delegation of a delegator
   * @param delegator The delegator address
   * @return Delegation delegation struct
   */
  function getDelegationByDelegator(
    address delegator
  ) external view returns (Delegation memory);

  /**
   * @notice Get delegation of a operator
   * @param operator The operator address
   * @return Delegation delegation struct
   */
  function getMainnetDelegationsByOperator(
    address operator
  ) external view returns (Delegation[] memory);

  /**
   * @notice Get delegated stake of a operator
   * @param operator The operator address
   * @return uint256 The delegated stake
   */
  function getDelegatedStakeByOperator(
    address operator
  ) external view returns (uint256);

  /**
   * @notice Set authorized claimer
   * @param owner The owner address
   * @param claimer The claimer address
   */
  function setAuthorizedClaimer(address owner, address claimer) external;

  /**
   * @notice Get authorized claimer
   * @param owner The owner address
   */
  function getAuthorizedClaimer(address owner) external view returns (address);

  function setProxyDelegation(address proxyDelegation) external;
}
