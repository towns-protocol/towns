// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IFeatureManagerFacetBase {
  error InvalidThreshold();
  error InvalidTotalSupply();
  error ConditionNotActive();
}

interface IFeatureManagerFacet is IFeatureManagerFacetBase {}
