const chai = require("chai");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const expect = chai.expect;
chai.use(bnChai(BN));

const { ZERO_ADDRESS } = require("./helpers/constants");
const abiDecoder = require("abi-decoder");

const Exchange = artifacts.require("Exchange");

let sender;

contract("Exchange", accounts => {
  beforeEach(async () => {
    sender = await Exchange.new();
    await sender.addNewToken(
      web3.utils.fromAscii("OPEN"),
      "0x69c4bb240cf05d51eeab6985bab35527d04a8c64"
    );
  });

  describe("contract management", () => {
    it("should add new supported token", async () => {
      let address = await sender.tokens.call(web3.utils.fromAscii("OPEN"));
      expect(address.toLowerCase()).to.eql(
        "0x69c4bb240cf05d51eeab6985bab35527d04a8c64".toLowerCase()
      );
    });

    it("should update supported token address", async () => {
      await sender.addNewToken(
        web3.utils.fromAscii("OPEN"),
        "0x69c4bb240cf05d51eeab6985bab35527d04a8c64"
      );

      let address = await sender.tokens.call(web3.utils.fromAscii("OPEN"));

      expect(address.toLowerCase()).to.eql(
        "0x69c4bb240cf05d51eeab6985bab35527d04a8c64".toLowerCase()
      );
    });

    it("should remove unused supported token address", async () => {
      await sender.removeToken(web3.utils.fromAscii("OPEN"));

      let address = await sender.tokens.call(web3.utils.fromAscii("OPEN"));
      expect(address.toLowerCase()).to.eql(
        "0x0000000000000000000000000000000000000000".toLowerCase()
      );
    });
  });
});
