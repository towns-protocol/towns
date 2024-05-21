// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRiver} from "./IRiver.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ILock} from "contracts/src/tokens/lock/ILock.sol";

// libraries
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

// contracts

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";

contract River is
  IRiver,
  Ownable,
  ERC20Permit,
  ERC20Votes,
  VotesEnumerable,
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

  constructor(
    RiverConfig memory config
  ) ERC20Permit("River") Ownable(config.owner) ERC20("River", "RVR") {
    __IntrospectionBase_init();
    __LockBase_init(0 days);

    // add interface
    _addInterface(type(IRiver).interfaceId);
    _addInterface(type(IERC5805).interfaceId);
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);
    _addInterface(type(ILock).interfaceId);

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
  function _update(
    address from,
    address to,
    uint256 value
  ) internal virtual override(ERC20, ERC20Votes) {
    if (from != address(0) && _lockEnabled(from)) {
      // allow transfering at minting time
      revert River__TransferLockEnabled();
    }
    super._update(from, to, value);
  }

  /// @dev Hook that gets called before any external enable and disable lock function
  function _canLock() internal view override returns (bool) {
    return msg.sender == owner();
  }

  function _delegate(
    address account,
    address delegatee
  ) internal virtual override {
    // revert if the delegatee is the same as the current delegatee
    if (delegates(account) == delegatee) revert River__DelegateeSameAsCurrent();

    // if the delegatee is the zero address, initialize disable lock
    if (delegatee == address(0)) {
      _disableLock(account);
    } else {
      if (!_lockEnabled(account)) _enableLock(account);
    }
    address currentDelegatee = delegates(account);
    super._delegate(account, delegatee);

    _setDelegators(account, delegatee, currentDelegatee);
  }

  // =============================================================
  //                           Override
  // =============================================================

  /// @dev Do not allow enabling lock without delegating
  function enableLock(address account) external override onlyAllowed {}

  /// @dev Do not allow disabling lock without delegating
  function disableLock(address account) external override onlyAllowed {}

  /// @notice Clock used for flagging checkpoints, overriden to implement timestamp based
  /// checkpoints (and voting).
  function clock() public view override returns (uint48) {
    return uint48(block.timestamp);
  }

  /// @notice Machine-readable description of the clock as specified in EIP-6372.
  function CLOCK_MODE() public pure override returns (string memory) {
    return "mode=timestamp";
  }

  /// @notice Returns the current nonce for `owner`. This value must be
  /// included whenever a signature is generated for {permit}.
  /// @param owner The account to query the nonce for.
  function nonces(
    address owner
  ) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
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
