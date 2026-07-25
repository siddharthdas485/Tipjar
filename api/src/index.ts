// SPDX-License-Identifier: Apache-2.0

import * as TipJar from "../../contract/src/managed/tipjar/contract/index.js";
import { type ContractAddress, convertFieldToBytes } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { type Logger } from "pino";
import {
  type TipJarDerivedState,
  type TipJarContract,
  type TipJarProviders,
  type DeployedTipJarContract,
  tipjarPrivateStateKey,
} from "./common-types.js";
import { CompiledTipJarContractContract } from "../../contract/src/index.js";
import * as utils from "./utils/index.js";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { combineLatest, map, tap, from, type Observable } from "rxjs";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { TipJarPrivateState, createTipJarPrivateState } from "../../contract/src/witnesses.js";

/** Default contract address placeholder before manual deployment */
export const DEFAULT_CONTRACT_ADDRESS: ContractAddress = "<YOUR_DEPLOYED_CONTRACT_ADDRESS>";

export interface DeployedTipJarAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<TipJarDerivedState>;

  tip: (message: string) => Promise<void>;
  withdraw: () => Promise<void>;
}

export class TipJarAPI implements DeployedTipJarAPI {
  private constructor(
    public readonly deployedContract: DeployedTipJarContract,
    providers: TipJarProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: "latest" }).pipe(
          map((contractState) => TipJar.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  totalTips: ledgerState.total_tips,
                  isActive: ledgerState.is_active,
                  owner: toHex(ledgerState.owner),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(tipjarPrivateStateKey) as Promise<TipJarPrivateState>),
      ],
      (ledgerState, privateState) => {
        const hashedSecretKey = TipJar.pureCircuits.ownerKey(
          privateState.secretKey,
          convertFieldToBytes(32, ledgerState.sequence, "api/src/index.ts"),
        );

        return {
          totalTips: ledgerState.total_tips,
          isActive: ledgerState.is_active,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.owner) === toHex(hashedSecretKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<TipJarDerivedState>;

  async tip(message: string): Promise<void> {
    this.logger?.info(`sendingTipMessage: ${message}`);
    const txData = await this.deployedContract.callTx.tip(message);
    this.logger?.trace({
      transactionAdded: {
        circuit: "tip",
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async withdraw(): Promise<void> {
    this.logger?.info("withdrawingTipJar");
    const txData = await this.deployedContract.callTx.withdraw();
    this.logger?.trace({
      transactionAdded: {
        circuit: "withdraw",
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: TipJarProviders, logger?: Logger): Promise<TipJarAPI> {
    logger?.info("deployingTipJarContract");
    const deployedTipJarContract = await deployContract(providers, {
      compiledContract: CompiledTipJarContractContract,
      privateStateId: tipjarPrivateStateKey,
      initialPrivateState: createTipJarPrivateState(utils.randomBytes(32)),
    });
    return new TipJarAPI(deployedTipJarContract, providers, logger);
  }

  static async join(providers: TipJarProviders, contractAddress: ContractAddress, logger?: Logger): Promise<TipJarAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedTipJarContract = await findDeployedContract<TipJarContract>(providers, {
      contractAddress,
      compiledContract: CompiledTipJarContractContract,
      privateStateId: tipjarPrivateStateKey,
      initialPrivateState: await TipJarAPI.getPrivateState(providers, contractAddress),
    });
    return new TipJarAPI(deployedTipJarContract, providers, logger);
  }

  private static async getPrivateState(
    providers: TipJarProviders,
    contractAddress: ContractAddress,
  ): Promise<TipJarPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(tipjarPrivateStateKey);
    return existingPrivateState ?? createTipJarPrivateState(utils.randomBytes(32));
  }
}

export * as utils from "./utils/index.js";
export * from "./common-types.js";
