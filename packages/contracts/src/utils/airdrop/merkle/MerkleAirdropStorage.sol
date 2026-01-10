// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries

// contracts

library MerkleAirdropStorage {
    struct Layout {
        IERC20 token;
        bytes32 merkleRoot;
        mapping(address => bool) claimed;
    }

    // keccak256(abi.encode(uint256(keccak256("merkle.airdrop.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x5499e8f18bf9226c15306964dca998d3d8d3ddae851b652336bc6dea221b5200;

    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }
}
