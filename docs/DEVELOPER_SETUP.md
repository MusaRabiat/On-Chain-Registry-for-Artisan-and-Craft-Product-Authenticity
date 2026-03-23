# Developer Setup Guide

This guide will help you set up your local development environment for the Artisan Product Registry project.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Tools

1. **Node.js** (v18 or higher)
   ```bash
   # Check version
   node --version

   # Install via nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **Clarinet** (v2.0 or higher)
   ```bash
   # macOS/Linux
   curl -L https://raw.githubusercontent.com/hirosystems/clarinet/main/install.sh | sh

   # Windows (via Chocolatey)
   choco install clarinet

   # Verify installation
   clarinet --version
   ```

3. **Git**
   ```bash
   git --version
   ```

### Optional Tools

- **PostgreSQL** (for backend database)
- **Docker** (for containerized development)
- **Stacks Wallet** (for testing transactions)

## Project Structure

```
.
├── contracts/           # Clarity smart contracts
│   ├── registry.clar    # Core product registry
│   ├── nft.clar         # SIP-009 NFT implementation
│   ├── certification.clar # Certification management
│   └── disputes.clar    # Dispute resolution
├── tests/               # Contract test files
├── frontend/            # Next.js frontend application
├── backend/             # Express API server
├── docs/                # Documentation
├── .husky/              # Git hooks
├── Clarinet.toml        # Clarinet configuration
└── package.json         # Root package configuration
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/On-Chain-Registry-for-Artisan-and-Craft-Product-Authenticity.git
cd On-Chain-Registry-for-Artisan-and-Craft-Product-Authenticity
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 5. Verify Smart Contracts

```bash
# Check contract syntax
clarinet check

# Expected output: All contracts should pass verification
```

## Running Tests

### Smart Contract Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:report

# Watch mode (auto-run on changes)
npm run test:watch
```

### Using Clarinet Console

Interactive testing with the Clarinet REPL:

```bash
clarinet console
```

Example commands in the console:

```clarity
;; Register an artisan
(contract-call? .registry register-artisan "Master Craftsman" "Expert woodworker" "Portland, OR")

;; Check artisan registration
(contract-call? .registry is-artisan tx-sender)

;; Register a product
(contract-call? .registry register-product "Handmade Table" "Furniture" "Oak dining table" "ipfs://Qm...")

;; Get product details
(contract-call? .registry get-product u1)
```

## Running the Frontend

```bash
cd frontend

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The frontend will be available at `http://localhost:3000`

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Running the Backend

```bash
cd backend

# Copy environment example
cp .env.example .env

# Edit .env with your configuration
# (Update database credentials, API keys, etc.)

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The API will be available at `http://localhost:3001`

### Backend Environment Variables

Required variables in `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/artisan_registry
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

## Deploying Contracts to Testnet

### 1. Configure Deployment

Edit `settings/Testnet.toml`:

```toml
[network]
name = "testnet"
stacks_node_rpc_address = "https://api.testnet.hiro.so"

[[accounts]]
name = "deployer"
mnemonic = "your-24-word-mnemonic-here"
```

### 2. Deploy Contracts

```bash
# Deploy all contracts
clarinet deployments apply -p deployments/default.testnet-plan.yaml

# Or deploy individually
clarinet deployments generate --testnet
```

### 3. Verify Deployment

Check your contracts on the Stacks Explorer:
- Testnet: https://explorer.stacks.co/?chain=testnet

## Debugging Tips

### Contract Errors

Common error codes and meanings:

| Code | Contract | Meaning |
|------|----------|---------|
| 200 | Registry | Not authorized |
| 201 | Registry | Not found |
| 202 | Registry | Already exists |
| 300 | Certification | Not authorized |
| 304 | Certification | Not certifier |
| 400 | Disputes | Not authorized |
| 402 | Disputes | Already exists |

### Testing Specific Scenarios

```bash
# Run specific test file
npm test -- tests/certification.test.ts

# Run tests matching pattern
npm test -- -t "should allow"

# Debug mode
npm test -- --reporter=verbose
```

### Common Issues

1. **Clarinet not found**
   - Ensure Clarinet is in your PATH
   - Try restarting your terminal

2. **Contract check fails**
   - Run `clarinet check` for detailed errors
   - Check for typos in function names

3. **Tests timing out**
   - Increase timeout in vitest.config.js
   - Check for infinite loops in contracts

4. **Frontend build errors**
   - Clear `.next` directory: `rm -rf .next`
   - Delete `node_modules` and reinstall

## Code Style

### Clarity Contracts

- Use descriptive constant names in UPPERCASE
- Group related functions with comment headers
- Add inline documentation for complex logic
- Follow the existing error code convention

### TypeScript

- Use strict type checking
- Prefer interfaces over types
- Document public functions with JSDoc

## Git Workflow

### Branches

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Follow conventional commits:

```
feat(contracts): add certification tier system
fix(registry): resolve dispute status check
docs: update developer setup guide
test(nft): add marketplace edge cases
```

### Pre-commit Hooks

Hooks run automatically on commit:

1. Contract syntax check (`clarinet check`)
2. Test execution
3. Secret detection

## Resources

- [Clarity Documentation](https://docs.stacks.co/clarity/overview)
- [Stacks.js Documentation](https://stacks.js.org/)
- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [SIP-009 NFT Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-standard.md)

## Getting Help

- Check existing [Issues](https://github.com/your-org/repo/issues)
- Join our [Discord](https://discord.gg/example)
- Read the [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.
