// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TestToken} from "../src/TestToken.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";

contract DeployScript is Script {
    // Default treasury for local deployments; override via env if needed
    address public constant DEFAULT_TREASURY = address(0xBabeDeadF00d);
    
    function getTreasuryAddress() internal view returns (address) {
        // Try to get treasury from environment variable
        try vm.envAddress("TREASURY_ADDRESS") returns (address treasury) {
            require(treasury != address(0), "Treasury address cannot be zero");
            return treasury;
        } catch {
            return DEFAULT_TREASURY;
        }
    }

    function run() public returns (TestToken token, PaymentSplitter splitter) {
        address treasuryAddress = getTreasuryAddress();
        
        vm.startBroadcast();

        token = new TestToken();
        console2.log("--- Token Contract Deployed ---");
        console2.log("TestToken Address:", address(token));

        splitter = new PaymentSplitter(treasuryAddress);
        console2.log("--- Splitter Contract Deployed ---");
        console2.log("PaymentSplitter Address:", address(splitter));
        console2.log("Treasury Address:", treasuryAddress);

        vm.stopBroadcast();
    }
}
