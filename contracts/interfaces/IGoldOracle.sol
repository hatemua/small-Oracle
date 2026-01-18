// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGoldOracle
 * @notice Interface for the Gold Price Oracle
 * @dev This interface can be imported by other contracts to interact with the oracle
 */
interface IGoldOracle {
    /**
     * @notice Struct containing all gold price data
     * @param pricePerGram Price per gram in USD (8 decimals)
     * @param pricePerOunce Price per ounce in USD (8 decimals)
     * @param pricePerKarat24 Price per gram for 24K gold in USD (8 decimals)
     * @param pricePerKarat22 Price per gram for 22K gold in USD (8 decimals)
     * @param pricePerKarat18 Price per gram for 18K gold in USD (8 decimals)
     * @param lastUpdated Timestamp of last price update
     */
    struct PriceData {
        uint256 pricePerGram;
        uint256 pricePerOunce;
        uint256 pricePerKarat24;
        uint256 pricePerKarat22;
        uint256 pricePerKarat18;
        uint256 lastUpdated;
    }

    /**
     * @notice Emitted when prices are updated
     */
    event PricesUpdated(
        uint256 gram,
        uint256 ounce,
        uint256 k24,
        uint256 k22,
        uint256 k18,
        uint256 timestamp
    );

    /**
     * @notice Emitted when ownership is transferred
     */
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @notice Get the current gold price per gram
     * @return Price per gram in USD (8 decimals)
     */
    function getGoldPricePerGram() external view returns (uint256);

    /**
     * @notice Get the current gold price per ounce
     * @return Price per ounce in USD (8 decimals)
     */
    function getGoldPricePerOunce() external view returns (uint256);

    /**
     * @notice Get the current gold price by karat
     * @param karat The karat value (18, 22, or 24)
     * @return Price per gram for specified karat in USD (8 decimals)
     */
    function getGoldPriceByKarat(uint8 karat) external view returns (uint256);

    /**
     * @notice Get all current gold prices
     * @return PriceData struct containing all price information
     */
    function getAllPrices() external view returns (PriceData memory);

    /**
     * @notice Get the timestamp of the last price update
     * @return Timestamp of last update
     */
    function getLastUpdated() external view returns (uint256);

    /**
     * @notice Check if the price data is stale
     * @return true if data is older than STALENESS_THRESHOLD, false otherwise
     */
    function isStale() external view returns (bool);
}
