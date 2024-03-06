// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IOptimismMintableERC20, ILegacyMintableERC20} from "contracts/src/tokens/river/base/IOptimismMintableERC20.sol";
import {ISemver} from "contracts/src/tokens/river/base/ISemver.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// libraries
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

// contracts
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Votes} from "@openzeppelin/contracts/governance/utils/Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";

contract River is
  IOptimismMintableERC20,
  ILegacyMintableERC20,
  ISemver,
  Ownable,
  ERC20Permit,
  Votes,
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
  ) ERC20Permit("River") Ownable(msg.sender) ERC20("River", "RVR") {
    __IntrospectionBase_init();
    __LockFacet_init_unchained(30 days);

    // add interface
    _addInterface(type(IERC5805).interfaceId);
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);

    // set the bridge
    BRIDGE = _bridge;

    // set the remote token
    REMOTE_TOKEN = _remoteToken;

    // interfaces
    _addInterface(type(IOptimismMintableERC20).interfaceId);
    _addInterface(type(ILegacyMintableERC20).interfaceId);
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
  //                           Overrides
  // =============================================================
  function nonces(
    address owner
  ) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
  }

  // =============================================================
  //                           Hooks
  // =============================================================
  function _update(
    address from,
    address to,
    uint256 value
  ) internal virtual override {
    if (from != address(0) && _lockEnabled(from)) {
      // allow transfering at minting time
      revert River__TransferLockEnabled();
    }

    super._update(from, to, value);

    _transferVotingUnits(from, to, value);
  }

  function _getVotingUnits(
    address account
  ) internal view override returns (uint256) {
    return balanceOf(account);
  }

  /// @dev Hook that gets called before any external enable and disable lock function
  function _canLock() internal pure override returns (bool) {
    return false;
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

    super._delegate(account, delegatee);

    _setDelegators(account, delegatee);
  }
}
