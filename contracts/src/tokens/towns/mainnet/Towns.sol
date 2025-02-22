// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITowns} from "./ITowns.sol";
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// libraries
import {OwnableRoles} from "solady/auth/OwnableRoles.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";
import {TokenInflationLib} from "contracts/src/tokens/towns/mainnet/libs/TokenInflationLib.sol";
import {VotesEnumerableLib} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerableLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts
import {IntrospectionBase} from "@river-build/diamond/src/facets/introspection/IntrospectionBase.sol";
import {VotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerable.sol";
import {ERC20Votes} from "solady/tokens/ERC20Votes.sol";

contract Towns is
  OwnableRoles,
  ERC20Votes,
  IntrospectionBase,
  VotesEnumerable,
  ITowns,
  IERC165
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

  /// @dev initial supply is 10 billion tokens
  uint256 internal constant INITIAL_SUPPLY = 10_000_000_000 ether;

  /// @dev the role for the inflation caller
  uint256 public constant ROLE_INFLATION_MANAGER = 1;

  /// @dev the role for the inflation rate manager
  uint256 public constant ROLE_INFLATION_RATE_MANAGER = 2;

  /// @dev the initial mint time
  uint256 public immutable initialMintTime;

  /// @dev whether the initial supply has been minted
  bool internal initialSupplyMinted;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Constructor                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  constructor(address vault, address manager, InflationConfig memory config) {
    if (vault == address(0) || manager == address(0)) {
      CustomRevert.revertWith(InvalidAddress.selector);
    }

    if (config.inflationReceiver == address(0)) {
      CustomRevert.revertWith(InvalidAddress.selector);
    }

    _initializeOwner(vault);

    _grantRoles(vault, ROLE_INFLATION_MANAGER);
    _grantRoles(manager, ROLE_INFLATION_RATE_MANAGER);

    _addInterface(type(ITowns).interfaceId);
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);
    _addInterface(type(IVotesEnumerable).interfaceId);
    _addInterface(type(IERC165).interfaceId);
    _addInterface(type(IVotes).interfaceId);
    _addInterface(type(IERC6372).interfaceId);

    initialMintTime = config.initialMintTime;

    TokenInflationLib.initialize(config);
  }

  /// @notice Mints the initial supply to the given address
  /// @dev Can only be called by the owner
  /// @dev Can only be called once
  function mintInitialSupply(address to) external onlyOwner {
    if (initialSupplyMinted) {
      CustomRevert.revertWith(InitialSupplyAlreadyMinted.selector);
    }

    _mint(to, INITIAL_SUPPLY);
    initialSupplyMinted = true;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Inflation                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice The final inflation rate in basis points (0-10_000)
  function finalInflationRate() external view returns (uint256) {
    return TokenInflationLib.finalInflationRate();
  }

  /// @notice The address that receives the inflation
  function inflationReceiver() external view returns (address) {
    return TokenInflationLib.inflationReceiver();
  }

  /// @notice The last time the inflation was minted
  function lastMintTime() external view returns (uint256) {
    return TokenInflationLib.lastMintTime();
  }

  /// @notice The current inflation rate in basis points (0-10_000)
  function currentInflationRate() external view returns (uint256) {
    return TokenInflationLib.getCurrentInflationRateBPS(initialMintTime);
  }

  /// @inheritdoc ITowns
  function setOverrideInflation(
    bool overrideInflation,
    uint256 overrideInflationRate
  ) external onlyRoles(ROLE_INFLATION_RATE_MANAGER) {
    if (overrideInflationRate > TokenInflationLib.finalInflationRate()) {
      CustomRevert.revertWith(InvalidInflationRate.selector);
    }

    TokenInflationLib.setOverrideInflation(
      overrideInflation,
      overrideInflationRate
    );
  }

  /// @inheritdoc ITowns
  function setInflationReceiver(
    address receiver
  ) external onlyRoles(ROLE_INFLATION_MANAGER) {
    if (receiver == address(0)) {
      CustomRevert.revertWith(InvalidAddress.selector);
    }

    TokenInflationLib.setInflationReceiver(receiver);
  }

  /// @inheritdoc ITowns
  function createInflation() external onlyRoles(ROLE_INFLATION_MANAGER) {
    // verify that minting can only happen once per year
    uint256 timeSinceLastMint = block.timestamp -
      TokenInflationLib.lastMintTime();

    if (timeSinceLastMint < 365 days) {
      CustomRevert.revertWith(MintingTooSoon.selector);
    }

    uint256 inflationRateBPS = TokenInflationLib.getCurrentInflationRateBPS(
      initialMintTime
    );
    uint256 inflationAmount = BasisPoints.calculate(
      totalSupply(),
      inflationRateBPS
    );

    address receiver = TokenInflationLib.inflationReceiver();
    _mint(receiver, inflationAmount);

    TokenInflationLib.updateLastMintTime();
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
  /*                         Overrides                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function name() public pure override returns (string memory) {
    return NAME;
  }

  function symbol() public pure override returns (string memory) {
    return SYMBOL;
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

  /// @dev Override the delegate function to update the delegators and delegation time
  function _delegate(address account, address delegatee) internal override {
    address currentDelegatee = delegates(account);

    super._delegate(account, delegatee);

    VotesEnumerableLib.setDelegators(account, delegatee, currentDelegatee);
  }
}
