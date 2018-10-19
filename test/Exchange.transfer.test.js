const chai = require("chai");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const expect = chai.expect;
chai.use(bnChai(BN));

const { ZERO_ADDRESS } = require("./helpers/constants");
const abiDecoder = require("abi-decoder");

const Exchange = artifacts.require("Exchange");
const SPToken = artifacts.require("SPToken");
const SPGToken = artifacts.require("SPGToken");

let sender, spt, sptg;

contract("Exchange Transfer", async accounts => {
  let accountA, accountB, accountC, accountD;

  [accountA, accountB, accountC, accountD] = accounts;

  beforeEach(async () => {
    // Create and deploy contracts
    sender = await Exchange.new();
    spt = await SPToken.new();
    sptg = await SPGToken.new();

    // add tokens to the exchange
    await sender.addNewToken(web3.utils.fromAscii("SPTK"), spt.address);
    await sender.addNewToken(web3.utils.fromAscii("SPTKG"), sptg.address);
  });

  describe("contract management", () => {
    it("should transfer sender token to another wallet", async () => {
      // specify amount to transfer
      let amount = new BN(50000e5);

      // approve exchange to spend token spt
      await spt.approve(sender.address, amount, { from: accountA });

      // transfer 'amount' of SPTK (spt) to accountB
      await sender.transferTokens(
        web3.utils.fromAscii("SPTK"),
        accountB,
        amount,
        { from: accountA }
      );

      // check the balance of SPT on accountB
      let balance = (await spt.balanceOf(accountB)).toString();

      expect(balance).to.eql(amount.toString());

      console.log("address - accountA: %o", accountA);

      const ownerSpt = await spt.owner();
      const ownerSptg = await sptg.owner();
      const ownerSender = await sender.owner();

      console.log("address - owner of spt: %o", ownerSpt);
      console.log("address - owner of sptg: %o", ownerSptg);
      console.log("address - owner of exchange: %o", ownerSender);
    });
  });
});
