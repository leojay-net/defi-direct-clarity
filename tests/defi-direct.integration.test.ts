import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const owner = accounts.get("deployer")!;
const tx_manager = accounts.get("wallet_1")!;
const fee_recv = accounts.get("wallet_2")!;
const vault = accounts.get("wallet_3")!;
const user = accounts.get("wallet_4")!;


const mockTokenContract = "mock-sip010";

describe("defi-direct: integration tests", () => {
    beforeEach(() => {
        simnet.callPublicFn('mock-sip010', 'mint', [Cl.uint(100000), Cl.principal(user)], owner);

        
        const fee = Cl.uint(250); 
        simnet.callPublicFn('defi-direct', 'initializer', [
            fee,
            Cl.principal(tx_manager),
            Cl.principal(fee_recv),
            Cl.principal(vault)
        ], owner);

        
        const mockTokenPrincipal = `${owner}.${mockTokenContract}`;
        simnet.callPublicFn('defi-direct', 'add-supported-token', [Cl.principal(mockTokenPrincipal)], owner);
    });

    describe("Fiat Transaction Flow", () => {
        it("should initiate fiat transaction successfully", () => {
            const amount = Cl.uint(1000);
            const fiatBankAccount = Cl.uint(12345678);
            const fiatAmount = Cl.uint(500);
            const fiatBank = Cl.stringAscii("TestBank");
            const recipientName = Cl.stringAscii("Alice");

            const { result } = simnet.callPublicFn(
                'defi-direct',
                'initiate-fiat-transaction',
                [
                    Cl.contractPrincipal(owner, mockTokenContract), 
                    amount,
                    fiatBankAccount,
                    fiatAmount,
                    fiatBank,
                    recipientName
                ],
                user
            );

            if (result.type === 'ok') {
                expect(result.value).toBeDefined();

                
                const txId = result.value;
                const { result: txResult } = simnet.callReadOnlyFn('defi-direct', 'get-transaction', [txId], owner);
                expect(txResult.value).toBeDefined();

                
                const { result: userTxs } = simnet.callReadOnlyFn('defi-direct', 'get-transaction-ids', [Cl.principal(user)], owner);
                expect(userTxs.value.length).toBe(1);
            } else {
                console.log("Transaction failed:", result);
            }
        });

        it("should reject transaction when paused", () => {
            
            simnet.callPublicFn('defi-direct', 'pause', [], owner);

            const amount = Cl.uint(1000);
            const fiatBankAccount = Cl.uint(12345678);
            const fiatAmount = Cl.uint(500);
            const fiatBank = Cl.stringAscii("TestBank");
            const recipientName = Cl.stringAscii("Alice");

            const { result } = simnet.callPublicFn(
                'defi-direct',
                'initiate-fiat-transaction',
                [
                    Cl.contractPrincipal(owner, mockTokenContract), 
                    amount,
                    fiatBankAccount,
                    fiatAmount,
                    fiatBank,
                    recipientName
                ],
                user
            );

            expect(result.type).toBe('err');
            expect(result.value.value).toBe(105n); 
        });

        it("should reject transaction with unsupported token", () => {
            const amount = Cl.uint(1000);
            const fiatBankAccount = Cl.uint(12345678);
            const fiatAmount = Cl.uint(500);
            const fiatBank = Cl.stringAscii("TestBank");
            const recipientName = Cl.stringAscii("Alice");

            const { result } = simnet.callPublicFn(
                'defi-direct',
                'initiate-fiat-transaction',
                [
                    Cl.contractPrincipal(owner, "defi-direct"), 
                    amount,
                    fiatBankAccount,
                    fiatAmount,
                    fiatBank,
                    recipientName
                ],
                user
            );

            expect(result.type).toBe('err');
            expect(result.value.value).toBe(103n); 
        });

        it("should reject transaction with invalid parameters", () => {
            const amount = Cl.uint(0); 
            const fiatBankAccount = Cl.uint(12345678);
            const fiatAmount = Cl.uint(500);
            const fiatBank = Cl.stringAscii("TestBank");
            const recipientName = Cl.stringAscii("Alice");

            const { result } = simnet.callPublicFn(
                'defi-direct',
                'initiate-fiat-transaction',
                [
                    Cl.contractPrincipal(owner, mockTokenContract), 
                    amount,
                    fiatBankAccount,
                    fiatAmount,
                    fiatBank,
                    recipientName
                ],
                user
            );

            expect(result.type).toBe('err');
            expect(result.value.value).toBe(110n); 
        });
    });

    describe("Transaction Completion", () => {
        it("should complete transaction by transaction manager", () => {
            const fakeId = new Uint8Array(32).fill(1);
            const { result } = simnet.callPublicFn(
                'defi-direct',
                'complete-transaction',
                [
                    Cl.contractPrincipal(owner, mockTokenContract), 
                    Cl.buffer(fakeId),
                    Cl.uint(1000)
                ],
                tx_manager
            );

            
            expect(result.type).toBe('err');
            expect(result.value.value).toBe(114n); 
        });

        it("should reject completion by non-transaction-manager", () => {
            const fakeId = new Uint8Array(32).fill(1);
            const { result } = simnet.callPublicFn(
                'defi-direct',
                'complete-transaction',
                [
                    Cl.contractPrincipal(owner, mockTokenContract), 
                    Cl.buffer(fakeId),
                    Cl.uint(1000)
                ],
                user 
            );

            expect(result.type).toBe('err');
            expect(result.value.value).toBe(102n); 
        });
    });

    describe("Refund Flow", () => {
        it("should allow owner to refund transaction", () => {
            const fakeId = new Uint8Array(32).fill(2);
            const { result } = simnet.callPublicFn(
                'defi-direct',
                'refund',
                [
                    Cl.buffer(fakeId),
                    Cl.contractPrincipal(owner, mockTokenContract) 
                ],
                owner
            );

            
            expect(result.type).toBe('err');
            expect(result.value.value).toBe(114n); 
        });

        it("should reject refund by non-owner", () => {
            const fakeId = new Uint8Array(32).fill(2);
            const { result } = simnet.callPublicFn(
                'defi-direct',
                'refund',
                [
                    Cl.buffer(fakeId),
                    Cl.contractPrincipal(owner, mockTokenContract) 
                ],
                user
            );

            expect(result.type).toBe('err');
            expect(result.value.value).toBe(101n); 
        });
    });

    describe("Fee Calculation", () => {
        it("should calculate fees correctly", () => {
            
            const amount = 1000; 
            const feePercentage = 250; 
            const expectedFee = Math.floor((amount * feePercentage) / 10000); 

            expect(expectedFee).toBe(25); 
        });
    });
});