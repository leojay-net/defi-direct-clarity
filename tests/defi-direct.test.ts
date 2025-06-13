
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";
import { assert } from "console";

const accounts = simnet.getAccounts();
const owner = accounts.get("wallet_1")!;
const tx_manager = accounts.get("wallet_2")!;
const fee_recv = accounts.get("wallet_3")!;
const vault = accounts.get("wallet_4")!;


/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/stacks/clarinet-js-sdk
*/

describe("example tests", () => {
  it("ensures simnet is well initialised", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  // it("shows an example", () => {
  //   const { result } = simnet.callReadOnlyFn("counter", "get-counter", [], address1);
  //   expect(result).toBeUint(0);
  // });
});

describe('initialization', () => {
  it('should initialize the contract successfully', () => {
    const fee = Cl.uint(100);
    const { result } = simnet.callPublicFn('defi-direct', 'initializer', [fee, Cl.principal(tx_manager), Cl.principal(fee_recv), Cl.principal(vault)], owner);
    expect(result).toBeDefined();
    console.log(result)

  });
});
