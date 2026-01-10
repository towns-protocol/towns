// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title TownsLib
library TownsLib {
    struct Layout {
        address remoteToken;
    }

    /// @notice Address of the L2StandardBridge predeploy.
    address internal constant L2_STANDARD_BRIDGE = 0x4200000000000000000000000000000000000010;

    /// @notice Address of the SuperchainTokenBridge predeploy.
    address internal constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028;

    // keccak256(abi.encode(uint256(keccak256("towns.tokens.l2.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x708ba15393f53e4db9d749d00ba2ba89a43d1e182bc44eaf801b83b223310b00;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    function initializeRemoteToken(address _remoteToken) internal {
        Layout storage l = layout();
        l.remoteToken = _remoteToken;
    }
}
