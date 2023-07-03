// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

/// interfaces
import {ITowns} from "contracts/src/tokens/interfaces/ITowns.sol";

//contracts
import {ERC20Base} from "contracts/src/tokens/base/ERC20Base.sol";

/**
 *  @title Towns
 *  @notice This contract is used to create the TOWNS token.
 */
contract Towns is ERC20Base, ITowns {
  bool internal transfersEnabled = true;

  /// @dev The addresses allowed to transfer tokens when transfers are disabled
  mapping(address => bool) public allowedTransferee;

  constructor(
    string memory name,
    string memory symbol
  ) ERC20Base(name, symbol) {}

  /// @inheritdoc ITowns
  function setTransfers(bool enabled) external onlyOwner {
    transfersEnabled = enabled;
    emit TransfersSet(enabled);
  }

  /// @inheritdoc ITowns
  function setAllowedTransfers(
    address transferee,
    bool allowed
  ) external onlyOwner {
    allowedTransferee[transferee] = allowed;
    emit AllowedTransfersSet(transferee, allowed);
  }

  function _beforeTokenTransfer(
    address from,
    address,
    uint256
  ) internal virtual override {
    // When trying to transfer tokens, check that transfers are enabled if not being minted and that the sender is allowed to transfer
    if (
      transfersEnabled == false &&
      from != address(0) &&
      allowedTransferee[from] == false
    ) {
      require(transfersEnabled, "Towns: transfers disabled");
    }
  }
}
