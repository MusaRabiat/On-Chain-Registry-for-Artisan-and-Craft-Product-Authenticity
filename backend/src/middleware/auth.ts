import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// Wallet-based authentication middleware
// Verifies signed messages from Stacks wallets
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createError('Authorization header required', 401, 'AUTH_REQUIRED');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw createError('Invalid authorization format', 401, 'INVALID_AUTH_FORMAT');
    }

    // TODO: Implement actual signature verification
    // For now, we'll just decode the token as the wallet address
    // In production, you should verify signed messages

    // Example structure for a signed message:
    // {
    //   address: string,
    //   signature: string,
    //   message: string,
    //   timestamp: number
    // }

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      // Verify timestamp is not too old (5 minutes)
      const maxAge = 5 * 60 * 1000;
      if (Date.now() - decoded.timestamp > maxAge) {
        throw createError('Authentication expired', 401, 'AUTH_EXPIRED');
      }

      // TODO: Verify signature using @stacks/encryption
      // const isValid = verifySignature(decoded.message, decoded.signature, decoded.address);

      // Attach wallet address to request
      (req as any).walletAddress = decoded.address;

      next();
    } catch (parseError) {
      throw createError('Invalid token', 401, 'INVALID_TOKEN');
    }
  } catch (error) {
    next(error);
  }
}

// Optional auth - doesn't fail if no auth provided
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        try {
          const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
          (req as any).walletAddress = decoded.address;
        } catch {
          // Ignore invalid tokens for optional auth
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Role-based authorization
export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletAddress = (req as any).walletAddress;

      if (!walletAddress) {
        throw createError('Authentication required', 401, 'AUTH_REQUIRED');
      }

      // TODO: Check user's role from database or contract
      // const userRole = await getUserRole(walletAddress);
      // if (!roles.includes(userRole)) {
      //   throw createError('Insufficient permissions', 403, 'FORBIDDEN');
      // }

      next();
    } catch (error) {
      next(error);
    }
  };
}
