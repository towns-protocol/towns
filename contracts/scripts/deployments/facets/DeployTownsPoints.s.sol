// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

//libraries
import "forge-std/console.sol";

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TownsPoints} from "contracts/src/airdrop/points/TownsPoints.sol";

contract DeployTownsPoints is Deployer, FacetHelper {
    // FacetHelper
    constructor() {
        addSelector(TownsPoints.mint.selector);
        addSelector(TownsPoints.batchMintPoints.selector);
        addSelector(TownsPoints.getPoints.selector);
        addSelector(TownsPoints.balanceOf.selector);
        addSelector(TownsPoints.totalSupply.selector);
        addSelector(TownsPoints.name.selector);
        addSelector(TownsPoints.symbol.selector);
        addSelector(TownsPoints.decimals.selector);

        // CheckIn
        addSelector(TownsPoints.checkIn.selector);
        addSelector(TownsPoints.getCurrentStreak.selector);
        addSelector(TownsPoints.getLastCheckIn.selector);
    }

    // Deploying
    function versionName() public pure override returns (string memory) {
        return "facets/pointsFacet";
    }

    function initializer() public pure override returns (bytes4) {
        return TownsPoints.__TownsPoints_init.selector;
    }

    function makeInitData(address spaceFactory) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), spaceFactory);
    }

    function facetInitHelper(
        address deployer,
        address facetAddress
    ) external override returns (FacetCut memory, bytes memory) {
        IDiamond.FacetCut memory facetCut = this.makeCut(facetAddress, IDiamond.FacetCutAction.Add);
        console.log("facetInitHelper: deployer", deployer);
        return (facetCut, makeInitData(getDeployment("spaceFactory")));
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        TownsPoints riverPointsFacet = new TownsPoints();
        vm.stopBroadcast();
        return address(riverPointsFacet);
    }
}
