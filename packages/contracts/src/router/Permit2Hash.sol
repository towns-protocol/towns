// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {PermitHash} from "@uniswap/permit2/src/libraries/PermitHash.sol";
import {ISwapRouterBase} from "./ISwapRouter.sol";

library Permit2Hash {
    /// @notice EIP-712 type hash for ExactInputParams struct
    bytes32 internal constant EXACT_INPUT_PARAMS_TYPE_HASH =
        keccak256(
            "ExactInputParams(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient)"
        );

    /// @notice EIP-712 type hash for RouterParams struct
    bytes32 internal constant ROUTER_PARAMS_TYPE_HASH =
        keccak256("RouterParams(address router,address approveTarget,bytes swapData)");

    /// @notice EIP-712 type string for SwapWitness struct used in permit signatures
    /// @dev Defines the complete type definition including nested struct types for swap parameters
    string internal constant WITNESS_TYPE =
        "SwapWitness(ExactInputParams exactInputParams,RouterParams routerParams,address poster)ExactInputParams(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient)RouterParams(address router,address approveTarget,bytes swapData)";

    /// @notice Keccak256 hash of the WITNESS_TYPE string
    /// @dev Pre-computed hash for gas efficiency in signature verification
    bytes32 internal constant WITNESS_TYPE_HASH = keccak256(bytes(WITNESS_TYPE));

    /// @notice EIP-712 witness type string for SwapWitness
    /// @dev This string defines the structure of the witness data that binds permit signatures
    /// to specific swap parameters, preventing front-running and parameter manipulation attacks
    string internal constant WITNESS_TYPE_STRING =
        "SwapWitness witness)ExactInputParams(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient)RouterParams(address router,address approveTarget,bytes swapData)SwapWitness(ExactInputParams exactInputParams,RouterParams routerParams,address poster)TokenPermissions(address token,uint256 amount)";

    /// @notice EIP-712 type hash for PermitWitnessTransferFrom with SwapWitness
    /// @dev Combined type hash for Permit2 witness transfers with swap-specific witness data
    /// Used to create structured hashes that bind permit signatures to exact swap parameters
    bytes32 internal constant PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH =
        keccak256(
            abi.encodePacked(
                PermitHash._PERMIT_TRANSFER_FROM_WITNESS_TYPEHASH_STUB,
                WITNESS_TYPE_STRING
            )
        );

    /// @notice Hashes SwapWitness struct according to EIP-712
    /// @param witness The SwapWitness struct to hash
    /// @return bytes32 The EIP-712 hashStruct of SwapWitness
    function hash(ISwapRouterBase.SwapWitness memory witness) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    WITNESS_TYPE_HASH,
                    hash(witness.exactInputParams),
                    hash(witness.routerParams),
                    witness.poster
                )
            );
    }

    /// @notice Hashes ExactInputParams struct according to EIP-712
    /// @param params The ExactInputParams struct to hash
    /// @return bytes32 The EIP-712 hashStruct of ExactInputParams
    function hash(ISwapRouterBase.ExactInputParams memory params) internal pure returns (bytes32) {
        return keccak256(abi.encode(EXACT_INPUT_PARAMS_TYPE_HASH, params));
    }

    /// @notice Hashes RouterParams struct according to EIP-712
    /// @param params The RouterParams struct to hash
    /// @return bytes32 The EIP-712 hashStruct of RouterParams
    function hash(ISwapRouterBase.RouterParams memory params) internal pure returns (bytes32) {
        // RouterParams contains dynamic bytes, so we must encode fields individually per EIP-712
        return
            keccak256(
                abi.encode(
                    ROUTER_PARAMS_TYPE_HASH,
                    params.router,
                    params.approveTarget,
                    keccak256(params.swapData) // Dynamic bytes must be hashed
                )
            );
    }
}
