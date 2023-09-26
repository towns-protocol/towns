// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {PublicKey} from "contracts/src/utils/PublicKey.sol";

/**
 * @dev  This struct encapsulates the enode and operator information for a node.
 */
struct Node {
  address operator;
  bytes publicKey;
  bytes4 ipAddress;
  uint16 port;
}

/**
 * @notice  This struct encapsulates the payload for registering a node.
 */
struct RegisterNode {
  address validator;
  address operator;
  bytes publicKey;
  bytes4 ipAddress;
  uint16 port;
}

/**
 * @author  HNT Labs
 * @title   Events, Errors and Structs for NodeRegistryBase.
 */

interface INodeRegistryBase {
  /**
   * @notice  Emitted when a node is registered.
   * @param   validator  Address of the validator.
   * @param   operator   Address of the operator.
   * @param   publicKey  Public key of the node.
   * @param   ipAddress  IP address of the node.
   * @param   port       Port of the node.
   */
  event NodeRegistered(
    address validator,
    address operator,
    bytes publicKey,
    bytes4 ipAddress,
    uint16 port
  );

  /**
   * @notice  Emitted when a node is updated.
   * @param   validator  Address of the validator.
   * @param   ipAddress  IP address of the node.
   * @param   port       Port of the node.
   */
  event NodeUpdated(address validator, bytes4 ipAddress, uint16 port);
}

/**
 * @author  HNT Labs
 * @title   Interface for the NodeRegistryFacet.
 */
interface INodeRegistry is INodeRegistryBase {
  function registerNode(
    RegisterNode calldata _registerNodePayload,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  function getNode(address _validator) external view returns (Node memory);

  function updateNode(
    address _validator,
    bytes4 _ipAddress,
    uint16 _port
  ) external;

  function getRegisterNodeDigest(
    RegisterNode calldata _registerNodePayload
  ) external view returns (bytes32);
}
