// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiver} from "contracts/src/tokens/IRiver.sol";
import {IVotes} from "contracts/src/diamond/facets/governance/votes/IVotes.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

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
  /// @dev registry of spaces
  ITownArchitect public registry;

  /// @dev initial supply is 10 billion tokens
  uint256 internal constant INITIAL_SUPPLY = 10_000_000_000 ether;
  uint256 internal constant TEAM_SUPPLY = (INITIAL_SUPPLY / 100) * 40;
  uint256 internal constant ASSOC_SUPPLY = (INITIAL_SUPPLY / 100) * 60;

  /// @dev deployment time
  uint256 public immutable deployedAt = block.timestamp;

  /// @dev last mint time
  uint256 public lastMintTime;

  constructor(RiverConfig memory config) {
    __IntrospectionBase_init();
    __LockFacet_init_unchained(60 days);
    __ERC20_init_unchained("River", "RVR", 18);

    // set the registry
    registry = config.registry;

    // mint to team
    _mint(config.team, TEAM_SUPPLY);

    // mint to association
    _mint(config.association, ASSOC_SUPPLY);

    // set last mint time
    lastMintTime = block.timestamp;

    // make sure it was minted correctly
    require(totalSupply() == INITIAL_SUPPLY, "River: incorrect supply");

    // transfer ownership to the DAO
    _transferOwnership(config.dao);
  }

  // =============================================================
  //                          Minting
  // =============================================================
  function createInflation(address to) external onlyOwner {
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
  //                           Delegation
  // =============================================================

  /// @inheritdoc IVotes
  function delegate(address delegatee) public override nonReentrant {
    super.delegate(delegatee);
  }

  /// @inheritdoc IVotes
  function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override nonReentrant {
    super.delegateBySig(delegatee, nonce, expiry, v, r, s);
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

  function _canLock() internal view override returns (bool) {
    return msg.sender == _owner();
  }

  function _beforeDelegate(
    address account,
    address delegatee
  ) internal virtual override {
    _validateDelegatee(delegatee);
    if (!_lockEnabled(account)) _enableLock(account);
    if (delegatee == address(0)) _disableLock(account);
    super._beforeDelegate(account, delegatee);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _validateDelegatee(address delegatee) internal view {
    if (delegatee == address(0)) return;
    if (!registry.isTown(delegatee)) revert River__InvalidDelegatee();
  }

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
