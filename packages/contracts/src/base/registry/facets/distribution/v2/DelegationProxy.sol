// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@towns-protocol/diamond/src/facets/initializable/Initializable.sol";

/// @title DelegationProxy
/// @notice A contract that holds the stake token and delegates it to a given address
contract DelegationProxy is Initializable {
    address public factory;
    address public stakeToken;

    modifier onlyFactory() {
        require(msg.sender == factory);
        _;
    }

    constructor() payable {
        _disableInitializers();
    }

    /// @notice Initializes the contract with the stake token, delegates it to the given address
    /// and approves the factory to withdraw the stake token
    /// @dev Must be called by the factory upon deployment
    /// @param stakeToken_ The address of the stake token
    /// @param delegatee The address to delegate the stake token to
    function initialize(address stakeToken_, address delegatee) external payable initializer {
        factory = msg.sender;
        stakeToken = stakeToken_;
        IVotes(stakeToken_).delegate(delegatee);
        IERC20(stakeToken_).approve(msg.sender, type(uint256).max);
    }

    /// @notice Reinitializes the contract with the stake token and delegates it to the same address
    /// @dev Must be called by the factory
    /// @param stakeToken_ The address of the stake token
    function reinitialize(address stakeToken_) external payable onlyFactory reinitializer(3) {
        address currentDelegatee = IVotes(stakeToken).delegates(address(this));
        stakeToken = stakeToken_;
        IERC20(stakeToken_).approve(msg.sender, type(uint256).max);
        if (currentDelegatee != address(0)) {
            IVotes(stakeToken_).delegate(currentDelegatee);
        }
    }

    /// @notice Delegates the stake token to the given address
    /// @dev Must be called by the factory
    /// @param delegatee The address to delegate the stake token to
    function redelegate(address delegatee) external payable onlyFactory {
        IVotes(stakeToken).delegate(delegatee);
    }
}
