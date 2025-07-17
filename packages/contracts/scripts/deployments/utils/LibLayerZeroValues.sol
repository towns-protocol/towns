// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library LibLayerZeroValues {
    function getEndpoint(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x6EDCE65403992e310A62460808c4b910D972f10f; // Sepolia Testnet
        if (chainId == 97) return 0x6EDCE65403992e310A62460808c4b910D972f10f; // BNB Testnet
        return address(0);
    }

    function getToken(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x000000Fa00b200406de700041CFc6b19BbFB4d13; // Sepolia Testnet
        return address(0);
    }

    function getEid(uint256 chainId) internal pure returns (uint32) {
        if (chainId == 11155111) return 40161; // Sepolia Testnet
        if (chainId == 97) return 40102; // BNB Testnet
        return 0;
    }

    function getSendLib(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE; // Sepolia Testnet
        if (chainId == 97) return 0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7; // BNB Testnet
        return address(0);
    }

    function getReceiveLib(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0xdAf00F5eE2158dD58E0d3857851c432E34A3A851; // Sepolia Testnet
        if (chainId == 97) return 0x188d4bbCeD671A7aA2b5055937F79510A32e9683; // BNB Testnet
        return address(0);
    }
}
