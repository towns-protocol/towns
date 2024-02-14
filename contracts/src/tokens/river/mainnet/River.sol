// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiver} from "./IRiver.sol";

// libraries

// contracts

import {ERC20} from "contracts/src/diamond/facets/token/ERC20/ERC20.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {Votes} from "contracts/src/diamond/facets/governance/votes/Votes.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";

contract River is
  IRiver,
  ERC20,
  Votes,
  OwnableFacet,
  LockFacet,
  ReentrancyGuard,
  IntrospectionFacet
{
  /// @dev initial supply is 10 billion tokens
  uint256 internal constant INITIAL_SUPPLY = 10_000_000_000 ether;

  /// @dev deployment time
  uint256 public immutable deployedAt = block.timestamp;

  /// @dev last mint time
  uint256 public lastMintTime;

  constructor(address vault, address owner) {
    __IntrospectionBase_init();
    __LockFacet_init_unchained(60 days);
    __ERC20_init_unchained("River", "RVR", 18);

    // mint to vault
    _mint(vault, INITIAL_SUPPLY);

    // set last mint time for inflation
    lastMintTime = block.timestamp;

    // transfer ownership to the association
    _transferOwnership(owner);
  }

  // =============================================================
  //                          Minting
  // =============================================================
  function createInflation(address to) external onlyOwner {
    if (to == address(0)) revert River__InvalidAddress();

    // verify that minting can only happen once per year
    uint256 timeSinceLastMint = block.timestamp - lastMintTime;

    if (timeSinceLastMint < 365 days) revert River__MintingTooSoon();

    // calculate the amount to mint
    uint256 inflationRate = _getCurrentInflationRate();
    uint256 inflationAmount = (totalSupply() * inflationRate) / 100;

    _mint(to, inflationAmount);

    // update last mint time
    lastMintTime = block.timestamp;
  }

  // =============================================================
  //                           Hooks
  // =============================================================
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    if (from != address(0) && _lockEnabled(from)) {
      // allow transfering at minting time
      revert River__TransferLockEnabled();
    }
    super._beforeTokenTransfer(from, to, amount);
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    _transferVotingUnits(from, to, amount);
    super._afterTokenTransfer(from, to, amount);
  }

  function _getVotingUnits(
    address account
  ) internal view override returns (uint256) {
    return _balanceOf(account);
  }

  /// @dev Hook that gets called before any external enable and disable lock function
  function _canLock() internal view override returns (bool) {
    return msg.sender == _owner();
  }

  /// @dev Hook that gets called before any external delegate functions
  function _beforeDelegate(
    address account,
    address delegatee
  ) internal virtual override {
    // revert if the delegatee is the same as the current delegatee
    if (_delegates(account) == delegatee)
      revert River__DelegateeSameAsCurrent();

    // if the delegatee is the zero address, initialize disable lock
    if (delegatee == address(0)) {
      _disableLock(account);
    } else {
      if (!_lockEnabled(account)) _enableLock(account);
    }

    super._beforeDelegate(account, delegatee);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Returns the current inflation rate.
   * @return inflation rate in percentage points (0-100)
   */
  function _getCurrentInflationRate() internal view returns (uint256) {
    uint256 yearsSinceDeployment = (block.timestamp - deployedAt) / 365 days;
    if (yearsSinceDeployment >= 20) return 2; // 2% final inflation rate
    return 8 - ((yearsSinceDeployment * 6) / 20); // linear decrease from 8% to 2% over 20 years
  }
}
