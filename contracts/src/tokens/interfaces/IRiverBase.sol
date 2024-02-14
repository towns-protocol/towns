// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IRiverBase {
  error River__CannotMint();
  error River__CannotMintZero();
  error River__TransferLockEnabled();
  error River__InvalidDelegatee();
  error River__MintingTooSoon();
  error River__InvalidAddress();
  error River__DelegateeSameAsCurrent();
}
