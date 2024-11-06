// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

/// @title DelegationProxy
/// @notice A contract that holds the stake token and delegates it to a given address
contract DelegationProxy is Initializable {
  address public factory;
  address public stakeToken;

  constructor() payable {
    _disableInitializers();
  }

  modifier onlyFactory() {
    require(msg.sender == factory);
    _;
  }

  /// @notice Initializes the contract with the stake token, delegates it to the given address
  /// and approves the factory to withdraw the stake token
  /// @dev Must be called by the factory upon deployment
  /// @param stakeToken_ The address of the stake token
  /// @param delegatee The address to delegate the stake token to
  function initialize(
    address stakeToken_,
    address delegatee
  ) external payable initializer {
    factory = msg.sender;
    stakeToken = stakeToken_;
    ERC20Votes(stakeToken_).delegate(delegatee);
    ERC20Votes(stakeToken_).approve(msg.sender, type(uint256).max);
  }

  /// @notice Delegates the stake token to the given address
  /// @dev Must be called by the factory
  /// @param delegatee The address to delegate the stake token to
  function redelegate(address delegatee) external payable onlyFactory {
    ERC20Votes(stakeToken).delegate(delegatee);
  }
}
