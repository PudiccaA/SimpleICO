const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-bignumber")(BigNumber))
  .should();

const SimpleToken = artifacts.require("SimpleToken");

contract("SimpleToken", accounts => {
  const _name = "MyTestToken";
  const _symbol = "MTT";
  const _decimals = 18;

  beforeEach(async () => {
    this.token = await SimpleToken.new(_name, _symbol, _decimals);
  });

  describe("token attributes", () => {
    // check if the contracts are deployed successfully
    it("deploys token contract", async () => {
      const address = await this.token.address;
      assert.ok(address);
    });

    it("token has the correct name", async () => {
      const name = await this.token.name();
      assert.equal(name, _name);
    });

    it("token has the correct symbol", async () => {
      const symbol = await this.token.symbol();
      assert.equal(symbol, _symbol);
    });

    it("token has correct decimals", async () => {
      const decimals = await this.token.decimals();
      decimals.should.be.bignumber.equal(_decimals);
    });
  });
});
