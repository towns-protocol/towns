// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IFeatureFacetBase {
  error InvalidThreshold();
  error InvalidTotalSupply();
  error ConditionNotActive();
}

interface IFeatureFacet is IFeatureFacetBase {}
