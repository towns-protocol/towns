// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// common
import {Interaction} from "scripts/common/Interaction.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {LibLayerZeroValues} from "scripts/deployments/utils/LibLayerZeroValues.sol";

// contracts
import {Towns} from "src/tokens/towns/multichain/Towns.sol";
import {SendParam} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

// debugging
import {console} from "forge-std/console.sol";
contract InteractBridgeLayerZero is Interaction {
    using OptionsBuilder for bytes;

    address internal BNB_MULTISIG = address(1);

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function __interact(address deployer) internal override {}

    function sendToEth(address deployer) internal {
        address towns = getDeployment("townsBnb");
        uint256 amount = 11 ether;
        uint32 dstEid = LibLayerZeroValues.getEid(1); // Ethereum

        Towns oft = Towns(towns);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            65000,
            0
        );
        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: addressToBytes32(deployer),
            amountLD: amount,
            minAmountLD: (amount * 95) / 100, // 5% slippage tolerance
            extraOptions: extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Get fee quote
        MessagingFee memory fee = oft.quoteSend(sendParam, false);

        console.log("Sending tokens...");
        console.log("Towns address:", towns);
        console.log("Fee amount:", fee.nativeFee);

        // Send tokens
        vm.startBroadcast(deployer);
        oft.send{value: fee.nativeFee}(sendParam, fee, msg.sender);
        vm.stopBroadcast();
    }

    function sendToBnb(address deployer) internal {
        address towns = getDeployment("townsMainnet");
        address wrappedTowns = getDeployment("wTowns");
        uint256 amount = 11 ether;
        uint32 dstEid = LibLayerZeroValues.getEid(56); // Binance

        Towns oft = Towns(wrappedTowns);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            65000,
            0
        );

        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: addressToBytes32(BNB_MULTISIG),
            amountLD: amount,
            minAmountLD: (amount * 95) / 100, // 5% slippage tolerance
            extraOptions: extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Get fee quote
        MessagingFee memory fee = oft.quoteSend(sendParam, false);

        console.log("Sending tokens...");
        console.log("Towns address:", towns);
        console.log("Wrapped Towns address:", wrappedTowns);
        console.log("Fee amount:", fee.nativeFee);

        // Send tokens
        vm.startBroadcast(deployer);
        IERC20(towns).approve(address(oft), amount);
        oft.send{value: fee.nativeFee}(sendParam, fee, msg.sender);
        IERC20(towns).approve(address(oft), 0);
        vm.stopBroadcast();
    }
}
