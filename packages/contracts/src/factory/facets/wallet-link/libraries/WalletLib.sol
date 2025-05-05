// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
// contracts

library WalletLib {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    enum VirtualMachineType {
        EVM, // Ethereum Virtual Machine (Ethereum, BSC, Polygon, etc.)
        SVM, // Solana Virtual Machine
        MOVE, // Move Virtual Machine (Aptos, Sui)
        CVM, // Cosmos Virtual Machine
        WASM, // WebAssembly VM (Polkadot, NEAR)
        AVM, // Avalanche Virtual Machine
        UNKNOWN // For future compatibility
    }

    struct Wallet {
        string addr; // Base58/Bech32/etc. encoded address
        VirtualMachineType vmType; // Type of VM this wallet belongs to
    }

    struct RootWallet {
        EnumerableSet.Bytes32Set walletHashes;
        address defaultWallet;
        mapping(bytes32 => Wallet) walletByHash;
    }

    struct Layout {
        // mapping RootKeys to Ethereum Wallets is a 1 to many relationship, a root key can have many wallets
        mapping(address => EnumerableSet.AddressSet) walletsByRootKey;
        // mapping Ethereum Wallets to RootKey is a 1 to 1 relationship, a wallet can only be linked to 1 root key
        mapping(address => address) rootKeyByWallet;
        // mapping of wallet link external dependencies
        mapping(bytes32 => address) dependencies;
        // mapping of root key to root wallet
        mapping(address => RootWallet) rootWalletByRootKey;
        // mapping of root key hash to root key
        mapping(bytes32 => address) rootKeyByHash;
    }

    // keccak256(abi.encode(uint256(keccak256("river.wallet.link.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc00;

    function layout() internal pure returns (Layout storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
}
