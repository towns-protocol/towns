// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {PermitHash} from "@uniswap/permit2/src/libraries/PermitHash.sol";

library Permit2Hash {
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

    /// @notice EIP-712 typehash for PermitWitnessTransferFrom with SwapWitness
    /// @dev Combined typehash for Permit2 witness transfers with swap-specific witness data
    /// Used to create structured hashes that bind permit signatures to exact swap parameters
    bytes32 internal constant PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH =
        keccak256(
            abi.encodePacked(
                PermitHash._PERMIT_TRANSFER_FROM_WITNESS_TYPEHASH_STUB,
                WITNESS_TYPE_STRING
            )
        );
}
