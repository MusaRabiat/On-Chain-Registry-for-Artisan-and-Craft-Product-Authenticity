# On-Chain Registry for Artisan and Craft Product Authenticity

A blockchain-based platform built on Stacks that enables artisans and craftspeople to register, verify, and prove the authenticity of their handmade products. The platform uses Clarity smart contracts and NFT standards to create an immutable, transparent registry that combats counterfeiting while empowering authentic creators.

## Problem Statement

Artisan and craft products face significant counterfeiting threats, particularly in high-value categories like textiles, jewelry, and ceramics. Buyers struggle to verify authenticity without centralized authorities, while artisans lack affordable tools to prove product legitimacy. Existing solutions are centralized, expensive, and inaccessible to small producers. This project provides a decentralized, cost-effective alternative using blockchain technology.

## Key Features

- **Product Registration**: Artisans register products in under 10 minutes with automatic NFT generation and QR code creation
- **Instant Verification**: Buyers verify product authenticity by scanning QR codes without requiring a wallet
- **Immutable Provenance**: Complete ownership history and product origin tracking on the blockchain
- **Multi-Tier Certification**: Support for self-certified, third-party verified, and government-certified products
- **Certifier Dashboard**: Streamlined workflows for batch product review and approval
- **Dispute Resolution**: Community-driven fraud detection and resolution mechanisms
- **Geographic Indication Support**: Integration with GI certification standards for protected products

## Technology Stack

- **Blockchain**: Stacks (Bitcoin Layer 2)
- **Smart Contracts**: Clarity language
- **NFT Standard**: SIP-009 (Stacks Improvement Proposal)
- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Storage**: IPFS for metadata
- **Wallet Integration**: Stacks.js, @stacks/connect
- **Testing**: Vitest, Clarinet SDK

## Project Structure

```
.
├── contracts/              # Clarity smart contracts
│   ├── registry.clar      # Core product registry
│   ├── nft.clar           # SIP-009 NFT implementation
│   ├── certification.clar # Certification workflows
│   └── disputes.clar      # Dispute resolution
├── tests/                 # Smart contract tests
├── docs/                  # Comprehensive documentation
│   ├── PRD.md            # Product requirements
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── RESEARCH_FINDINGS.md
├── Clarinet.toml         # Clarinet project configuration
├── package.json          # Node.js dependencies
└── README.md             # This file
```

## Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Clarinet 2.0 or higher (for smart contract development)
- A Stacks wallet (Leather, Xverse, or similar)
- Git for version control

Install Clarinet:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.clarinet.sh | bash
```

## Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/On-Chain-Registry-for-Artisan-and-Craft-Product-Authenticity.git
cd On-Chain-Registry-for-Artisan-and-Craft-Product-Authenticity
```

2. Install dependencies:
```bash
npm install
```

3. Verify Clarinet installation:
```bash
clarinet --version
```

4. Check the project configuration:
```bash
clarinet check
```

## Usage

### Running Tests

Execute all smart contract tests:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:report
```

Watch mode for continuous testing during development:
```bash
npm run test:watch
```

### Local Development

Start the Clarinet REPL for interactive contract testing:
```bash
clarinet repl
```

### Deploying to Testnet

1. Configure your Stacks wallet address in `settings/Testnet.toml`
2. Deploy contracts to testnet:
```bash
clarinet deployments generate --testnet
```

3. Monitor deployment status on the Stacks testnet explorer

### Deploying to Mainnet

1. Ensure all tests pass and contracts are audited
2. Configure your address in `settings/Mainnet.toml`
3. Deploy with:
```bash
clarinet deployments generate --mainnet
```

## Smart Contracts

### Registry Contract (registry.clar)
Core contract managing product registration, ownership tracking, and metadata management. Artisans register products and receive unique identifiers.

### NFT Contract (nft.clar)
Implements the SIP-009 NFT standard. Each registered product receives a unique, immutable NFT token with metadata URI pointing to IPFS.

### Certification Contract (certification.clar)
Manages certifier registration and product approval workflows. Supports multi-tier verification (self-certified, third-party, government).

### Dispute Resolution Contract (disputes.clar)
Handles dispute submission, tracking, and resolution. Enables community-driven fraud detection and product status updates.

## Testing

Smart contract tests are located in the `tests/` directory and use Vitest with the Clarinet SDK environment.

Run specific test file:
```bash
npm test -- tests/registry.test.ts
```

View test coverage:
```bash
npm run test:report
```

## Deployment

### Testnet Deployment
- Use `settings/Testnet.toml` for configuration
- Recommended for development and testing
- Free STX tokens available from faucet

### Mainnet Deployment
- Use `settings/Mainnet.toml` for production
- Requires security audit before deployment
- Staged rollout recommended for risk management

See `docs/TECHNICAL_ARCHITECTURE.md` for detailed deployment strategies.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **PRD.md**: Complete product requirements, features, and success metrics
- **TECHNICAL_ARCHITECTURE.md**: System design, smart contract architecture, and API specifications
- **RESEARCH_FINDINGS.md**: Industry research, best practices, and implementation guidelines
- **docs/README.md**: Documentation index and quick start guides

## Contributing

1. Create a feature branch: `git checkout -b feature/description`
2. Follow code standards (see TECHNICAL_ARCHITECTURE.md)
3. Write tests for new functionality (target >80% coverage)
4. Submit a pull request with clear description
5. Ensure all tests pass before merging

Code standards:
- Clarity: Follow Clarity best practices and security patterns
- TypeScript: Strict mode enabled
- Testing: Unit, integration, and end-to-end tests required
- Documentation: JSDoc comments and README updates

## License

ISC License - See LICENSE file for details

## Support & Contact

For questions or issues:
1. Check the relevant documentation in `docs/`
2. Review existing GitHub issues
3. Open a new issue with detailed description and reproduction steps
4. Contact the development team through project channels

## Acknowledgments

This project builds on the Stacks ecosystem, Clarity language design principles, and research on blockchain authentication systems. Special thanks to the Stacks community and contributors.

---

**Project Status**: Draft - Ready for Development  
**Last Updated**: October 2025  
**Version**: 1.0

