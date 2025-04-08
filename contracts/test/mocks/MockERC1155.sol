// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Utils} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Utils.sol";

contract MockERC1155 is ERC1155 {
    uint256 public constant GOLD = 1;
    uint256 public constant SILVER = 2;
    uint256 public constant BRONZE = 3;

    uint256 public constant AMOUNT = 1;

    constructor() ERC1155("MockERC1155") {}

    function mintGold(address account) external {
        _mint(account, GOLD, AMOUNT, "");
    }

    function mintSilver(address account) external {
        _mint(account, SILVER, AMOUNT, "");
    }

    function mintBronze(address account) external {
        _mint(account, BRONZE, AMOUNT, "");
    }

    function safeMint(address account, uint256 id, uint256 amount) external {
        _mint(account, id, amount, "");
    }

    function directCheckOfReceived(address account) external returns (bool) {
        ERC1155Utils.checkOnERC1155Received(address(this), address(0), account, GOLD, AMOUNT, "");
        return true;
    }

    function directCheckOfReceivedBatch(address account) external returns (bool) {
        uint256[] memory ids = new uint256[](1);
        ids[0] = GOLD;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = AMOUNT;

        ERC1155Utils.checkOnERC1155BatchReceived(
            address(this),
            address(0),
            account,
            ids,
            amounts,
            ""
        );
        return true;
    }

    function safeMintBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external {
        _mintBatch(account, ids, amounts, "");
    }
}
