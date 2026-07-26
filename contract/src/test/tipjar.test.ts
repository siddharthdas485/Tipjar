// SPDX-License-Identifier: Apache-2.0

import { TipJarSimulator } from "./tipjar-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("TipJar smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new TipJarSimulator(key);
    const simulator1 = new TipJarSimulator(key);
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const key = randomBytes(32);
    const simulator = new TipJarSimulator(key);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.total_tips).toEqual(0n);
    expect(initialLedgerState.is_active).toEqual(true);
    expect(initialLedgerState.sequence).toEqual(1n);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secretKey: key });
  });

  it("allows setting owner via initialize", () => {
    const key = randomBytes(32);
    const simulator = new TipJarSimulator(key);
    simulator.initialize();
    const ledgerState = simulator.getLedger();
    expect(ledgerState.owner).toEqual(simulator.ownerKey());
  });

  it("allows sending tips", () => {
    const key = randomBytes(32);
    const simulator = new TipJarSimulator(key);
    simulator.initialize();
    simulator.tip("Great work on Midnight Network!");
    const ledgerState = simulator.getLedger();
    expect(ledgerState.total_tips).toEqual(1n);
  });

  it("allows owner to withdraw and close tip jar", () => {
    const key = randomBytes(32);
    const simulator = new TipJarSimulator(key);
    simulator.initialize();
    simulator.tip("Thanks for building this!");
    simulator.withdraw();
    const ledgerState = simulator.getLedger();
    expect(ledgerState.is_active).toEqual(false);
  });
});
