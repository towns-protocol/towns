// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {PublicKey} from "contracts/src/utils/PublicKey.sol";

/**
 * @dev  This struct encapsulates the enode and operator information for a node.
 */
struct Node {
  address operator;
  bytes publicKey;
  string socket;
}

/**
 * @author  HNT Labs
 * @title   Events, Errors and Structs for NodeRegistryBase.
 */

interface INodeRegistryBase {
  /**
   * @notice  This struct encapsulates the payload for registering a node.
   */
  struct RegisterNode {
    address validator;
    address operator;
    bytes publicKey;
    string socket;
  }

  /**
   * @notice  Reverted because the validator's address doesn't match its public key.
   */
  error NodeRegistry__ValidatorAddressNotDerivedFromPublicKey();

  /**
   * @notice  Reverted because an operator-only function is called by a non-operator.
   */
  error NodeRegistry__OnlyOperator();

  /**
   * @notice  Reverted because the node is already on the access registry.
   */
  error NodeRegistry__AlreadyRegistered();

  /**
   * @notice  Reverted because the node is not on the access registry.
   */
  error NodeRegistry__NotRegistered();

  /**
   * @notice  Reverted because the validator's signature is invalid.
   * @dev     This revert happens inside the NodeRegistryFacet, not the NodeRegistryBase.
   */
  error NodeRegistry__InvalidValidatorSignature();

  /**
   * @notice  Emitted when a node is registered.
   * @param   validator  Address of the validator.
   * @param   operator   Address of the operator.
   * @param   publicKey  Public key of the node.
   * @param   socket     Socket of the node.
   */
  event NodeRegistered(
    address validator,
    address operator,
    bytes publicKey,
    string socket
  );

  /**
   * @notice  Emitted when a node is updated.
   * @param   validator  Address of the validator.
   * @param   socket     Socket of the node.
   */
  event NodeUpdated(address validator, string socket);
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

  function updateNode(address _validator, string memory _socket) external;

  function getRegisterNodeDigest(
    RegisterNode calldata _registerNodePayload
  ) external view returns (bytes32);
}
