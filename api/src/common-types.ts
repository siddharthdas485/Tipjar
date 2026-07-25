// SPDX-License-Identifier: Apache-2.0

import { type MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { type FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { TipJarPrivateState, Contract, Witnesses } from "../../contract/src/index.js";

export const tipjarPrivateStateKey = "tipjarPrivateState";
export type PrivateStateId = typeof tipjarPrivateStateKey;

export type PrivateStates = {
  readonly tipjarPrivateState: TipJarPrivateState;
};

export type TipJarContract = Contract<TipJarPrivateState, Witnesses<TipJarPrivateState>>;

export type TipJarCircuitKeys = Exclude<keyof TipJarContract["impureCircuits"], number | symbol>;

export type TipJarProviders = MidnightProviders<TipJarCircuitKeys, PrivateStateId, TipJarPrivateState>;

export type DeployedTipJarContract = FoundContract<TipJarContract>;

export type TipJarDerivedState = {
  readonly totalTips: bigint;
  readonly isActive: boolean;
  readonly sequence: bigint;
  readonly isOwner: boolean;
};
