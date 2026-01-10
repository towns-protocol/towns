// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {IERC7802} from "src/tokens/towns/base/IERC7802.sol";
import {ILegacyMintableERC20, IOptimismMintableERC20} from "src/tokens/towns/base/IOptimismMintableERC20.sol";
import {ISemver} from "src/tokens/towns/base/ISemver.sol";

// libraries

import {TownsLib} from "./TownsLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {IntrospectionBase} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionBase.sol";

import {LockBase} from "src/tokens/lock/LockBase.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ERC20Votes} from "solady/tokens/ERC20Votes.sol";
import {Initializable} from "solady/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";

contract Towns is
    IOptimismMintableERC20,
    IERC7802,
    ISemver,
    IntrospectionBase,
    LockBase,
    Initializable,
    ERC20Votes,
    UUPSUpgradeable,
    Ownable
{
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  Constants & Immutables                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice The name of the token
    string internal constant NAME = "Towns";

    /// @notice The symbol of the token
    string internal constant SYMBOL = "TOWNS";

    /// @notice The name hash of the token
    bytes32 internal constant NAME_HASH = keccak256(bytes(NAME));

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Errors                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error DelegateeSameAsCurrent();
    error TransferLockEnabled();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Modifiers                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice A modifier that only allows the bridge to call
    modifier onlyL2StandardBridge() {
        if (msg.sender != TownsLib.L2_STANDARD_BRIDGE) {
            CustomRevert.revertWith(Unauthorized.selector);
        }
        _;
    }

    /// @notice A modifier that only allows the super chain to call
    modifier onlyL2SuperChainBridge() {
        if (msg.sender != TownsLib.SUPERCHAIN_TOKEN_BRIDGE) {
            CustomRevert.revertWith(Unauthorized.selector);
        }
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Initialization                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    constructor() {
        _disableInitializers();
    }

    function initialize(address _remoteToken, address _owner) external initializer {
        // set the owner
        _initializeOwner(_owner);

        // set the remote token
        TownsLib.initializeRemoteToken(_remoteToken);

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
        _addInterface(type(IERC7802).interfaceId);
    }

    /// @notice Semantic version
    /// @custom:semver 1.0.0-beta.12
    function version() external view virtual returns (string memory) {
        return "1.0.0-beta.12";
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Bridge                              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @custom:legacy
    /// @notice Legacy getter for the remote token. Use REMOTE_TOKEN going forward.
    function l1Token() external view returns (address) {
        return TownsLib.layout().remoteToken;
    }

    /// @custom:legacy
    /// @notice Legacy getter for the bridge. Use BRIDGE going forward.
    function l2Bridge() external pure returns (address) {
        return TownsLib.L2_STANDARD_BRIDGE;
    }

    /// @custom:legacy
    /// @notice Legacy getter for REMOTE_TOKEN
    function remoteToken() external view returns (address) {
        return TownsLib.layout().remoteToken;
    }

    /// @custom:legacy
    /// @notice Legacy getter for L2_STANDARD_BRIDGE.
    function bridge() external pure returns (address) {
        return TownsLib.L2_STANDARD_BRIDGE;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Super Chain                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Allows the SuperchainTokenBridge to mint tokens.
    /// @param _to     Address to mint tokens to.
    /// @param _amount Amount of tokens to mint.
    function crosschainMint(address _to, uint256 _amount) external onlyL2SuperChainBridge {
        _mint(_to, _amount);
        emit CrosschainMint(_to, _amount, msg.sender);
    }

    /// @notice Allows the SuperchainTokenBridge to burn tokens.
    /// @param _from   Address to burn tokens from.
    /// @param _amount Amount of tokens to burn.
    function crosschainBurn(address _from, uint256 _amount) external onlyL2SuperChainBridge {
        _burn(_from, _amount);
        emit CrosschainBurn(_from, _amount, msg.sender);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Introspection                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return _supportsInterface(interfaceId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Lock                               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function isLockActive(address account) external view virtual returns (bool) {
        return _isLockActive(account);
    }

    function lockExpiration(address account) external view virtual returns (uint256) {
        return _lockExpiration(account);
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

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Allows the StandardBridge on this network to mint tokens.
    /// @param to     Address to mint tokens to.
    /// @param amount Amount of tokens to mint.
    function mint(
        address to,
        uint256 amount
    ) external override(IOptimismMintableERC20) onlyL2StandardBridge {
        _mint(to, amount);
    }

    /// @notice Allows the StandardBridge on this network to burn tokens.
    /// @param from     Address to burn tokens from.
    /// @param amount Amount of tokens to burn.
    function burn(
        address from,
        uint256 amount
    ) external override(IOptimismMintableERC20) onlyL2StandardBridge {
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

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        if (from != address(0) && _isLockActive(from)) {
            // allow transferring at minting time
            CustomRevert.revertWith(TransferLockEnabled.selector);
        }

        super._beforeTokenTransfer(from, to, amount);
    }

    function _delegate(address account, address delegatee) internal override {
        address currentDelegatee = delegates(account);

        // revert if the delegatee is the same as the current delegatee
        if (currentDelegatee == delegatee) {
            CustomRevert.revertWith(DelegateeSameAsCurrent.selector);
        }

        // if the delegatee is the zero address, initialize disable lock
        if (delegatee == address(0)) {
            _disableLock(account);
        } else {
            _enableLock(account);
        }

        super._delegate(account, delegatee);
    }

    /// @dev Override the name hash to be a constant value for performance in EIP-712
    function _constantNameHash() internal pure override returns (bytes32) {
        return NAME_HASH;
    }

    /// @dev This allows Permit2 to be used without prior approval.
    function _givePermit2InfiniteAllowance() internal pure override returns (bool) {
        return true;
    }

    /// @dev Override the default lock check to disable it.
    function _canLock() internal pure override returns (bool) {
        return false;
    }

    /// @notice Override the default upgrade check to only allow the owner.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
