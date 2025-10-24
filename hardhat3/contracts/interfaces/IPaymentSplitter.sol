// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPaymentSplitter {
    event PaymentProcessed(
        address indexed payer,
        address indexed listener,
        uint256 amount,
        uint256 extensionTimeSeconds
    );
    
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    function payAndSplit(
        uint256 amount,
        address listener,
        uint256 extensionTimeSeconds
    ) external;

    function setTreasury(address newTreasury) external;
    
    function treasury() external view returns (address);
}