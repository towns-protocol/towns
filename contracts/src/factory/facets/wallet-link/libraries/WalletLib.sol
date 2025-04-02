// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
// contracts

library WalletLib {
    using EnumerableSet for EnumerableSet.Bytes32Set;

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

    function addWallet(
        RootWallet storage self,
        bytes32 walletHash,
        Wallet calldata wallet
    ) internal {
        self.walletHashes.add(walletHash);
        self.walletByHash[walletHash] = wallet;
    }

    function removeWallet(RootWallet storage self, bytes32 walletHash) internal {
        self.walletHashes.remove(walletHash);
        delete self.walletByHash[walletHash];
    }

    function exists(RootWallet storage self, bytes32 walletHash) internal view returns (bool) {
        return self.walletHashes.contains(walletHash);
    }
}
