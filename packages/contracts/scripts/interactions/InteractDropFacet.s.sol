// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet, IDropFacetBase} from "src/airdrop/drop/IDropFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {DropClaim} from "src/airdrop/drop/DropClaim.sol";
import {DropGroup} from "src/airdrop/drop/DropGroup.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";
import {console} from "forge-std/console.sol";

// deployments
import {DeployRiverAirdrop} from "scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";
import {DropFacet} from "src/airdrop/drop/DropFacet.sol";

contract InteractDropFacet is Interaction, IDropFacetBase {
    function __interact(address) internal override {
        address airdrop = getDeployment("riverAirdrop");
        address dropFacet = 0x8DB408fD918e80D09Afb895f41480076ba96C74b;

        DropFacet facet = new DropFacet();
        bytes memory bytecode = address(facet).code;
        vm.etch(dropFacet, bytecode);

        vm.expectRevert(DropFacet__NoActiveClaimCondition.selector);
        IDropFacet(airdrop).getActiveClaimConditionId();
    }
}
