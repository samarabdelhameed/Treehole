// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {TestToken} from "../src/TestToken.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy TestToken
        TestToken token = new TestToken();
        console.log("TestToken deployed at:", address(token));
        
        // Deploy PaymentSplitter (treasury only)
        PaymentSplitter splitter = new PaymentSplitter(treasury);
        console.log("PaymentSplitter deployed at:", address(splitter));
        
        vm.stopBroadcast();
    }
}