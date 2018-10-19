var SimpleCrowdsale = artifacts.require("./SimpleCrowdsale.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleCrowdsale);
};
