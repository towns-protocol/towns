// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// libraries

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {Airdrop} from "src/utils/Airdrop.sol";

contract InteractAirdrop is Interaction {
    struct Wallet {
        address account;
        uint256 amount;
        string label;
    }

    struct InputData {
        address airdrop;
        address token;
        Wallet[] wallets;
    }

    function __interact(address deployer) internal override {
        // Read JSON file and parse wallet data
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/contracts/in/airdrop-input-data.json");

        string memory json = vm.readFile(path);
        bytes memory parsedJson = vm.parseJson(json);

        InputData memory data = abi.decode(parsedJson, (InputData));

        uint256 totalAccounts = data.wallets.length;

        address[] memory addresses = new address[](totalAccounts);
        uint256[] memory amounts = new uint256[](totalAccounts);

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < totalAccounts; i++) {
            addresses[i] = data.wallets[i].account;
            amounts[i] = data.wallets[i].amount;
            totalAmount += data.wallets[i].amount;
        }

        vm.startBroadcast(deployer);
        IERC20(data.token).approve(data.airdrop, totalAmount);
        Airdrop(data.airdrop).airdropERC20({
            token: data.token,
            addresses: addresses,
            amounts: amounts,
            totalAmount: totalAmount
        });
        vm.stopBroadcast();
    }
}
