# 🎓 Digi-Certificate Verification (XYPHER)

> **A Decentralized, Tamper-Proof Academic & Professional Credential Verification Platform**  
> Anchored on Ethereum/Polygon Smart Contracts, InterPlanetary File System (IPFS), and Neon PostgreSQL.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-Ethereum_Tooling-FFF100?style=for-the-badge&logo=hardhat&logoColor=black)](https://hardhat.org/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy_Testnet-8247E5?style=for-the-badge&logo=polygon&logoColor=white)](https://polygon.technology/)
[![IPFS](https://img.shields.io/badge/Storage-IPFS_%2F_Pinata-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)](https://pinata.cloud/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Testing-Playwright_E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Multi-Role Ecosystem](#-multi-role-ecosystem)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Quickstart](#-installation--quickstart)
- [Environment Variables Configuration](#-environment-variables-configuration)
- [Pre-Configured Demo Accounts](#-pre-configured-demo-accounts)
- [Smart Contract Deployment & Testing](#-smart-contract-deployment--testing)
- [API Reference](#-api-reference)
- [Automated Testing & Security Audits](#-automated-testing--security-audits)
- [Docker & Containerized Deployment](#-docker--containerized-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Executive Summary

Academic credential fraud, forged degrees, and unauthorized "diploma mills" jeopardize academic integrity and impose severe operational overhead on employers and verification bodies. Traditional background check processes are slow, manual, vulnerable to forgery, and gatekept behind centralized registries.

**Digi-Certificate Verification (XYPHER)** resolves this crisis by establishing an **immutable, multi-party cryptographic verification pipeline**:
1. **Decentralized Storage**: Certificate payloads and metadata are pinned immutably on IPFS via Pinata.
2. **Blockchain Tamper-Proof Anchoring**: Cryptographic digests and credential states are anchored onto EVM smart contracts (Polygon / Hardhat).
3. **Dynamic Continuous Accreditation**: If an educational institution's accreditation is suspended by regulatory authorities, all previously issued credentials immediately reflect this status upon verification.
4. **Dual-Authorization Governance (Multi-Sig)**: Certificates require initiation by one registrar staff member and review/approval by a second authorized official before blockchain minting, preventing rogue issuances.
5. **Instant Public Verification**: Employers and verifiers can confirm credential authenticity in milliseconds via direct Credential ID lookup or real-time camera-based QR code scanning.

---

## 🚀 Key Features

- **🛡️ Immutable On-Chain Ledger**: Smart contracts deployed with Solidity 0.8.28 securely maintain certificate identities, revocation states, and issuing authority bindings.
- **🏛️ Continuous Dynamic Accreditation**: When verifying a credential, the contract queries `Registry.sol` in real time. Revoked or lapsed institutions are flagged instantly across all historically issued diplomas.
- **✍️ Two-Person Dual-Authorization Issuance**: Implements institutional separation of duties. Staff members draft pending certificates; an authorized verifier/admin must sign off before on-chain execution.
- **⚡ Instant QR Code & Camera Scanner**: Built-in camera scanner with automatic QR detection (`html5-qrcode`) alongside one-click QR code generation with high-resolution PNG, SVG, and print export.
- **📄 Cryptographic PDF Generation**: Automatically renders and downloads official tamper-evident certificate PDFs with embedded QR verification seals via `jspdf`.
- **🚨 Anomaly Detection & Velocity Safeguards**: Intelligent backend monitors issuance velocity, flagging rapid bulk creation spikes to prevent compromised credential fraud.
- **✨ Next-Gen 3D Cyberpunk / Glassmorphic UI**: High-fidelity frontend powered by React 19, Three.js, React Three Fiber, GSAP animations, and Lenis smooth scrolling.
- **🔒 Enterprise Security**: Equipped with express rate-limiting, CORS whitelisting, cryptographic SHA-256 integrity validation, and strict database connection pooling.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Users"]
        A1["Regulator Dashboard"]
        A2["Institution Dashboard"]
        A3["Student Credential Wallet"]
        A4["Company / Verifier Portal"]
        A5["Public QR & ID Scanner"]
    end

    subgraph FrontendApp["Frontend Application (React 19 + Vite)"]
        F1["Three.js / R3F 3D Scenes"]
        F2["Camera QR Scanner (html5-qrcode)"]
        F3["PDF & QR Generator (jsPDF + QRCode)"]
        F4["Supabase Auth Client"]
    end

    subgraph BackendAPI["Backend API Layer (Express.js)"]
        B1["Auth & Role Guard Middleware"]
        B2["Anomaly Detection & Velocity Filter"]
        B3["Express Rate Limiting & CORS"]
        B4["Certificate & Pending Workflow Router"]
        B5["Ethers.js v6 Blockchain Service"]
    end

    subgraph DataStorage["Data & Storage Infrastructure"]
        D1[("Neon PostgreSQL<br/>Users, Students, Institutions, Logs")]
        D2[("Supabase Auth<br/>JWT & Identity Management")]
        D3[("Pinata / IPFS<br/>Immutable Certificate Payloads & CIDs")]
    end

    subgraph BlockchainNetwork["Blockchain Ledger (Polygon / Hardhat)"]
        C1["Registry.sol<br/>(Institution Accreditation State)"]
        C2["CertificateRegistry.sol<br/>(Credential State & Live Validation)"]
    end

    Clients --> FrontendApp
    FrontendApp -->|Session Auth| D2
    FrontendApp -->|REST API Requests| BackendAPI
    BackendAPI -->|Relational Queries & Pooling| D1
    BackendAPI -->|Pin Credential Payload| D3
    BackendAPI -->|Transact & Read Contract| BlockchainNetwork
    C2 -->|isAccredited Check| C1
```

---

## 👥 Multi-Role Ecosystem

| Role | Primary Responsibilities | Access & Actions |
| :--- | :--- | :--- |
| **🏛️ Regulator** | Higher Education & Accreditation Authority | • Accredit or revoke educational institutions<br/>• Monitor network-wide anomaly flags & volume spikes<br/>• Audit issued certificates and accreditation status |
| **🎓 Institution** | Accredited University, College, or Board | • Register and manage enrolled students<br/>• Draft pending certificate issuances to IPFS<br/>• Dual-authorization queue (review & sign off pending drafts)<br/>• Mint finalized credentials to the blockchain ledger |
| **🧑‍🎓 Student** | Graduate / Credential Holder | • View all awarded degree certificates<br/>• Generate and display verifiable QR codes<br/>• Download cryptographic tamper-evident PDF certificates<br/>• Share direct verification links with recruiters |
| **🏢 Company** | Recruiter, HR Firm, or Background Verifier | • Query certificate validity by unique Credential ID<br/>• Scan physical or digital diploma QR codes via camera<br/>• Inspect on-chain transaction hash and IPFS payload<br/>• Download certified compliance verification reports |
| **🌐 Public** | Third-party public verification | • Instant open access at `/verify` without creating an account |

---

## 📜 Smart Contract Architecture

The blockchain layer consists of two modular Solidity (`^0.8.28`) contracts implementing OpenZeppelin's `AccessControl`:

### 1. `Registry.sol`
- Maintains the official directory of recognized educational institutions.
- Protected by `OPERATOR_ROLE` (governed by the regulator/platform admin).
- **Key Functions**:
  - `addInstitute(string institutionId, string name)`: Registers an accredited university.
  - `updateAccreditationStatus(string institutionId, bool accredited)`: Toggles live accreditation.
  - `isAccredited(string institutionId)`: Returns current live accreditation standing.

### 2. `CertificateRegistry.sol`
- Manages immutable academic credential states on-chain.
- Connects directly to `Registry.sol` via `IRegistry` interface.
- **Key Functions**:
  - `issueCertificate(string credentialId, string institutionId, string ipfsHash)`: Issues a certificate. Reverts if the issuing institution is not accredited at the time of issuance.
  - `revokeCertificate(string credentialId)`: Revokes a credential (e.g., academic malpractice or correction).
  - `verifyCertificate(string credentialId)`: Returns `(ipfsHash, revoked, institutionId, isInstituteAccredited)`. Performs dynamic cross-contract evaluation of the issuing institution's live accreditation status.

---

## 💻 Technology Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Visuals & 3D**: [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [@react-three/drei](https://github.com/pmndrs/drei), [GSAP](https://gsap.com/)
- **Smooth Interaction**: [Lenis Smooth Scroll](https://lenis.darkroom.engineering/)
- **Icons & Styling**: [Lucide React](https://lucide.dev/), Vanilla CSS Design System with responsive mobile navigation
- **Verification Tooling**: [html5-qrcode](https://github.com/mebjas/html5-qrcode), [qrcode](https://www.npmjs.com/package/qrcode), [jspdf](https://parall.ax/products/jspdf)

### Backend API
- **Runtime**: [Node.js](https://nodejs.org/) (v20+) & [Express.js](https://expressjs.com/)
- **Web3 Connector**: [Ethers.js](https://docs.ethers.org/v6/) v6
- **Middleware**: [Multer](https://github.com/expressjs/multer), [CORS](https://github.com/expressjs/cors), [Morgan](https://github.com/expressjs/morgan), [Express Rate Limit](https://express-rate-limit.mintlify.app/)
- **Database Driver**: [pg](https://node-postgres.com/) with SSL connection pooling

### Blockchain & Decentralized Storage
- **Smart Contracts**: [Solidity 0.8.28](https://soliditylang.org/) with [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- **Development & Testing**: [Hardhat](https://hardhat.org/)
- **Target Chains**: Local Hardhat Node (Chain ID 31337), Polygon Amoy Testnet (Chain ID 80002)
- **Decentralized Storage**: [Pinata IPFS](https://pinata.cloud/) SDK (`pinata`)

### Database & Authentication
- **Database**: [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres with pooled connections)
- **Authentication**: [Supabase Auth](https://supabase.com/) (JWT session handling and user identity)

---

## 📁 Repository Structure

```plaintext
Digi-cirtificate-verification/
├── backend/                        # Express.js REST API Server
│   ├── src/
│   │   ├── config/                 # Neon DB pool & Pinata client configuration
│   │   ├── middleware/             # Rate-limiting, auth verification, multer
│   │   ├── routes/                 # Express routers: certificates, institutions, students, users
│   │   ├── services/               # Anomaly detection & multi-sig approval services
│   │   └── server.js               # Express application entrypoint
│   ├── scripts/                    # Backend verification, migration & test scripts
│   └── package.json
│
├── contracts/                      # Hardhat Ethereum / Polygon Workspace
│   ├── contracts/
│   │   ├── Registry.sol            # Institution registry & accreditation smart contract
│   │   └── CertificateRegistry.sol # Academic certificate ledger smart contract
│   ├── scripts/                    # Deployment & verification scripts
│   ├── test/                       # Smart contract unit tests
│   ├── hardhat.config.js           # Hardhat configuration (Solidity 0.8.28)
│   └── package.json
│
├── frontend/                       # React 19 + Vite User Interface
│   ├── src/
│   │   ├── components/             # Reusable UI, 3D scenes, QR modal, camera scanner
│   │   ├── context/                # Supabase AuthContext & role session state
│   │   ├── lib/                    # API client, device detection, PDF/QR helpers
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Landing page with interactive hero & quick verification
│   │   │   ├── AuthPage.jsx        # Unified login & sign-up with 1-click role switcher
│   │   │   ├── VerifyPage.jsx      # Standalone verification & QR camera scanner
│   │   │   └── dashboards/         # Role-gated dashboards (Regulator, Institution, Student, Company)
│   │   └── index.css               # Comprehensive design tokens and styling
│   └── package.json
│
├── database/                       # Relational Database Schemas
│   └── neon-schema.sql             # Neon PostgreSQL table definitions & enums
│
├── supabase/                       # Supabase Auth & auxiliary SQL scripts
│   └── schema.sql                  # Supabase schema definitions
│
├── scripts/                        # Monorepo maintenance & automation scripts
│   ├── reseed-clean-demo-data.js   # Automated end-to-end data wipe and reseed script
│   ├── start-container.sh          # Self-contained Docker runtime startup script
│   └── sync-deployed-addresses.js  # Contract address synchronizer for backend
│
├── e2e/                            # Playwright End-to-End Test Specifications
├── Dockerfile                      # Production container image configuration
├── package.json                    # Monorepo workspace configuration
└── README.md                       # Project documentation
```

---

## ⚙️ Prerequisites

Before running the project locally, ensure you have the following installed and available:

- **Node.js**: `v20.x` or higher
- **npm**: `v9.x` or higher
- **Git**
- **Neon PostgreSQL Account**: Free database instance from [neon.tech](https://neon.tech/)
- **Supabase Account**: Project URL and Anon/Service Role keys from [supabase.com](https://supabase.com/)
- **Pinata Account**: API credentials and dedicated gateway from [pinata.cloud](https://pinata.cloud/)

---

## 🛠️ Installation & Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/manoj1454/Digi-cirtificate-verification.git
cd Digi-cirtificate-verification
```

### 2. Install Dependencies

Install all root, backend, frontend, and smart contract workspace dependencies in a single step:

```bash
npm run install:all
```

---

### 3. Configure Environment Variables

Create `.env` configuration files for each component from their respective examples:

```bash
# 1. Backend environment
cp backend/.env.example backend/.env

# 2. Frontend environment
cp frontend/.env.example frontend/.env

# 3. Smart Contracts environment
cp contracts/.env.example contracts/.env
```

*(See [Environment Variables Configuration](#-environment-variables-configuration) below for detailed parameter documentation).*

---

### 4. Initialize Database Schema

Apply the database schema to your **Neon PostgreSQL** database:

```bash
# Connect using psql or the Neon SQL Editor console
psql "$DATABASE_URL" -f database/neon-schema.sql
```

---

### 5. Start Local Blockchain & Deploy Contracts

Open a dedicated terminal to run the local Hardhat blockchain node:

```bash
# Terminal 1: Start Hardhat node (runs at http://127.0.0.1:8545)
npm run contracts:node
```

In a second terminal, compile and deploy the smart contracts to the local node:

```bash
# Terminal 2: Deploy Registry.sol and CertificateRegistry.sol
npm run contracts:deploy:local
```

Synchronize the deployed contract addresses to your backend:

```bash
node scripts/sync-deployed-addresses.js
```

---

### 6. Provision Demo Accounts & Seed Data

Automatically provision demo accounts in Supabase Auth and seed initial mock records (students, institutions, accredited certificates) into your database:

```bash
npm run setup:demo --workspace=backend
# or run the complete end-to-end lifecycle reseed:
node scripts/reseed-clean-demo-data.js
```

---

### 7. Launch Development Servers

Start both the Express backend and React frontend simultaneously:

```bash
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Health Check Endpoint**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🔑 Environment Variables Configuration

### Backend (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Express server port | `5001` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgresql://user:pass@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require` |
| `SUPABASE_URL` | Supabase project API URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous public key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged service role key | `eyJhbGciOi...` |
| `PINATA_API_KEY` | Pinata IPFS API Key | `7ea111...` |
| `PINATA_API_SECRET` | Pinata IPFS API Secret | `29890a...` |
| `PINATA_JWT` | Pinata JWT token for IPFS pinning | `eyJhbGciOi...` |
| `PINATA_GATEWAY` | Pinata dedicated gateway host | `your-gateway.mypinata.cloud` |
| `BLOCKCHAIN_RPC_URL` | JSON-RPC provider endpoint | `http://127.0.0.1:8545` |
| `REGISTRY_CONTRACT_ADDRESS` | Deployed `Registry.sol` address | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `CERTIFICATE_REGISTRY_CONTRACT_ADDRESS` | Deployed `CertificateRegistry.sol` address | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `OPERATOR_PRIVATE_KEY` | Private key of authorized operator | Hardhat Account #0 private key |
| `DEMO_PASSWORD` | Default password for seeded demo accounts | `DemoSecurePass2026!` |

### Frontend (`frontend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project API URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key | `eyJhbGciOi...` |
| `VITE_API_BASE_URL` | Express backend base URL | `http://localhost:5001` |
| `VITE_DEMO_PASSWORD` | Auto-fill password for demo cards | `DemoSecurePass2026!` |

### Contracts (`contracts/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PRIVATE_KEY` | Deployer account private key (Polygon) | `0x...` |
| `POLYGON_AMOY_RPC_URL` | Polygon Amoy testnet RPC provider | `https://rpc-amoy.polygon.technology/` |

---

## 🎭 Pre-Configured Demo Accounts

For testing and demonstration, the login page features **1-click Role Card Autofill** for immediate access:

| Role | Demo Email | Default Password | Dashboard View |
| :--- | :--- | :--- | :--- |
| **🏛️ Regulator** | `demo.regulator@xypher.demo` | `DemoSecurePass2026!` | `/regulator` |
| **🎓 Institution** | `demo.institution@xypher.demo` | `DemoSecurePass2026!` | `/institution` |
| **🧑‍🎓 Student** | `demo.student@xypher.demo` | `DemoSecurePass2026!` | `/student` |
| **🏢 Company / Verifier** | `demo.company@xypher.demo` | `DemoSecurePass2026!` | `/company` |

---

## ⛓️ Smart Contract Deployment & Testing

### Compile Contracts
```bash
npm run compile --workspace=contracts
```

### Run Smart Contract Tests
Execute the automated test suite verifying contract deployment, certificate issuance, live accreditation checks, and role access restrictions:
```bash
npm run test:contracts
```

### Deploy to Polygon Amoy Testnet
```bash
cd contracts
npx hardhat run scripts/deploy.js --network amoy
```

---

## 📡 API Reference

### Health & Status
- **`GET /api/health`**: Returns system status, database connection state, and blockchain RPC readiness.

### Certificates
- **`GET /api/certificates/verify/:id`**: Performs dual-layer verification (checks Postgres metadata, queries smart contract for on-chain integrity and live accreditation, and fetches IPFS payload).
- **`POST /api/certificates/upload`**: Uploads student certificate document to Pinata IPFS, records SHA-256 hash, and initiates a draft in `pending_certificates`.
- **`GET /api/certificates/pending`**: Lists all pending certificate drafts awaiting second-person review.
- **`POST /api/certificates/approve/:id`**: Authorizes a pending certificate and submits the on-chain minting transaction to `CertificateRegistry.sol`.
- **`POST /api/certificates/revoke`**: Revokes an issued credential on-chain.

### Institutions & Governance
- **`GET /api/institutions`**: Retrieves list of registered educational institutions.
- **`POST /api/institutions/status`**: Regulator endpoint to approve, accredit, or revoke an institution on-chain.
- **`GET /api/institutions/anomalies`**: Fetches anomaly flags and velocity warnings for regulatory compliance.

### Students & Users
- **`GET /api/students/me/certificates`**: Returns all credentials awarded to the authenticated student.
- **`GET /api/users/me`**: Fetches authenticated profile, role, and institutional affiliation.

---

## 🧪 Automated Testing & Security Audits

The project includes an extensive suite of automated tests and security audits:

```bash
# 1. Run Playwright End-to-End User Flow Tests
npm run test

# 2. Run Smart Contract Test Suite
npm run test:contracts

# 3. Test Neon PostgreSQL Schema & DB Migrations
npm run test:neon

# 4. Verify Full Certificate Lifecycle (Initiate -> Approve -> On-Chain Mint -> Verify)
npm run test:lifecycle

# 5. Run Blockchain Security & Access Control Audits
npm run test:security --workspace=backend

# 6. Test Rate-Limiting & Velocity Anomaly Detection
node backend/scripts/test-rate-limit-and-anomalies.js
```

---

## 🐳 Docker & Containerized Deployment

A self-contained production `Dockerfile` and autonomous startup script (`scripts/start-container.sh`) are included for streamlined containerized deployment (e.g., Render, Railway, AWS ECS):

```bash
# Build the production container
docker build -t digi-certificate-backend .

# Run the container (exposes API on 5001 and local blockchain on 8545)
docker run -p 5001:5001 -p 8545:8545 --env-file backend/.env digi-certificate-backend
```

**Autonomous Startup Pipeline**:
1. Launches local Hardhat blockchain in the background.
2. Waits for RPC health (`http://127.0.0.1:8545`).
3. Automatically compiles and deploys `Registry.sol` and `CertificateRegistry.sol`.
4. Synchronizes contract addresses into environment configuration.
5. Reseeds clean baseline demo data.
6. Launches the Express API server.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/credential-enhancement`).
3. Commit your changes with descriptive commit messages (`git commit -m "feat: add batch certificate verification"`).
4. Push to the branch (`git push origin feature/credential-enhancement`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [ISC License](file:///Users/manoj/Downloads/Credential_cirtificate(Project)/package.json).
