// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// libraries

// contracts

interface IRiverBase {
  error River__CannotMint();
  error River__CannotMintZero();
  error River__TransferLockEnabled();
  error River__InvalidDelegatee();
  error River__MintingTooSoon();

  struct RiverConfig {
    ITownArchitect registry;
    address team;
    address association;
    address dao;
  }
}

interface IRiver is IRiverBase {
  function createInflation(address to) external;
}
