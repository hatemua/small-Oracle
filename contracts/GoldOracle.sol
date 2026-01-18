// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGoldOracle.sol";

/**
 * @title GoldOracle
 * @notice Oracle contract for gold prices from GoldAPI.io
 * @dev Stores gold prices in various formats and allows authorized updates
 */
contract GoldOracle is IGoldOracle {
    // Constants
    uint8 public constant DECIMALS = 8;
    uint256 public constant STALENESS_THRESHOLD = 1 hours;

    // State variables
    uint256 public pricePerGram;        // USD price per gram (8 decimals)
    uint256 public pricePerOunce;       // USD price per ounce (8 decimals)
    uint256 public pricePerKarat24;     // USD price per gram for 24K gold (8 decimals)
    uint256 public pricePerKarat22;     // USD price per gram for 22K gold (8 decimals)
    uint256 public pricePerKarat18;     // USD price per gram for 18K gold (8 decimals)
    uint256 public lastUpdated;         // Timestamp of last update
    address public owner;               // Contract owner

    /**
     * @notice Modifier to restrict function access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "GoldOracle: caller is not the owner");
        _;
    }

    /**
     * @notice Constructor sets the deployer as the owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Update all gold prices
     * @dev Only owner can call this function
     * @param _gram Price per gram in USD (8 decimals)
     * @param _ounce Price per ounce in USD (8 decimals)
     * @param _k24 Price per gram for 24K gold in USD (8 decimals)
     * @param _k22 Price per gram for 22K gold in USD (8 decimals)
     * @param _k18 Price per gram for 18K gold in USD (8 decimals)
     */
    function updatePrices(
        uint256 _gram,
        uint256 _ounce,
        uint256 _k24,
        uint256 _k22,
        uint256 _k18
    ) external onlyOwner {
        require(_gram > 0, "GoldOracle: invalid gram price");
        require(_ounce > 0, "GoldOracle: invalid ounce price");
        require(_k24 > 0, "GoldOracle: invalid 24K price");
        require(_k22 > 0, "GoldOracle: invalid 22K price");
        require(_k18 > 0, "GoldOracle: invalid 18K price");

        pricePerGram = _gram;
        pricePerOunce = _ounce;
        pricePerKarat24 = _k24;
        pricePerKarat22 = _k22;
        pricePerKarat18 = _k18;
        lastUpdated = block.timestamp;

        emit PricesUpdated(_gram, _ounce, _k24, _k22, _k18, block.timestamp);
    }

    /**
     * @notice Get the current gold price per gram
     * @return Price per gram in USD (8 decimals)
     */
    function getGoldPricePerGram() external view returns (uint256) {
        return pricePerGram;
    }

    /**
     * @notice Get the current gold price per ounce
     * @return Price per ounce in USD (8 decimals)
     */
    function getGoldPricePerOunce() external view returns (uint256) {
        return pricePerOunce;
    }

    /**
     * @notice Get the current gold price by karat
     * @param karat The karat value (18, 22, or 24)
     * @return Price per gram for specified karat in USD (8 decimals)
     */
    function getGoldPriceByKarat(uint8 karat) external view returns (uint256) {
        if (karat == 24) {
            return pricePerKarat24;
        } else if (karat == 22) {
            return pricePerKarat22;
        } else if (karat == 18) {
            return pricePerKarat18;
        } else {
            revert("GoldOracle: invalid karat (must be 18, 22, or 24)");
        }
    }

    /**
     * @notice Get all current gold prices
     * @return PriceData struct containing all price information
     */
    function getAllPrices() external view returns (PriceData memory) {
        return PriceData({
            pricePerGram: pricePerGram,
            pricePerOunce: pricePerOunce,
            pricePerKarat24: pricePerKarat24,
            pricePerKarat22: pricePerKarat22,
            pricePerKarat18: pricePerKarat18,
            lastUpdated: lastUpdated
        });
    }

    /**
     * @notice Get the timestamp of the last price update
     * @return Timestamp of last update
     */
    function getLastUpdated() external view returns (uint256) {
        return lastUpdated;
    }

    /**
     * @notice Check if the price data is stale
     * @return true if data is older than STALENESS_THRESHOLD, false otherwise
     */
    function isStale() public view returns (bool) {
        if (lastUpdated == 0) {
            return true;
        }
        return (block.timestamp - lastUpdated) > STALENESS_THRESHOLD;
    }

    /**
     * @notice Transfer ownership of the contract
     * @dev Only owner can call this function
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "GoldOracle: new owner is the zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
