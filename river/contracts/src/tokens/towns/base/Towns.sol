// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IOptimismMintableERC20, ILegacyMintableERC20} from "contracts/src/tokens/river/base/IOptimismMintableERC20.sol";
import {ISemver} from "contracts/src/tokens/river/base/ISemver.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// libraries

// contracts
import {Initializable} from "solady/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";
import {IntrospectionBase} from "@river-build/diamond/src/facets/introspection/IntrospectionBase.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ERC20Votes} from "solady/tokens/ERC20Votes.sol";
import {LockBase} from "contracts/src/tokens/lock/LockBase.sol";

contract Towns is
  IOptimismMintableERC20,
  ILegacyMintableERC20,
  ISemver,
  IntrospectionBase,
  LockBase,
  Initializable,
  ERC20Votes,
  UUPSUpgradeable,
  Ownable
{
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          Errors                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  error Towns__DelegateeSameAsCurrent();
  error Towns__TransferLockEnabled();

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                  Constants & Immutables                    */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  /// @notice Semantic version.
  string public constant version = "1.3.0";

  /// @notice The name of the token
  string internal constant NAME = "Towns";

  /// @notice The symbol of the token
  string internal constant SYMBOL = "TOWNS";

  /// @notice The name hash of the token
  bytes32 internal constant NAME_HASH = keccak256(bytes(NAME));

  ///@notice Address of the corresponding version of this token on the remote chain
  address public immutable REMOTE_TOKEN;

  /// @notice Address of the StandardBridge on this network.
  address public immutable BRIDGE;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Modifiers                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice A modifier that only allows the bridge to call
  modifier onlyBridge() {
    require(msg.sender == BRIDGE, "Towns: only bridge can mint and burn");
    _;
  }

  constructor(address _bridge, address _remoteToken) {
    // set the bridge
    BRIDGE = _bridge;

    // set the remote token
    REMOTE_TOKEN = _remoteToken;

    _disableInitializers();
  }

  function initialize(address _owner) external initializer {
    // set the owner
    _initializeOwner(_owner);

    // initialize the lock
    __LockBase_init(30 days);

    // add interface
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);
    _addInterface(type(IERC6372).interfaceId);
    _addInterface(type(IERC165).interfaceId);
    _addInterface(type(IVotes).interfaceId);
    _addInterface(type(IOptimismMintableERC20).interfaceId);
    _addInterface(type(ILegacyMintableERC20).interfaceId);
    _addInterface(type(ISemver).interfaceId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Bridge                              */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Introspection                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return _supportsInterface(interfaceId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Lock                               */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function isLockEnabled(address account) external view virtual returns (bool) {
    return _lockEnabled(account);
  }

  function lockCooldown(
    address account
  ) external view virtual returns (uint256) {
    return _lockCooldown(account);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Overrides                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function name() public pure override returns (string memory) {
    return NAME;
  }

  function symbol() public pure override returns (string memory) {
    return SYMBOL;
  }

  /// @notice Allows the StandardBridge on this network to mint tokens.
  /// @param to     Address to mint tokens to.
  /// @param amount Amount of tokens to mint.
  function mint(
    address to,
    uint256 amount
  ) external override(IOptimismMintableERC20, ILegacyMintableERC20) onlyBridge {
    _mint(to, amount);
  }

  /// @notice Allows the StandardBridge on this network to burn tokens.
  /// @param from     Address to burn tokens from.
  /// @param amount Amount of tokens to burn.
  function burn(
    address from,
    uint256 amount
  ) external override(IOptimismMintableERC20, ILegacyMintableERC20) onlyBridge {
    _burn(from, amount);
  }

  /// @notice Clock used for flagging checkpoints, overridden to implement timestamp based
  /// checkpoints (and voting).
  function clock() public view override returns (uint48) {
    return uint48(block.timestamp);
  }

  /// @notice Machine-readable description of the clock as specified in EIP-6372.
  function CLOCK_MODE() public pure override returns (string memory) {
    return "mode=timestamp";
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Internal Overrides                     */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    if (from != address(0) && _lockEnabled(from)) {
      // allow transferring at minting time
      CustomRevert.revertWith(Towns__TransferLockEnabled.selector);
    }

    super._beforeTokenTransfer(from, to, amount);
  }

  function _delegate(address account, address delegatee) internal override {
    address currentDelegatee = delegates(account);

    // revert if the delegatee is the same as the current delegatee
    if (currentDelegatee == delegatee)
      CustomRevert.revertWith(Towns__DelegateeSameAsCurrent.selector);

    // if the delegatee is the zero address, initialize disable lock
    if (delegatee == address(0)) {
      _disableLock(account);
    } else {
      _enableLock(account);
    }

    super._delegate(account, delegatee);
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}

  /// @dev Override the name hash to be a constant value for performance in EIP-712
  function _constantNameHash() internal pure override returns (bytes32) {
    return NAME_HASH;
  }

  /// @dev This allows Permit2 to be used without prior approval.
  function _givePermit2InfiniteAllowance()
    internal
    pure
    override
    returns (bool)
  {
    return true;
  }

  function _canLock() internal pure override returns (bool) {
    return false;
  }
}
