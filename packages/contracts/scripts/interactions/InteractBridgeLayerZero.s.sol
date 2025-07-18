// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// common
import {Interaction} from "scripts/common/Interaction.s.sol";

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

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function __interact(address deployer) internal override {
        address wrappedTowns = getDeployment("utils/wTowns");
        uint256 amount = 1 ether;
        uint32 dstEid = LibLayerZeroValues.getEid(56); // BNB

        Towns oft = Towns(wrappedTowns);

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
        console.log("Fee amount:", fee.nativeFee);

        // Send tokens
        vm.startBroadcast(deployer);
        oft.send{value: fee.nativeFee}(sendParam, fee, msg.sender);
        vm.stopBroadcast();
    }
}
