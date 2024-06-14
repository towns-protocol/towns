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
}

interface ISpaceDelegation is ISpaceDelegationBase {
  function setRiverToken(address riverToken) external;

  function setStakeRequirement(uint256 stakeRequirement_) external;

  function setMainnetDelegation(address mainnetDelegation_) external;

  function getSpaceDelegation(address space) external view returns (address);

  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory);

  function riverToken() external view returns (address);

  function getTotalDelegation(address operator) external view returns (uint256);
}
