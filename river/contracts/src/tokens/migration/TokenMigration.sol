// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ITokenMigration} from "./ITokenMigration.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {TokenMigrationStorage} from "./TokenMigrationStorage.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract TokenMigrationFacet is
  OwnableBase,
  PausableBase,
  Facet,
  ITokenMigration
{
  using SafeTransferLib for address;

  function __TokenMigrationFacet_init(
    IERC20 oldToken,
    IERC20 newToken
  ) external onlyInitializing {
    TokenMigrationStorage.Layout storage ds = TokenMigrationStorage.layout();
    (ds.oldToken, ds.newToken) = (oldToken, newToken);
    _pause();
  }

  /// @inheritdoc ITokenMigration
  function migrate(address account) external whenNotPaused {
    Validator.checkAddress(account);

    TokenMigrationStorage.Layout storage ds = TokenMigrationStorage.layout();

    IERC20 oldToken = ds.oldToken;
    IERC20 newToken = ds.newToken;

    uint256 currentBalance = oldToken.balanceOf(account);

    if (currentBalance == 0)
      CustomRevert.revertWith(TokenMigration__InvalidBalance.selector);

    if (oldToken.allowance(account, address(this)) < currentBalance)
      CustomRevert.revertWith(TokenMigration__InvalidAllowance.selector);

    // Transfer old tokens from user to zero address (burn)
    address(oldToken).safeTransferFrom(account, address(0), currentBalance);

    // Transfer new tokens to user
    address(newToken).safeTransfer(account, currentBalance);

    emit TokensMigrated(account, currentBalance);
  }

  /// @inheritdoc ITokenMigration
  function withdrawTokens() external onlyOwner {
    TokenMigrationStorage.Layout storage ds = TokenMigrationStorage.layout();

    (IERC20 oldToken, IERC20 newToken) = (ds.oldToken, ds.newToken);
    address owner = _owner();

    uint256 oldTokenBalance = oldToken.balanceOf(address(this));
    if (oldTokenBalance > 0)
      address(oldToken).safeTransfer(owner, oldTokenBalance);

    uint256 newTokenBalance = newToken.balanceOf(address(this));
    if (newTokenBalance > 0)
      address(newToken).safeTransfer(owner, newTokenBalance);
  }
}
