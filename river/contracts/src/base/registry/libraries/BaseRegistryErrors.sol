// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library BaseRegistryErrors {
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
}
