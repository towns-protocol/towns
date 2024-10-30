// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISpaceDelegationBase {
  // =============================================================
  //                           Errors
  // =============================================================
  error SpaceDelegation__InvalidAddress();
  error SpaceDelegation__NotTransferable();
  error SpaceDelegation__AlreadyRegistered();
  error SpaceDelegation__StatusNotChanged();
  error SpaceDelegation__InvalidStatusTransition();
  error SpaceDelegation__NotRegistered();
  error SpaceDelegation__InvalidOperator();
  error SpaceDelegation__InvalidSpace();
  error SpaceDelegation__AlreadyDelegated(address operator);
  error SpaceDelegation__NotEnoughStake();
  error SpaceDelegation__InvalidStakeRequirement();

  // =============================================================
  //                           Events
  // =============================================================
  event SpaceDelegatedToOperator(
    address indexed space,
    address indexed operator
  );
  event RiverTokenChanged(address indexed riverToken);
  event StakeRequirementChanged(uint256 stakeRequirement);
  event MainnetDelegationChanged(address indexed mainnetDelegation);
  event SpaceFactoryChanged(address indexed spaceFactory);
}

interface ISpaceDelegation is ISpaceDelegationBase {
  /// @notice Adds a space delegation to an operator
  /// @param space The address of the space
  /// @param operator The address of the operator
  function addSpaceDelegation(address space, address operator) external;

  /// @notice Removes a space delegation from an operator
  /// @param space The address of the space
  function removeSpaceDelegation(address space) external;

  /// @notice Sets the address of the River token
  /// @param riverToken The address of the River token contract
  function setRiverToken(address riverToken) external;

  /// @notice Sets the stake requirement for delegation
  /// @param stakeRequirement_ The new stake requirement amount
  function setStakeRequirement(uint256 stakeRequirement_) external;

  /// @notice Gets the stake requirement for delegation
  /// @return The stake requirement amount
  function stakeRequirement() external view returns (uint256);

  /// @notice Sets the address of the mainnet delegation contract
  /// @param mainnetDelegation_ The address of the mainnet delegation contract
  function setMainnetDelegation(address mainnetDelegation_) external;

  /// @notice Gets the address of the mainnet delegation contract
  /// @return The address of the mainnet delegation contract
  function mainnetDelegation() external view returns (address);

  /// @notice Gets the operator address for a given space
  /// @param space The address of the space
  /// @return The address of the operator delegated to the space
  function getSpaceDelegation(address space) external view returns (address);

  /// @notice Gets all spaces delegated to a specific operator
  /// @param operator The address of the operator
  /// @return An array of space addresses delegated to the operator
  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory);

  /// @notice Gets the address of the River token
  /// @return The address of the River token contract
  function riverToken() external view returns (address);

  /// @notice Gets the total delegation for a specific operator
  /// @param operator The address of the operator
  /// @return The total amount delegated to the operator
  function getTotalDelegation(address operator) external view returns (uint256);

  /// @notice Sets the address of the space factory
  /// @param spaceFactory The address of the space factory
  function setSpaceFactory(address spaceFactory) external;

  /// @notice Gets the address of the space factory
  /// @return The address of the space factory
  function getSpaceFactory() external view returns (address);
}
