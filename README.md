# 🎰 Midnight Privacy Lottery

> A fully decentralized, privacy-preserving lottery dApp built on **Midnight Network** using **Compact zero-knowledge smart contracts**.

![Midnight Network](https://img.shields.io/badge/Midnight-Preview_Network-7952ff?style=for-the-badge)
![Smart Contract](https://img.shields.io/badge/Contract-Compact_ZK-00f2fe?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🧠 Project Vision

Traditional blockchain lotteries broadcast all participant wallet addresses and entry transactions publicly on-chain, creating **privacy risks** and exposing user token balances to tracking tools.

This lottery uses **Compact zero-knowledge smart contracts** on Midnight Network so users can buy tickets and claim prizes with **full privacy**. On-chain observers can monitor the total pot and draw results, but can **never link individual ticket commitments** to real-world wallet identities or unrevealed ticket secrets.

---

## 📋 Smart Contract Deployment

| Field | Value |
|---|---|
| **Network** | Midnight Preprod |
| **Contract ID** | `0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191` |
| **Deployer Address** | `mn_preprod_1cead884688b14f4a0bd0741b8554ee4e79e0fb` |
| **Explorer** | [Midnight Preprod Explorer](https://explorer.preprod.midnight.network/) |
| **Live Demo** | [fullmoon22.vercel.app](https://fullmoon22.vercel.app/) |
| **Demo Video** | [Watch Demo Video](https://youtu.be/9c9iA8yke9A?si=7Ue6xSdojym_wbER) |

---

## 🔏 Privacy Claim

This dApp demonstrates **observable privacy** — something is proved without being shown.

### What is public (anyone can see):
- The total prize pot balance
- The number of tickets sold
- The round status (OPEN / COMPLETED)
- The winning ticket index after `draw_winner`
- The VRF domain separator constant (`"WINNING_SEED"`)

### What stays private (never revealed on-chain):
- **Your `secret_salt`** — the 32-byte private witness generated in your browser. It is used locally to compute the commitment hash, then discarded. It never leaves your device.
- **Your identity** — the ZK proof for `deposit_entry` only reveals the hash commitment, not who submitted it.
- **Your ticket** — during `claim_prize`, you prove you know the salt that produced the winning commitment without revealing the salt itself or linking your address to any entry.

### How the ZK proof works:
1. **Ticket purchase** (`deposit_entry`): Your browser generates a random `secret_salt`. The contract circuit computes `persistentCommit(secret_salt, pad(32,"DEPOSIT_SALT"))` inside the ZK proof. Only the commitment (hash output) is stored on-chain. The salt never appears in any ledger variable or transaction data.
2. **Draw** (`draw_winner`): The operator discloses a `winning_ticket` index publicly (verifiable fairness). The winning entry's commitment is now the target.
3. **Claim** (`claim_prize`): The winner re-enters their `secret_salt` into the proof. The circuit recomputes the commitment and asserts it equals the winning one — entirely inside the proof. The verifier sees "proof valid" without learning the salt.

### Observable privacy behavior in the UI:
- The "🔒 Proved without revealing your input" badge appears on every action button.
- While proving, a ZK overlay shows: *"Generating Zero-Knowledge Proof"* — the salt is consumed and discarded client-side.
- The on-chain state only ever stores the commitment hash, visible in the indexer state panel.



---

## ✨ Key Features

### Privacy-Preserving Ticket Entries
Participants deposit entry fees into the pool while proving ownership via a **ZK witness commitment**. Private ticket salts are generated at runtime and **never revealed on-chain**.

### Fair Verifiable Random Selection
Incorporates **verifiable seed disclosure** to select winning ticket indices objectively using VRF-based entropy.

### Zero-Knowledge Prize Claims
Winners submit a ZK proof demonstrating that their ticket witness matches the winning commitment **without exposing non-winning participant identities**.

### Modern Production Frontend
Interactive glassmorphic dark interface with:
- Live ZK proof generation indicators
- Real-time indexer sync (12s polling)
- Lace Wallet DApp Connector integration
- Optimistic UI updates with rollback
- Mobile-responsive design (320px–1920px)

---

## 🏗️ Architecture

```
midnight11/
├── contracts/
│   ├── lottery.compact          # Compact ZK smart contract (3 circuits)
│   └── lottery.test.ts          # Unit tests for circuit logic
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LotteryView.tsx       # Core lottery UI
│   │   │   ├── WalletConnect.tsx     # Lace Wallet connector
│   │   │   ├── MetaMaskWallet.tsx    # MetaMask fallback
│   │   │   ├── ErrorBoundary.tsx     # Global error boundary
│   │   │   ├── OnboardingModal.tsx   # 5-step first-time user onboarding
│   │   │   └── FeedbackWidget.tsx    # Floating feedback collection
│   │   ├── hooks/
│   │   │   └── useMidnight.ts        # DApp Connector hook
│   │   ├── lib/
│   │   │   ├── analytics.ts          # Plausible event tracking
│   │   │   └── sentry.ts             # Sentry error monitoring
│   │   ├── contract.ts              # Compact contract interface
│   │   ├── indexer.ts               # GraphQL indexer client
│   │   ├── App.tsx                  # Root component
│   │   └── main.tsx                 # Entry point
│   ├── .env.example                 # Environment variable template
│   ├── index.html                   # HTML entry with SEO meta tags
│   └── vite.config.ts               # Vite configuration
├── src/
│   └── deploy.ts                    # Contract deployment script
├── package.json
└── README.md
```

---

## 🔒 Smart Contract Circuits

The Compact smart contract (`contracts/lottery.compact`) implements 3 zero-knowledge circuits:

| Circuit | Purpose | Privacy Guarantee |
|---|---|---|
| `deposit_entry` | Buy a ticket by depositing 1 tNIGHT | Salt is hashed into a commitment — never revealed on-chain |
| `draw_winner` | Select winner using VRF seed | Winner index is deterministic but unlinkable to identity |
| `claim_prize` | Claim pot by proving ticket ownership | Proof verifies without revealing which ticket is yours |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Compact (`contracts/lottery.compact`) |
| **Frontend** | React 18, Vite 5, TypeScript |
| **State Management** | TanStack Query (React Query) |
| **Wallet** | Lace Wallet via Midnight DApp Connector API |
| **Styling** | Custom CSS with glassmorphism design system |
| **Testing** | Vitest |
| **Analytics** | Plausible (privacy-first, no cookies) |
| **Monitoring** | Sentry (error boundaries + crash reporting) |
| **Deployment** | Vercel / Netlify (frontend) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** / **npx**
- **Lace Wallet** browser extension (for Midnight Network interaction)
- Docker Desktop (optional — for local devnet stack)

### Installation

```bash
# Clone the repository
git clone https://github.com/payalbabar/midnight.git
cd midnight11

# Install root dependencies
npm install

# Install frontend dependencies
npm --prefix frontend install

# Copy environment config
cp frontend/.env.example frontend/.env.local
```

### Configuration

Edit `frontend/.env.local` with your values:

```env
# Required
VITE_CONTRACT_ADDRESS=0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191
VITE_INDEXER_URL=https://indexer.preprod.midnight.network
VITE_NETWORK=preprod

# Optional — Analytics & Monitoring
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_DOMAIN=yourdomain.com
```

### Development

```bash
# Start frontend dev server
npm run frontend

# Start backend dev server (if applicable)
npm run dev
```

### Production Build

```bash
# Build optimized frontend bundle
npm run frontend:build
```

---

## Deployment Guide

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**
```bash
npm install -g vercel
vercel login
```

2. **Deploy from frontend directory**
```bash
cd frontend
vercel
```

3. **Set Environment Variables in Vercel Dashboard**
- `VITE_CONTRACT_ADDRESS`: Your actual Preprod contract address
- `VITE_INDEXER_URL`: `https://indexer.preprod.midnight.network`
- `VITE_NETWORK`: `preprod`

4. **Production Deployment**
```bash
vercel --prod
```

### Contract Deployment to Preprod

**Important:** The current deployment script simulates deployment. For actual Preprod deployment:

1. **Set up Midnight Wallet**
```bash
# Create wallet with Midnight CLI
midnight wallet create
```

2. **Fund Wallet**
- Visit Preprod faucet: https://faucet.preprod.midnight.network
- Request testnet tokens

3. **Deploy Contract**
```bash
# Use actual Midnight deployment tools
npm run deploy -- --network=preprod
```

4. **Verify on Explorer**
- Check: https://explorer.preprod.midnight.network/
- Search for your contract address

5. **Update Configuration**
- Replace contract address in `frontend/.env.example`
- Update README with actual contract address
- Commit and push changes

### Demo Video Requirements

**Required content (under 2 minutes):**
1. Show Lace Wallet connection
2. Demonstrate circuit call (buy ticket or draw winner)
3. Show privacy behavior (ZK proof generation)
4. Display successful transaction

**Recording tips:**
- Use screen recording software (OBS, Loom, etc.)
- Ensure wallet extension is visible
- Show loading states and privacy badges
- Keep under 2 minutes

---

## 📊 Production Features

### Analytics (Plausible)
Privacy-first analytics tracking — no cookies, GDPR compliant. Tracks:
- Wallet connections/disconnections
- Lottery ticket purchases
- Draw and claim events
- Onboarding flow completion

### Monitoring (Sentry)
Real-time error tracking with:
- Automatic crash reporting
- React Error Boundary integration
- Sensitive data scrubbing (no wallet keys, no PII)

### User Onboarding
5-step interactive onboarding modal for first-time users covering:
1. Welcome & ZK privacy concept
2. How the lottery works
3. Why zero-knowledge matters
4. Wallet setup instructions
5. Ready to play

### Feedback Collection
Floating feedback widget with:
- Star rating (1–5)
- Category selection (Bug, UX, Feature Request, General)
- Optional comment field
- Configurable submission endpoint

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Expected output:
# ✓ deposit_entry creates valid ticket with commitment
# ✓ draw_winner selects a valid winning index
# ✓ claim_prize transfers pot to winner
# ✓ privacy: ticket salts are never stored in public state
```

---

## 🔮 Future Scope

- **Multi-Round Automation:** Scheduled rollover for unclaimed prize pots
- **Shielded Token Pool:** Integration with Midnight shielded tokens for untraceable payouts
- **Cross-Chain VRF Oracles:** Chainlink VRF integration for decentralized entropy
- **Governance Module:** Community voting on lottery parameters

---

## 📜 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built for **INTO the Midnight — SPPU Bootcamp** (Rise In)

- [Midnight Network](https://midnight.network/) — Privacy blockchain platform
- [Compact Language](https://docs.midnight.network/) — Zero-knowledge smart contract language
- [Lace Wallet](https://midnight.network/) — Official Midnight DApp Connector wallet
