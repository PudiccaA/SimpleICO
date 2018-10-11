const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-bignumber")(BigNumber))
  .should();

const SimpleToken = artifacts.require("SimpleToken");
const SimpleCrowdsale = artifacts.require("SimpleCrowdsale");

contract("SimpleCrowdsale", function([_, wallet]) {
  beforeEach(async () => {
    // Token config
    this.name = "SimpleToken";
    this.symbol = "MTT";
    this.decimals = 18;

    // Token deployment
    this.token = await SimpleToken.new(this.name, this.symbol, this.decimals);

    // Crowdsale config
    this.rate = 500;
    this.wallet = wallet;

    // Crowdsale deployment
    this.crowdsale = await SimpleCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address
    );
  });

  describe("simple crowdsale", () => {
    it("tracks the rate", async () => {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.rate);
    });

    it("tracks the wallet", async () => {
      const wallet = await this.crowdsale.wallet();
      wallet.should.equal(this.wallet);
    });

    it("tracks the token", async () => {
      const token = await this.crowdsale.token();
      token.should.equal(this.token.address);
    });
  });
});
