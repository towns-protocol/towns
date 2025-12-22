// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IMembershipBase} from "../membership/IMembership.sol";
import {ITreasury} from "./ITreasury.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

contract Treasury is TokenOwnableBase, ReentrancyGuard, Facet, ITreasury {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    function __Treasury_init() external onlyInitializing {
        _addInterface(type(IERC1155Receiver).interfaceId);
    }

    /// @inheritdoc ITreasury
    function withdraw(address currency, address account) external onlyOwner nonReentrant {
        if (account == address(0)) IMembershipBase.Membership__InvalidAddress.selector.revertWith();

        // Get balance based on currency type
        uint256 balance = currency == CurrencyTransfer.NATIVE_TOKEN
            ? address(this).balance
            : currency.balanceOf(address(this));

        // Verify the balance is not 0
        if (balance == 0) IMembershipBase.Membership__InsufficientPayment.selector.revertWith();

        CurrencyTransfer.transferCurrency(currency, address(this), account, balance);

        emit IMembershipBase.MembershipWithdrawal(currency, account, balance);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Hooks                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ITreasury
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /// @inheritdoc ITreasury
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /// @inheritdoc ITreasury
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
