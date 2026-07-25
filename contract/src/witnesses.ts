// SPDX-License-Identifier: Apache-2.0

import { Ledger } from "./managed/tipjar/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type TipJarPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createTipJarPrivateState = (secretKey: Uint8Array): TipJarPrivateState => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, TipJarPrivateState>): [
    TipJarPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
