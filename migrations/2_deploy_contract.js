var SimpleToken = artifacts.require("./SimpleToken.sol");

module.exports = function(deployer) {
  const _name = "MyTestToken";
  const _symbol = "MTT";
  const _decimals = 18;

  deployer.deploy(SimpleToken, _name, _symbol, _decimals);
};
