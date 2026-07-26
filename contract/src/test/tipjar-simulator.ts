// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  convertFieldToBytes,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/tipjar/contract/index.js";
import { type TipJarPrivateState, witnesses } from "../witnesses.js";

export class TipJarSimulator {
  readonly contract: Contract<TipJarPrivateState>;
  circuitContext: CircuitContext<TipJarPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<TipJarPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey }, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = { secretKey };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): TipJarPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public initialize(): Ledger {
    this.circuitContext = this.contract.impureCircuits.initialize(this.circuitContext).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public tip(message: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.tip(this.circuitContext, message).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public withdraw(): Ledger {
    this.circuitContext = this.contract.impureCircuits.withdraw(this.circuitContext).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public ownerKey(): Uint8Array {
    const sequence = convertFieldToBytes(
      32,
      this.getLedger().sequence,
      "tipjar-simulator.ts",
    );
    return this.contract.circuits.ownerKey(
      this.circuitContext,
      this.getPrivateState().secretKey,
      sequence,
    ).result;
  }
}
