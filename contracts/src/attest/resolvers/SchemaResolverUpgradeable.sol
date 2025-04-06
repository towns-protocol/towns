// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "../interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "../types/DataTypes.sol";

// contracts
abstract contract SchemaResolverUpgradeable is ISchemaResolver {
    function __SchemaResolver_init(address _appRegistry) internal {
        SchemaResolverStorage.Layout storage l = SchemaResolverStorage.getLayout();
        l.appRegistry = _appRegistry;
    }

    modifier onlyAppRegistry() {
        if (msg.sender != SchemaResolverStorage.getLayout().appRegistry) {
            revert DataTypes.AccessDenied();
        }
        _;
    }

    receive() external payable virtual {
        if (!isPayable()) {
            revert DataTypes.NotPayable();
        }
    }

    /// @inheritdoc ISchemaResolver
    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    /// @inheritdoc ISchemaResolver
    function attest(DataTypes.Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onAttest(attestation, msg.value);
    }

    /// @inheritdoc ISchemaResolver
    function revoke(DataTypes.Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onRevoke(attestation, msg.value);
    }

    /// @notice Hook that is called before an attestation is created
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the attestation
    /// @return Whether the attestation is valid
    function onAttest(
        DataTypes.Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);

    /// @notice Hook that is called before an attestation is revoked
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the revocation
    /// @return Whether the attestation can be revoked
    function onRevoke(
        DataTypes.Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);
}

library SchemaResolverStorage {
    // keccak256(abi.encode(uint256(keccak256("towns.schema.resolver.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x3a14026143f063e5ed064cce80cc75f6ea25b68d1ad3a3261a9ae5e3f526fa00;

    struct Layout {
        address appRegistry;
    }

    function getLayout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
