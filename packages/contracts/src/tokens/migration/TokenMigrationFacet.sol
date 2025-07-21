// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITokenMigration} from "./ITokenMigration.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {TokenMigrationStorage} from "./TokenMigrationStorage.sol";
import {Validator} from "../../utils/libraries/Validator.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";

contract TokenMigrationFacet is OwnableBase, PausableBase, Facet, ITokenMigration {
    using SafeTransferLib for address;

    function __TokenMigrationFacet_init(
        IERC20 oldToken,
        IERC20 newToken
    ) external onlyInitializing {
        _validateTokens(oldToken, newToken);

        TokenMigrationStorage.Layout storage ds = TokenMigrationStorage.layout();
        (ds.oldToken, ds.newToken) = (oldToken, newToken);
        _pause();
    }

    /// @inheritdoc ITokenMigration
    function migrate(address account) external whenNotPaused {
        Validator.checkAddress(account);

        TokenMigrationStorage.Layout storage ds = TokenMigrationStorage.layout();

        (IERC20 oldToken, IERC20 newToken) = (ds.oldToken, ds.newToken);

        uint256 currentBalance = oldToken.balanceOf(account);
        if (currentBalance == 0) {
            CustomRevert.revertWith(TokenMigration__InvalidBalance.selector);
        }

        if (oldToken.allowance(account, address(this)) < currentBalance) {
            CustomRevert.revertWith(TokenMigration__InvalidAllowance.selector);
        }

        // check that contract has enough balance of new token
        uint256 newTokenBalance = newToken.balanceOf(address(this));
        if (newTokenBalance < currentBalance) {
            CustomRevert.revertWith(TokenMigration__NotEnoughTokenBalance.selector);
        }

        // Transfer old tokens from user to this contract
        address(oldToken).safeTransferFrom(account, address(this), currentBalance);

        // Transfer new tokens to user
        address(newToken).safeTransfer(account, currentBalance);

        emit TokensMigrated(account, currentBalance);
    }

    /// @inheritdoc ITokenMigration
    function emergencyWithdraw(IERC20 token, address to) external onlyOwner whenPaused {
        uint256 balance = token.balanceOf(address(this));
        address(token).safeTransfer(to, balance);
        emit EmergencyWithdraw(address(token), to, balance);
    }

    /// @inheritdoc ITokenMigration
    function tokens() external view returns (IERC20 oldToken, IERC20 newToken) {
        return (TokenMigrationStorage.layout().oldToken, TokenMigrationStorage.layout().newToken);
    }

    // =============================================================
    //                           Internal
    // =============================================================

    function _validateTokens(IERC20 oldToken, IERC20 newToken) internal pure {
        if (address(oldToken) == address(0) || address(newToken) == address(0)) {
            CustomRevert.revertWith(TokenMigration__InvalidTokens.selector);
        }
    }
}
