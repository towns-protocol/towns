// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IArchitect} from "../factory/facets/architect/IArchitect.sol";
import {ISwapFacet} from "../spaces/facets/swap/ISwapFacet.sol";
import {ISwapRouter} from "./ISwapRouter.sol";
import {ISignatureTransfer} from "@uniswap/permit2/src/interfaces/ISignatureTransfer.sol";

// libraries
import {BasisPoints} from "../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../utils/libraries/CustomRevert.sol";
import {Permit2Hash} from "./Permit2Hash.sol";
import {SwapRouterStorage} from "./SwapRouterStorage.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {PermitHash} from "@uniswap/permit2/src/libraries/PermitHash.sol";
import {LibBit} from "solady/utils/LibBit.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/**
 * @title SwapRouter
 * @notice Handles swaps through whitelisted routers with fee collection
 * @dev This contract provides two swap execution methods:
 *
 * Standard Swaps (`executeSwap`):
 * - User transfers tokens to contract, then swap executes
 * - Supports both ERC20 tokens and native ETH
 * - Traditional approve/transferFrom flow
 *
 * Permit2 Swaps (`executeSwapWithPermit`):
 * - Enhanced security using Uniswap's Permit2 protocol with witness data
 * - Direct token transfer: User → SwapRouter → DEX (skips intermediate approvals)
 * - ERC20 tokens only (native ETH not supported)
 * - Cryptographically binds permit signatures to exact swap parameters
 * - Prevents front-running attacks through witness data binding
 * - Uses EIP-712 witness containing ExactInputParams, RouterParams, and poster
 * - Requires pre-approval of tokens to Permit2 contract
 * - Provides nonce-based replay protection and deadline-based time bounds
 */
contract SwapRouter is PausableBase, ReentrancyGuardTransient, ISwapRouter, Facet {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    /// @notice Universal Permit2 contract address
    /// @dev This contract implements Uniswap's Permit2 protocol for signature-based token transfers
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    /// @notice EIP-712 domain separator for Permit2
    bytes32 internal immutable PERMIT2_DOMAIN_SEPARATOR =
        ISignatureTransfer(PERMIT2).DOMAIN_SEPARATOR();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the SwapRouter with the space factory address
    /// @param spaceFactory The address of the space factory
    function __SwapRouter_init(address spaceFactory) external onlyInitializing {
        SwapRouterStorage.layout().spaceFactory = spaceFactory;
        emit SwapRouterInitialized(spaceFactory);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    /// @dev Handles refunds of unconsumed input tokens. For ERC20s, calculates actual received amount
    /// to support fee-on-transfer tokens. For ETH, tracks original balance and refunds any unconsumed
    /// ETH after the external router call. Refunds are sent back to msg.sender.
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut, uint256 protocolFee) {
        // validate parameters before any transfers
        _validateSwapParams(params, routerParams);

        // for standard swaps, handle token transfer with balance check for fee-on-transfer tokens
        uint256 tokenInBalanceBefore;

        if (params.tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            // ensure no ETH is sent when tokenIn is not native
            if (msg.value != 0) SwapRouter__UnexpectedETH.selector.revertWith();

            // use the actual received amount to handle fee-on-transfer tokens
            tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));
            params.tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
        } else {
            // for native token, the value should be sent with the transaction
            if (msg.value != params.amountIn) SwapRouter__InvalidAmount.selector.revertWith();

            // store original balance before router call for ETH refunds
            unchecked {
                tokenInBalanceBefore = address(this).balance - msg.value;
            }
        }

        return _executeSwap(params, routerParams, poster, tokenInBalanceBefore, msg.sender);
    }

    /// @inheritdoc ISwapRouter
    /// @dev Uses Permit2 with witness data to bind permit signatures to exact swap parameters,
    /// preventing front-running attacks. Requires user to pre-approve tokens to Permit2 contract.
    /// Handles refunds of unconsumed ERC20 tokens back to the permit owner (not msg.sender).
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        Permit2Params calldata permit,
        address poster
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut, uint256 protocolFee) {
        // validate parameters before any transfers
        _validateSwapParams(params, routerParams);

        // ensure no ETH is sent
        if (msg.value != 0) SwapRouter__UnexpectedETH.selector.revertWith();

        // Permit2 only works with ERC20 tokens, not native ETH
        if (params.tokenIn == CurrencyTransfer.NATIVE_TOKEN) {
            SwapRouter__NativeTokenNotSupportedWithPermit.selector.revertWith();
        }

        // take balance snapshot before Permit2 transfer to handle fee-on-transfer tokens
        uint256 tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));

        // execute permit transfer from owner to this contract via Permit2
        ISignatureTransfer(PERMIT2).permitWitnessTransferFrom(
            ISignatureTransfer.PermitTransferFrom(
                ISignatureTransfer.TokenPermissions(params.tokenIn, params.amountIn),
                permit.nonce,
                permit.deadline
            ),
            ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: params.amountIn
            }),
            permit.owner, // owner who signed the permit
            Permit2Hash.hash(SwapWitness(params, routerParams, poster)),
            Permit2Hash.WITNESS_TYPE_STRING,
            permit.signature
        );

        // execute the swap with the balance before transfer
        return _executeSwap(params, routerParams, poster, tokenInBalanceBefore, permit.owner);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    function getETHInputFees(
        uint256 amountIn,
        address caller,
        address poster
    ) external view returns (uint256 amountInAfterFees, uint256 protocolFee, uint256 posterFee) {
        address spaceFactory = _getSpaceFactory();

        // get fee rates based on whether the caller is a space
        (uint16 protocolBps, uint16 posterBps) = _getSwapFees(spaceFactory, caller);

        // calculate fees and amount after fees
        return _calculateSwapFees(amountIn, protocolBps, posterBps, poster);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        PERMIT2 UTILS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    function getPermit2Nonce(
        address owner,
        uint256 startNonce
    ) external view returns (uint256 nonce) {
        unchecked {
            uint256 bitPos = startNonce & 0xff;

            for (uint256 wordPos = startNonce >> 8; wordPos <= type(uint248).max; ++wordPos) {
                uint256 bitmap = ISignatureTransfer(PERMIT2).nonceBitmap(owner, uint248(wordPos));

                // create mask to ignore bits below bitPos (set bits below bitPos to 1)
                uint256 mask = (1 << bitPos) - 1;
                uint256 availableBits = ~(bitmap | mask);

                // if there are available bits in this word, find the first one
                if (availableBits != 0) {
                    // find first set bit in availableBits (which represents available nonces)
                    uint256 firstZeroBit = LibBit.ffs(availableBits);
                    return (wordPos << 8) | firstZeroBit;
                }

                bitPos = 0; // reset for next word
            }

            // no available nonces found
            return type(uint256).max;
        }
    }

    /// @inheritdoc ISwapRouter
    function getPermit2MessageHash(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32 messageHash) {
        bytes32 witnessHash = Permit2Hash.hash(SwapWitness(params, routerParams, poster));
        bytes32 tokenPermissions = keccak256(
            abi.encode(PermitHash._TOKEN_PERMISSIONS_TYPEHASH, params.tokenIn, amount)
        );

        bytes32 structHash = keccak256(
            abi.encode(
                Permit2Hash.PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH,
                tokenPermissions,
                address(this), // spender
                nonce,
                deadline,
                witnessHash
            )
        );

        return MessageHashUtils.toTypedDataHash(PERMIT2_DOMAIN_SEPARATOR, structHash);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Validates swap parameters before any transfers occur
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    function _validateSwapParams(
        ExactInputParams calldata params,
        RouterParams calldata routerParams
    ) internal view {
        // require explicit recipient
        if (params.recipient == address(0)) SwapRouter__RecipientRequired.selector.revertWith();

        // prevent swaps where tokenIn and tokenOut are the same
        if (params.tokenIn == params.tokenOut) SwapRouter__SameToken.selector.revertWith();

        // only allow whitelisted routers
        if (!_isRouterWhitelisted(routerParams.router)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }
        if (!_isRouterWhitelisted(routerParams.approveTarget)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }
    }

    /// @notice Internal function to execute a swap with tokens already in the contract
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    /// @param poster The address that posted this swap opportunity
    /// @param tokenInBalanceBefore The balance of input token before any transfers (0 for ETH)
    /// @param payer The address that should receive any refund of unconsumed input tokens
    /// @return amountOut The amount of tokenOut received
    /// @return protocolFee The protocol fee amount
    function _executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster,
        uint256 tokenInBalanceBefore,
        address payer
    ) internal returns (uint256 amountOut, uint256 protocolFee) {
        // snapshot the balance of tokenOut before the swap
        uint256 balanceBefore = _getBalance(params.tokenOut);

        bool isNativeToken = params.tokenIn == CurrencyTransfer.NATIVE_TOKEN;
        {
            uint256 value;

            if (!isNativeToken) {
                // calculate actualAmountIn for ERC20
                uint256 actualAmountIn = params.tokenIn.balanceOf(address(this)) -
                    tokenInBalanceBefore;

                // tokens are already in the contract, just approve the router
                params.tokenIn.safeApprove(routerParams.approveTarget, actualAmountIn);
            } else {
                // calculate and collect fees before the swap for ETH input
                (value, protocolFee, ) = _collectFees(
                    CurrencyTransfer.NATIVE_TOKEN,
                    msg.value,
                    poster
                );
            }

            // execute swap with the router
            LibCall.callContract(routerParams.router, value, routerParams.swapData);

            // reset approval for tokenIn
            if (!isNativeToken) params.tokenIn.safeApprove(routerParams.approveTarget, 0);

            // refund any unconsumed input tokens to the payer
            uint256 refundAmount = _getBalance(params.tokenIn) - tokenInBalanceBefore;
            CurrencyTransfer.transferCurrency(params.tokenIn, address(this), payer, refundAmount);
        }

        // use the actual received amount to handle fee-on-transfer tokens
        amountOut = _getBalance(params.tokenOut) - balanceBefore;

        // calculate and distribute fees only for non-ETH inputs
        // for ETH inputs, fees were already collected before the swap
        if (!isNativeToken) {
            (amountOut, protocolFee, ) = _collectFees(params.tokenOut, amountOut, poster);
        }

        // slippage check after fees
        if (amountOut < params.minAmountOut) SwapRouter__InsufficientOutput.selector.revertWith();

        // transfer remaining tokens to the recipient
        CurrencyTransfer.transferCurrency(
            params.tokenOut,
            address(this),
            params.recipient,
            amountOut
        );

        emit Swap(
            routerParams.router,
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.recipient
        );
    }

    /// @notice Collects and distributes both protocol and poster fees
    /// @param token The token to collect fees in
    /// @param amount The amount to calculate fees from
    /// @param poster The address that posted this swap opportunity
    /// @return amountAfterFees The amount after deducting protocol and poster fees
    /// @return protocolFee The protocol fee amount collected
    /// @return posterFee The poster fee amount collected
    function _collectFees(
        address token,
        uint256 amount,
        address poster
    ) internal returns (uint256 amountAfterFees, uint256 protocolFee, uint256 posterFee) {
        address spaceFactory = _getSpaceFactory();
        (uint16 protocolBps, uint16 posterBps) = _getSwapFees(spaceFactory, msg.sender);

        // calculate fees
        (amountAfterFees, protocolFee, posterFee) = _calculateSwapFees(
            amount,
            protocolBps,
            posterBps,
            poster
        );

        // transfer fees
        address feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
        CurrencyTransfer.transferCurrency(token, address(this), feeRecipient, protocolFee);

        if (posterFee > 0) {
            CurrencyTransfer.transferCurrency(token, address(this), poster, posterFee);
        }

        emit FeeDistribution(token, feeRecipient, poster, protocolFee, posterFee);
    }

    function _getSwapFees(
        address spaceFactory,
        address caller
    ) internal view returns (uint16 protocolBps, uint16 posterBps) {
        // check if caller is a space
        bool isSpace = IArchitect(spaceFactory).getTokenIdBySpace(caller) != 0;

        // get fee configuration based on whether caller is a space
        if (isSpace) {
            try ISwapFacet(caller).getSwapFees() returns (
                uint16 spaceTreasuryBps,
                uint16 spacePosterBps,
                bool
            ) {
                return (spaceTreasuryBps, spacePosterBps);
            } catch {}
            // fallback to platform fees if the space doesn't implement getSwapFees
        }
        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        return platform.getSwapFees();
    }

    function _getSpaceFactory() internal view returns (address) {
        return SwapRouterStorage.layout().spaceFactory;
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(_getSpaceFactory());
    }

    /// @notice Checks if a router is whitelisted
    /// @param router The address to check
    /// @return bool True if the router is whitelisted
    function _isRouterWhitelisted(address router) internal view returns (bool) {
        return _getPlatformRequirements().isRouterWhitelisted(router);
    }

    /// @notice Gets the balance of a token for this contract
    /// @param token The token to check
    /// @return uint256 The balance
    function _getBalance(address token) internal view returns (uint256) {
        if (token != CurrencyTransfer.NATIVE_TOKEN) return token.balanceOf(address(this));
        return address(this).balance;
    }

    /// @notice Calculates swap fees and the amount after fees
    /// @param amount The original amount to calculate fees from
    /// @param protocolBps Protocol fee in basis points
    /// @param posterBps Poster fee in basis points
    /// @param poster The address that posted this swap opportunity
    /// @return amountAfterFees The amount after deducting protocol and poster fees
    /// @return protocolFee The protocol fee amount computed
    /// @return posterFee The poster fee amount computed
    function _calculateSwapFees(
        uint256 amount,
        uint16 protocolBps,
        uint16 posterBps,
        address poster
    ) internal pure returns (uint256 amountAfterFees, uint256 protocolFee, uint256 posterFee) {
        if (protocolBps + posterBps > BasisPoints.MAX_BPS) {
            SwapRouter__InvalidBps.selector.revertWith();
        }

        // calculate protocol fee
        protocolFee = BasisPoints.calculate(amount, protocolBps);

        // only calculate poster fee if the address is not zero
        if (poster != address(0)) posterFee = BasisPoints.calculate(amount, posterBps);

        // calculate amount after fees
        unchecked {
            amountAfterFees = amount - protocolFee - posterFee;
        }
    }
}
