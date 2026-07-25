# TipJar — Midnight Privacy-Preserving Tip Jar DApp

A privacy-preserving, zero-knowledge decentralized tip jar application built on the Midnight Network.

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

## Features

- **Anonymous Tipping**: Send tip messages without revealing your wallet address or identity on-chain.
- **Zero-Knowledge Proof of Ownership**: Only the jar owner can withdraw tips and close the jar, verified off-chain via zero-knowledge proofs.
- **Publicly Verifiable Tip Stats**: The total tip count and jar status remain publicly visible and auditably transparent on the Midnight ledger.
- **Full-Stack Integration**: Complete React SPA frontend with Lace Wallet integration, standalone TypeScript API, and interactive CLI.

## What This Project Does

TipJar allows creators, developers, and open-source maintainers to accept anonymous tips from supporters. Supporters can attach custom messages to their tips without fear of doxxing their identities. The jar owner can withdraw accumulated tips at any time by generating a zero-knowledge proof proving ownership of the secret key that matches the public owner commitment stored on-chain.

## Privacy Model

### Public Information (On-Chain)
- `total_tips`: The aggregate count of tips submitted to the jar.
- `owner`: A 32-byte hash commitment of the jar owner's public key (derived from a local secret key and sequence counter).
- `is_active`: A boolean flag indicating whether the tip jar is currently open for tips.
- `sequence`: A ledger sequence counter to ensure key freshness and prevent replay attacks.

### Private Information (Stays Local on Device)
- `localSecretKey`: The 32-byte secret key stored exclusively in local private state. It is never transmitted across the network or stored on-chain.

### What Users Prove Without Revealing
- **Tippers**: Prove that the contract is active and validly execute state transitions without revealing any identifying metadata or account address.
- **Jar Owner**: Proves ownership of `localSecretKey` such that `ownerKey(localSecretKey, sequence)` equals the stored `owner` commitment on the ledger — without ever disclosing `localSecretKey`.

## Tech Stack

- **Smart Contract**: Compact (Midnight DSL for Zero-Knowledge Smart Contracts)
- **Zero-Knowledge Toolchain**: Compact Compiler v0.31.1, Midnight Proof Server
- **Frontend UI**: React 19, TypeScript, Material-UI (MUI), Vite
- **API & Client Layer**: RxJS, Pino, `@midnight-ntwrk/midnight-js`
- **CLI**: Node.js interactive CLI (`@midnight-ntwrk/tipjar-cli`)
- **Wallet**: Midnight Lace Wallet Connector API

## Folder Structure

```
c:\demo midnight\
├── contract/            # Compact smart contract source (tipjar.compact) & compiled outputs
│   └── src/
│       ├── tipjar.compact
│       ├── index.ts
│       └── witnesses.ts
├── api/                 # TypeScript API abstraction layer for TipJar interaction
│   └── src/
│       ├── common-types.ts
│       ├── index.ts
│       └── utils/
├── bboard-ui/           # React Single Page Application (Web Frontend)
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       └── contexts/
├── bboard-cli/          # Command Line Interface (CLI Tool)
├── deploy.ts            # Deployment script entry point
├── package.json         # Workspace root configuration
└── README.md            # Project documentation
```

## Prerequisites

- **Node.js**: v22.x or v24.x
- **Docker**: Installed and running (for local Midnight Proof Server)
- **Compact Compiler**: `compact` binary v0.31.1
- **Midnight Lace Wallet**: Installed as a browser extension (configured for Preprod network)

## Installation

1. Clone the repository and install root workspace dependencies:
   ```bash
   npm install
   ```

2. Install sub-workspace dependencies (if developing individually):
   ```bash
   cd contract && npm install && cd ..
   cd api && npm install && cd ..
   cd bboard-ui && npm install && cd ..
   cd bboard-cli && npm install && cd ..
   ```

3. Start the Midnight Proof Server docker container:
   ```bash
   docker run -p 6300:6300 midnightnetwork/proof-server
   ```

## Compile

Compile the Compact smart contract using the Compact compiler:

```bash
npm run compact
```

This generates zero-knowledge circuit definitions (`zkir`), proving keys (`keys`), and TypeScript contract bindings inside `contract/src/managed/tipjar`.

## Build

To build all workspace packages (`contract`, `api`, `cli`, `ui`):

```bash
npm run build
```

## Manual Deployment

Smart contract deployment is intentionally skipped in this stage as part of Level 1.

To deploy the contract manually to the Midnight Preprod network, run:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

## After Deployment

After running the deployment command above:

1. Deploy the Compact contract to the Preprod network.
2. Copy the newly generated deployed contract address hex string.
3. Replace every occurrence of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` in the codebase and environment files with your actual contract address.

No additional code changes are required after backfilling the address.

## Environment Variables

The frontend relies on the following environment settings in `bboard-ui/.env.preprod`:

```env
VITE_NETWORK_ID=preprod
VITE_LOGGING_LEVEL=trace
VITE_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

## Screenshots

<!-- Add UI screenshots here -->
![TipJar Dashboard Screenshot](https://via.placeholder.com/800x450?text=TipJar+Dashboard+Screenshot)

## Initial Idea

The initial concept was developed for the Rise In Level 1 Midnight Builder Challenge to showcase privacy-preserving micro-donations using Zero-Knowledge proofs.

## Troubleshooting

- **Proof Server Connection Failed**: Ensure Docker is running and `midnightnetwork/proof-server` is listening on port `6300`.
- **Wallet Not Found**: Make sure the Midnight Lace Wallet browser extension is enabled and set to the `preprod` network.
- **Compact Compilation Error**: Verify `compact --version` returns version 0.31.1 or higher.
