// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library LibLayerZeroValues {
    function getEndpoint(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0x1a44076050125825900e736c501f859c50fE728c; // Mainnet
        if (chainId == 56) return 0x1a44076050125825900e736c501f859c50fE728c; // Binance
        return address(0);
    }

    function getDeployedToken(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0x00000000Bc5Ff0261B97004a79c6D361002Ba2db; // wTowns
        if (chainId == 56) return 0x00000000bcA93b25a6694ca3d2109d545988b13B; // townsBnb
        return address(0);
    }

    function getEid(uint256 chainId) internal pure returns (uint32) {
        if (chainId == 1) return 30101; // Mainnet
        if (chainId == 56) return 30102; // Binance
        return 0;
    }

    function getSendLib(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1; // Mainnet
        if (chainId == 56) return 0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE; // Binance
        return address(0);
    }

    function getReceiveLib(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0xc02Ab410f0734EFa3F14628780e6e695156024C2; // Mainnet
        if (chainId == 56) return 0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1; // Binance
        return address(0);
    }
}
