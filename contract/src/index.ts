// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/tipjar/contract/index.js";
export * from "./witnesses.js";

import * as CompiledTipJarContract from "./managed/tipjar/contract/index.js";
import * as Witnesses from "./witnesses.js";

export const CompiledTipJarContractContract = CompiledContract.make<
  CompiledTipJarContract.Contract<Witnesses.TipJarPrivateState>
>("TipJar", CompiledTipJarContract.Contract<Witnesses.TipJarPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/tipjar"),
);
