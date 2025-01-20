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
  /// @param quantity The quantity to delegate
  /// @param delegator The delegator address
  /// @param delegationTime The delegation time
  struct Delegation {
    address operator;
    uint256 quantity;
    address delegator;
    uint256 delegationTime;
  }

  /// @notice Delegation message from L1
  /// @param delegator The delegator address
  /// @param delegatee The delegatee address
  /// @param quantity The quantity to delegate
  /// @param claimer The claimer address
  struct DelegationMsg {
    address delegator;
    address delegatee;
    uint256 quantity;
    address claimer;
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

  event ClaimerSet(address indexed delegator, address indexed claimer);

  event DelegationDigestSet(bytes32 digest);

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
  /// @notice Set delegation digest from L1
  /// @dev Only the L2 messenger can call this function
  /// @param digest The delegation digest
  function setDelegationDigest(bytes32 digest) external;

  /// @notice Relay cross-chain delegations
  /// @dev Only the owner can call this function
  /// @param encodedMsgs The encoded delegation messages
  function relayDelegations(bytes calldata encodedMsgs) external;

  /// @notice Get delegation of a delegator
  /// @param delegator The delegator address
  /// @return Delegation delegation struct
  function getDelegationByDelegator(
    address delegator
  ) external view returns (Delegation memory);

  /// @notice Get delegation of a operator
  /// @param operator The operator address
  /// @return Delegation delegation struct
  function getMainnetDelegationsByOperator(
    address operator
  ) external view returns (Delegation[] memory);

  /// @notice Get delegated stake of a operator
  /// @param operator The operator address
  /// @return uint256 The delegated stake
  function getDelegatedStakeByOperator(
    address operator
  ) external view returns (uint256);

  /// @notice Get authorized claimer
  /// @param owner The owner address
  /// @return address The claimer address
  function getAuthorizedClaimer(address owner) external view returns (address);

  /// @notice Set proxy delegation
  /// @param proxyDelegation The proxy delegation address
  function setProxyDelegation(address proxyDelegation) external;

  /// @notice Get proxy delegation
  /// @return address The proxy delegation address
  function getProxyDelegation() external view returns (address);

  /// @notice Get the L2 messenger address
  /// @return address The L2 messenger address
  function getMessenger() external view returns (address);

  /// @notice Get the deposit ID by delegator
  /// @param delegator The mainnet delegator address
  /// @return uint256 The deposit ID
  function getDepositIdByDelegator(
    address delegator
  ) external view returns (uint256);
}
