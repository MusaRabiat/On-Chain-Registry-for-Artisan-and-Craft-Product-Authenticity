const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Request failed' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Products API
export const productsApi = {
  async getAll() {
    return apiRequest<any[]>('/products');
  },

  async getById(id: number) {
    return apiRequest<any>(`/products/${id}`);
  },

  async search(query: string) {
    return apiRequest<any[]>(`/products?search=${encodeURIComponent(query)}`);
  },

  async verify(id: number) {
    return apiRequest<any>(`/products/${id}/verify`);
  },
};

// Artisans API
export const artisansApi = {
  async getByAddress(address: string) {
    return apiRequest<any>(`/artisans/${address}`);
  },

  async getProducts(address: string) {
    return apiRequest<any[]>(`/artisans/${address}/products`);
  },
};

// Certifications API
export const certificationsApi = {
  async getById(id: number) {
    return apiRequest<any>(`/certifications/${id}`);
  },

  async getByProduct(productId: number) {
    return apiRequest<any[]>(`/certifications?productId=${productId}`);
  },
};

// Disputes API
export const disputesApi = {
  async getById(id: number) {
    return apiRequest<any>(`/disputes/${id}`);
  },

  async getByProduct(productId: number) {
    return apiRequest<any>(`/disputes?productId=${productId}`);
  },
};
