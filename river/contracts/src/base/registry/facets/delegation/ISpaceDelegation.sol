// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISpaceDelegation {
  event SpaceDelegatedToOperator(
    address indexed space,
    address indexed operator
  );
  event RiverTokenChanged(address indexed riverToken);
  event StakeRequirementChanged(uint256 stakeRequirement);
  event MainnetDelegationChanged(address indexed mainnetDelegation);
}
