// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//contracts
import {ERC20Permit, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Metadata} from "contracts/src/utils/Metadata.sol";
import {MultiCaller} from "contracts/src/utils/MultiCaller.sol";

/**
 *  @title ERC20Base
 *  @author Towns
 *  @notice This contract is used to create a base ERC20 token.
 *  It includes the following additions to standard OpenZeppelin ERC20 logic:
 *
 *      - Ability to mint & burn tokens via the provided `mint` & `burn` functions.
 *
 *      - Ownership of the contract, with the ability to restrict certain functions to
 *        only be called by the contract's owner.
 *
 *      - Multicall capability to perform multiple actions atomically
 *
 *      - EIP 2612 compliance: See {ERC20-permit} method, which can be used to change an account's ERC20 allowance by
 *                             presenting a message signed by the account.
 */
contract ERC20Base is Metadata, MultiCaller, Ownable, ERC20, ERC20Permit {
  // =============================================================
  //                           Constructor
  // =============================================================
  constructor(
    string memory name,
    string memory symbol
  ) ERC20(name, symbol) ERC20Permit(name) {}

  // =============================================================
  //                           Minting
  // =============================================================

  /// @notice Mints tokens to the specified address.
  /// @param _to The address to mint tokens to.
  /// @param _amount The amount of tokens to mint.
  function mintTo(address _to, uint256 _amount) public virtual {
    require(_canMint(), "ERC20Base: cannot mint");
    require(_amount != 0, "ERC20Base: cannot mint 0");
    _mint(_to, _amount);
  }

  /// @notice Burns tokens from the caller's address.
  /// @param _amount The amount of tokens to burn.
  function burn(uint256 _amount) public virtual {
    require(
      balanceOf(_msgSender()) >= _amount,
      "ERC20Base: not enough balance"
    );
    _burn(_msgSender(), _amount);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// @dev Checks if the sender can set contract uri
  function _canSetContractURI() internal view virtual override returns (bool) {
    return _msgSender() == owner();
  }

  /// @dev Checks if the sender can mint.
  function _canMint() internal view virtual returns (bool) {
    return _msgSender() == owner();
  }
}
