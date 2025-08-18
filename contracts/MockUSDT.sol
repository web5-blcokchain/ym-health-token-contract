// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals = 6; // USDT has 6 decimals
    
    constructor(address initialOwner) ERC20("Mock USDT", "USDT") Ownable(initialOwner) {}
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    // Mint function for owner - unlimited minting
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    // Batch mint function for owner
    function batchMint(address[] memory recipients, uint256[] memory amounts) public onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        for (uint i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    // Emergency mint function for testing purposes
    function emergencyMint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
