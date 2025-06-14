import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const owner = accounts.get("deployer")!;
const tx_manager = accounts.get("wallet_1")!;
const fee_recv = accounts.get("wallet_2")!;
const vault = accounts.get("wallet_3")!;
const user = accounts.get("wallet_4")!;

describe("defi-direct: unit tests", () => {
  beforeEach(() => {
    const fee = Cl.uint(100);
    simnet.callPublicFn('defi-direct', 'initializer', [
      fee, 
      Cl.principal(tx_manager), 
      Cl.principal(fee_recv), 
      Cl.principal(vault)
    ], owner);
  });

  describe("Initialization", () => {
    it("should initialize the contract successfully", () => {
      const fee = Cl.uint(250);
      const { result } = simnet.callPublicFn('defi-direct', 'initializer', [
        fee, 
        Cl.principal(tx_manager), 
        Cl.principal(fee_recv), 
        Cl.principal(vault)
      ], owner);
      
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');

      // Verify fee was set
      const { result: feeResult } = simnet.callReadOnlyFn('defi-direct', 'get-spread-fee-percentage', [], owner);
      expect(feeResult.value).toBe(250n);

      // Verify transaction manager was set
      const { result: txManagerResult } = simnet.callReadOnlyFn('defi-direct', 'get-transaction-manager', [], owner);
      expect(txManagerResult.value.value).toBe(tx_manager);
    });

    it("should reject initialization with fee too high", () => {
      const highFee = Cl.uint(600); // MAX_FEE is 500
      const { result } = simnet.callPublicFn('defi-direct', 'initializer', [
        highFee, 
        Cl.principal(tx_manager), 
        Cl.principal(fee_recv), 
        Cl.principal(vault)
      ], owner);
      
      expect(result.type).toBe('err');
      expect(result.value.value).toBe(100n); // err-fee-too-high
    });

    it("should reject initialization by non-owner", () => {
      const fee = Cl.uint(100);
      const { result } = simnet.callPublicFn('defi-direct', 'initializer', [
        fee, 
        Cl.principal(tx_manager), 
        Cl.principal(fee_recv), 
        Cl.principal(vault)
      ], user);
      
      expect(result.type).toBe('err');
      expect(result.value.value).toBe(101n); // err-not-owner
    });
  });

  describe("Pause/Unpause", () => {
    it("should allow the owner to pause and unpause", () => {
      // Pause
      let { result } = simnet.callPublicFn('defi-direct', 'pause', [], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');
      
      let { result: paused } = simnet.callReadOnlyFn('defi-direct', 'is-paused', [], owner);
      expect(paused.type).toBe('true');

      // Unpause
      ({ result } = simnet.callPublicFn('defi-direct', 'unpause', [], owner));
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');
      
      ({ result: paused } = simnet.callReadOnlyFn('defi-direct', 'is-paused', [], owner));
      expect(paused.type).toBe('false');
    });

    it("should not allow non-owner to pause", () => {
      const { result } = simnet.callPublicFn('defi-direct', 'pause', [], tx_manager);
      expect(result.type).toBe('err');
      expect(result.value.value).toBe(101n); // err-not-owner
    });
  });

  describe("Token Management", () => {
    it("should add and remove supported tokens", () => {
      const token = owner; // Use owner address as token for testing
      
      // Add token
      let { result } = simnet.callPublicFn('defi-direct', 'add-supported-token', [Cl.principal(token)], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');
      
      let { result: supported } = simnet.callReadOnlyFn('defi-direct', 'is-token-supported', [Cl.principal(token)], owner);
      expect(supported.type).toBe('true');

      // Remove token
      ({ result } = simnet.callPublicFn('defi-direct', 'remove-supported-token', [Cl.principal(token)], owner));
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');
      
      ({ result: supported } = simnet.callReadOnlyFn('defi-direct', 'is-token-supported', [Cl.principal(token)], owner));
      expect(supported.type).toBe('false');
    });

    it("should not allow non-owner to add tokens", () => {
      const token = owner;
      const { result } = simnet.callPublicFn('defi-direct', 'add-supported-token', [Cl.principal(token)], user);
      expect(result.type).toBe('err');
      expect(result.value.value).toBe(101n); // err-not-owner
    });
  });

  describe("Fee Management", () => {
    it("should update spread fee", () => {
      const newFee = Cl.uint(200);
      const { result } = simnet.callPublicFn('defi-direct', 'update-spread-fee', [newFee], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');

      const { result: feeResult } = simnet.callReadOnlyFn('defi-direct', 'get-spread-fee-percentage', [], owner);
      expect(feeResult.value).toBe(200n);
    });

    it("should reject fee update if too high", () => {
      const highFee = Cl.uint(600);
      const { result } = simnet.callPublicFn('defi-direct', 'update-spread-fee', [highFee], owner);
      expect(result.type).toBe('err');
      expect(result.value.value).toBe(100n); // err-fee-too-high
    });
  });

  describe("Address Management", () => {
    it("should set fee receiver", () => {
      const newFeeReceiver = user;
      const { result } = simnet.callPublicFn('defi-direct', 'set-fee-receiver', [Cl.principal(newFeeReceiver)], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');

      const { result: receiverResult } = simnet.callReadOnlyFn('defi-direct', 'get-fee-receiver', [], owner);
      expect(receiverResult.value.value).toBe(newFeeReceiver);
    });

    it("should set vault address", () => {
      const newVault = user;
      const { result } = simnet.callPublicFn('defi-direct', 'set-vault-address', [Cl.principal(newVault)], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');

      const { result: vaultResult } = simnet.callReadOnlyFn('defi-direct', 'get-vault-address', [], owner);
      expect(vaultResult.value.value).toBe(newVault);
    });

    it("should set transaction manager", () => {
      const newTxManager = user;
      const { result } = simnet.callPublicFn('defi-direct', 'set-transaction-manager', [Cl.principal(newTxManager)], owner);
      expect(result.type).toBe('ok');
      expect(result.value.type).toBe('true');

      const { result: managerResult } = simnet.callReadOnlyFn('defi-direct', 'get-transaction-manager', [], owner);
      expect(managerResult.value.value).toBe(newTxManager);
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct owner", () => {
      const { result } = simnet.callReadOnlyFn('defi-direct', 'get-owner', [], owner);
      expect(result.value).toBe(owner);
    });

    it("should return empty transaction list for new user", () => {
      const { result } = simnet.callReadOnlyFn('defi-direct', 'get-transaction-ids', [Cl.principal(user)], owner);
      expect(result.value).toEqual([]);
    });

    it("should return none for non-existent transaction", () => {
      const fakeId = new Uint8Array(32).fill(0);
      const { result } = simnet.callReadOnlyFn('defi-direct', 'get-transaction', [Cl.buffer(fakeId)], owner);
      console.log(result)
      expect(result.type).toBe("none");
    });
  });
});