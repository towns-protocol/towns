// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

library DataTypes {
    enum PluginType {
        Validation,
        Execution,
        Both
    }

    struct TrustedAttester {
        uint8 count; // number of attesters in the linkedList
        uint8 threshold; // minimum number of attestations required to be a trusted attester
        address attester; // the first attester in the linkedList
        mapping(address attester => mapping(address account => address linkedAttester))
            linkedAttesters; // a linkedList of attesters
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Errors                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error InvalidSchemaResolver();
    error SchemaAlreadyRegistered();
    error InvalidSchema();
    error InvalidExpirationTime();
    error Irrevocable();
    error InvalidAttestation();
    error InvalidRevocation();
    error InvalidRevoker();
    error InvalidAttesters();
    error InvalidThreshold();
    error NoTrustedAttestersFound();
    error InsufficientAttestations();
    error NotPayable();
    error InsufficientBalance();
}
