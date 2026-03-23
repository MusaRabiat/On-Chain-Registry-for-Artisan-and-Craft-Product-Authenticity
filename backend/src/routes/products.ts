import { Router, Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { optionalAuth } from '../middleware/auth';
import { productService } from '../services/productService';

const router = Router();

// Get all products with optional filtering
router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    category,
    status,
    artisanId,
    page = '1',
    limit = '20',
  } = req.query;

  const products = await productService.getProducts({
    search: search as string,
    category: category as string,
    status: status as string,
    artisanId: artisanId ? parseInt(artisanId as string) : undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });

  res.json({
    success: true,
    data: products.data,
    pagination: {
      page: products.page,
      limit: products.limit,
      total: products.total,
      totalPages: Math.ceil(products.total / products.limit),
    },
  });
}));

// Get product by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await productService.getProductById(parseInt(id));

  if (!product) {
    throw createError('Product not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: product,
  });
}));

// Verify product authenticity
router.get('/:id/verify', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const verification = await productService.verifyProduct(parseInt(id));

  res.json({
    success: true,
    data: verification,
  });
}));

// Get product certifications
router.get('/:id/certifications', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const certifications = await productService.getProductCertifications(parseInt(id));

  res.json({
    success: true,
    data: certifications,
  });
}));

// Get product disputes
router.get('/:id/disputes', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const disputes = await productService.getProductDisputes(parseInt(id));

  res.json({
    success: true,
    data: disputes,
  });
}));

export default router;
