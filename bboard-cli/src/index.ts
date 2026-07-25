// SPDX-License-Identifier: Apache-2.0

import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { WebSocket } from "ws";
import {
  TipJarAPI,
  type TipJarDerivedState,
  tipjarPrivateStateKey,
  type TipJarProviders,
  type DeployedTipJarContract,
  type PrivateStateId,
} from "../../api/src/index.js";
import { type WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { ledger, type Ledger } from "../../contract/src/managed/tipjar/contract/index.js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { type Logger } from "pino";
import { type Config, StandaloneConfig } from "./config.js";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { type ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { assertIsContractAddress, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { TestEnvironment } from "@midnight-ntwrk/testkit-js";
import { MidnightWalletProvider } from "./midnight-wallet-provider.js";
import { randomBytes } from "../../api/src/utils/index.js";
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { syncWallet, waitForUnshieldedFunds } from "./wallet-utils.js";
import { generateDust } from "./generate-dust.js";
import { TipJarPrivateState } from "../../contract/src/witnesses.js";

// @ts-expect-error: WebSocket usage
globalThis.WebSocket = WebSocket;

export const getTipJarLedgerState = async (
  providers: TipJarProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new Tip Jar contract
  2. Join an existing Tip Jar contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (providers: TipJarProviders, rli: Interface, logger: Logger): Promise<TipJarAPI | null> => {
  let api: TipJarAPI | null = null;
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case "1":
        api = await TipJarAPI.deploy(providers, logger);
        logger.info(`Deployed TipJar contract at address: ${api.deployedContractAddress}`);
        return api;
      case "2":
        api = await TipJarAPI.join(providers, await rli.question("What is the contract address (in hex)? "), logger);
        logger.info(`Joined TipJar contract at address: ${api.deployedContractAddress}`);
        return api;
      case "3":
        logger.info("Exiting...");
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: TipJarProviders,
  deployedTipJarContract: DeployedTipJarContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedTipJarContract.deployTxData.public.contractAddress;
  const ledgerState = await getTipJarLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no TipJar contract deployed at ${contractAddress}`);
  } else {
    logger.info(`Total tips received: ${ledgerState.total_tips}`);
    logger.info(`Jar status active: ${ledgerState.is_active}`);
    logger.info(`Current sequence: ${ledgerState.sequence}`);
    logger.info(`Current owner commitment: '${toHex(ledgerState.owner)}'`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Send a tip (with note)
  2. Withdraw / close jar (owner only)
  3. Display current ledger state (public)
  4. Display current private state (local secret key)
  5. Exit
Which would you like to do? `;

const mainLoop = async (providers: TipJarProviders, rli: Interface, logger: Logger): Promise<void> => {
  const tipjarApi = await deployOrJoin(providers, rli, logger);
  if (tipjarApi === null) {
    return;
  }
  let currentState: TipJarDerivedState | undefined;
  const stateObserver = {
    next: (state: TipJarDerivedState) => (currentState = state),
  };
  const subscription = tipjarApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case "1": {
            const message = await rli.question(`Enter your tip message / note: `);
            await tipjarApi.tip(message);
            logger.info("Tip sent successfully!");
            break;
          }
          case "2":
            await tipjarApi.withdraw();
            logger.info("Withdrawal completed!");
            break;
          case "3":
            await displayLedgerState(providers, tipjarApi.deployedContract, logger);
            break;
          case "4": {
            const privateState = await providers.privateStateProvider.get(tipjarPrivateStateKey);
            if (privateState === null) {
              logger.info(`No existing TipJar private state`);
            } else {
              logger.info(`Current secret key: ${toHex(privateState.secretKey)}`);
            }
            break;
          }
          case "5":
            logger.info("Exiting...");
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info("Returning to main menu...");
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case "1":
        return toHex(randomBytes(32));
      case "2":
        return await rli.question("Enter your wallet seed: ");
      case "3":
        logger.info("Exiting...");
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info("No funds received, exiting...");
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<"tip" | "withdraw">(config.zkConfigPath);
    const providers: TipJarProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, TipJarPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => "TipJar-Test-2026!",
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info("Exiting...");
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info("Stopping wallet...");
          await wallet.stop();
        }
        if (testEnv) {
          logger.info("Stopping test environment...");
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
