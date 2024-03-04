// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiver} from "./IRiver.sol";

// libraries

// contracts

import {ERC20} from "contracts/src/diamond/facets/token/ERC20/ERC20.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";

contract River is
  IRiver,
  ERC20,
  VotesEnumerable,
  OwnableFacet,
  LockFacet,
  IntrospectionFacet
{
  /// @dev initial supply is 10 billion tokens
  uint256 internal constant INITIAL_SUPPLY = 10_000_000_000 ether;

  /// @dev deployment time
  uint256 public immutable deployedAt = block.timestamp;

  /// @dev initialInflationRate is the initial inflation rate in basis points (0-10000)
  uint256 public immutable initialInflationRate;

  /// @dev finalInflationRate is the final inflation rate in basis points (0-10000)
  uint256 public immutable finalInflationRate;

  /// @dev inflationDecreaseRate is the rate at which the inflation rate decreases in basis points (0-10000)
  uint256 public immutable inflationDecreaseRate;

  /// @dev inflationDecreaseInterval is the interval at which the inflation rate decreases in years
  uint256 public immutable inflationDecreaseInterval;

  /// @dev last mint time
  uint256 public lastMintTime;

  /// @dev inflation rate override
  bool public overrideInflation;
  uint256 public overrideInflationRate;

  constructor(RiverConfig memory config) {
    __IntrospectionBase_init();
    __LockFacet_init_unchained(0 days);
    __ERC20_init_unchained("River", "RVR", 18);

    // add interface
    _addInterface(type(IRiver).interfaceId);

    // mint to vault
    _mint(config.vault, INITIAL_SUPPLY);

    // set last mint time for inflation
    lastMintTime = block.timestamp;

    // set inflation values
    initialInflationRate = config.inflationConfig.initialInflationRate;
    finalInflationRate = config.inflationConfig.finalInflationRate;
    inflationDecreaseRate = config.inflationConfig.inflationDecreaseRate;
    inflationDecreaseInterval = config
      .inflationConfig
      .inflationDecreaseInterval;

    // transfer ownership to the association
    _transferOwnership(config.owner);
  }

  // =============================================================
  //                          Inflation
  // =============================================================

  /// @inheritdoc IRiver
  function createInflation(address to) external onlyOwner {
    if (to == address(0)) revert River__InvalidAddress();

    // verify that minting can only happen once per year
    uint256 timeSinceLastMint = block.timestamp - lastMintTime;

    if (timeSinceLastMint < 365 days) revert River__MintingTooSoon();

    // calculate the amount to mint
    uint256 inflationRateBPS = _getCurrentInflationRateBPS();
    uint256 inflationAmount = (totalSupply() * inflationRateBPS) / 10000;

    _mint(to, inflationAmount);

    // update last mint time
    lastMintTime = block.timestamp;
  }

  /// @inheritdoc IRiver
  function setOverrideInflation(
    bool _overrideInflation,
    uint256 _overrideInflationRate
  ) external onlyOwner {
    if (_overrideInflationRate > finalInflationRate)
      revert River__InvalidInflationRate();

    overrideInflation = _overrideInflation;
    overrideInflationRate = _overrideInflationRate;
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
   * @return inflation rate in basis points (0-100)
   */
  function _getCurrentInflationRateBPS() internal view returns (uint256) {
    uint256 yearsSinceDeployment = (block.timestamp - deployedAt) / 365 days;

    if (overrideInflation) return overrideInflationRate; // override inflation rate

    // return final inflation rate if yearsSinceDeployment is greater than or equal to inflationDecreaseInterval
    if (yearsSinceDeployment >= inflationDecreaseInterval)
      return finalInflationRate;

    // linear decrease from initialInflationRate to finalInflationRate over the inflationDecreateInterval
    uint256 decreasePerYear = inflationDecreaseRate / inflationDecreaseInterval;
    return initialInflationRate - (yearsSinceDeployment * decreasePerYear);
  }
}
