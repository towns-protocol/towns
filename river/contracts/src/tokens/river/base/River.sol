// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IOptimismMintableERC20, ILegacyMintableERC20} from "contracts/src/tokens/river/base/IOptimismMintableERC20.sol";
import {ISemver} from "contracts/src/tokens/river/base/ISemver.sol";
import {ILock} from "contracts/src/tokens/lock/ILock.sol";

// libraries
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

// contracts
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {IntrospectionFacet} from "@river-build/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";

contract River is
  IOptimismMintableERC20,
  ILegacyMintableERC20,
  ISemver,
  Ownable,
  ERC20Permit,
  ERC20Votes,
  VotesEnumerable,
  LockFacet,
  IntrospectionFacet
{
  // =============================================================
  //                           Errors
  // =============================================================
  error River__TransferLockEnabled();
  error River__DelegateeSameAsCurrent();

  // =============================================================
  //                           Events
  // =============================================================
  event TokenThresholdSet(uint256 threshold);

  // =============================================================
  //                           Constants
  // =============================================================

  /// @notice Semantic version.
  string public constant version = "1.3.0";

  ///@notice Address of the corresponding version of this token on the remote chain
  address public immutable REMOTE_TOKEN;

  /// @notice Address of the StandardBridge on this network.
  address public immutable BRIDGE;

  // =============================================================
  //                           Modifiers
  // =============================================================

  /// @notice A modifier that only allows the bridge to call
  modifier onlyBridge() {
    require(msg.sender == BRIDGE, "River: only bridge can mint and burn");
    _;
  }

  constructor(
    address _bridge,
    address _remoteToken
  ) ERC20Permit("River") ERC20("River", "RVR") Ownable(msg.sender) {
    __IntrospectionBase_init();
    __LockBase_init(30 days);

    // add interface
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);
    _addInterface(type(IERC5267).interfaceId);
    _addInterface(type(IERC6372).interfaceId);
    _addInterface(type(IVotes).interfaceId);
    _addInterface(type(IOptimismMintableERC20).interfaceId);
    _addInterface(type(ILegacyMintableERC20).interfaceId);
    _addInterface(type(ISemver).interfaceId);
    _addInterface(type(ILock).interfaceId);

    // set the bridge
    BRIDGE = _bridge;

    // set the remote token
    REMOTE_TOKEN = _remoteToken;
  }

  // =============================================================
  //                           Bridging
  // =============================================================

  /// @custom:legacy
  /// @notice Legacy getter for the remote token. Use REMOTE_TOKEN going forward.
  function l1Token() external view returns (address) {
    return REMOTE_TOKEN;
  }

  /// @custom:legacy
  /// @notice Legacy getter for the bridge. Use BRIDGE going forward.
  function l2Bridge() external view returns (address) {
    return BRIDGE;
  }

  /// @custom:legacy
  /// @notice Legacy getter for REMOTE_TOKEN
  function remoteToken() external view returns (address) {
    return REMOTE_TOKEN;
  }

  /// @custom:legacy
  /// @notice Legacy getter for BRIDGE.
  function bridge() external view returns (address) {
    return BRIDGE;
  }

  // =============================================================
  //                          Minting
  // =============================================================

  function mint(
    address from,
    uint256 amount
  ) external override(IOptimismMintableERC20, ILegacyMintableERC20) onlyBridge {
    _mint(from, amount);
  }

  function burn(
    address from,
    uint256 amount
  ) external override(IOptimismMintableERC20, ILegacyMintableERC20) onlyBridge {
    _burn(from, amount);
  }

  // =============================================================
  //                           Votes
  // =============================================================

  /// @notice Clock used for flagging checkpoints, overridden to implement timestamp based
  /// checkpoints (and voting).
  function clock() public view override returns (uint48) {
    return uint48(block.timestamp);
  }

  /// @notice Machine-readable description of the clock as specified in EIP-6372.
  function CLOCK_MODE() public pure override returns (string memory) {
    return "mode=timestamp";
  }

  function nonces(
    address owner
  ) public view override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
  }

  // =============================================================
  //                           Locking
  // =============================================================

  /// @inheritdoc ILock
  function enableLock(address account) external override onlyOwner {}

  /// @inheritdoc ILock
  function disableLock(address account) external override onlyOwner {}

  /// @inheritdoc ILock
  function setLockCooldown(uint256 cooldown) external override onlyOwner {
    _setDefaultCooldown(cooldown);
  }

  // =============================================================
  //                           Hooks
  // =============================================================

  function _update(
    address from,
    address to,
    uint256 value
  ) internal override(ERC20, ERC20Votes) {
    if (from != address(0) && _lockEnabled(from)) {
      // allow transferring at minting time
      revert River__TransferLockEnabled();
    }

    super._update(from, to, value);
  }

  /// @dev Hook that gets called before any external enable and disable lock function
  function _canLock() internal view override returns (bool) {
    return msg.sender == owner();
  }

  function _delegate(address account, address delegatee) internal override {
    address currentDelegatee = delegates(account);

    // revert if the delegatee is the same as the current delegatee
    if (currentDelegatee == delegatee) revert River__DelegateeSameAsCurrent();

    // if the delegatee is the zero address, initialize disable lock
    if (delegatee == address(0)) {
      _disableLock(account);
    } else {
      _enableLock(account);
    }

    super._delegate(account, delegatee);

    _setDelegators(account, delegatee, currentDelegatee);
  }
}
