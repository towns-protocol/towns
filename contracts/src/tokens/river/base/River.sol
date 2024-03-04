// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IOptimismMintableERC20, ILegacyMintableERC20} from "contracts/src/tokens/river/base/IOptimismMintableERC20.sol";
import {ISemver} from "contracts/src/tokens/river/base/ISemver.sol";

// libraries

// contracts
import {ERC20} from "contracts/src/diamond/facets/token/ERC20/ERC20.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {LockFacet} from "contracts/src/tokens/lock/LockFacet.sol";

contract River is
  IOptimismMintableERC20,
  ILegacyMintableERC20,
  ISemver,
  ERC20,
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

  constructor(address _bridge, address _remoteToken) {
    __IntrospectionBase_init();
    __LockFacet_init_unchained(60 days);
    __ERC20_init_unchained("River", "RVR", 18);

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
  //                           Hooks
  // =============================================================
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    if (msg.sender != BRIDGE && from != address(0) && _lockEnabled(from)) {
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
  function _canLock() internal pure override returns (bool) {
    return false;
  }

  function _beforeDelegate(
    address account,
    address delegatee
  ) internal virtual override {
    if (_delegates(account) == delegatee)
      revert River__DelegateeSameAsCurrent();

    if (delegatee == address(0)) {
      _disableLock(account);
    } else {
      if (!_lockEnabled(account)) _enableLock(account);
    }

    super._beforeDelegate(account, delegatee);
  }
}
