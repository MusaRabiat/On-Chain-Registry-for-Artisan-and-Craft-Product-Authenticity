'use client';

import { useState } from 'react';

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
}

export interface ProductFormData {
  name: string;
  category: string;
  description: string;
  metadataUri: string;
}

const categories = [
  'Leather Goods',
  'Ceramics',
  'Textiles',
  'Woodwork',
  'Jewelry',
  'Metalwork',
  'Glasswork',
  'Paper Crafts',
  'Other',
];

export function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    description: '',
    metadataUri: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Product Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="input"
          placeholder="e.g., Handcrafted Leather Bag"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="input"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          className="input"
          placeholder="Describe your product, materials used, and crafting techniques..."
        />
      </div>

      <div>
        <label htmlFor="metadataUri" className="block text-sm font-medium text-gray-700 mb-1">
          Metadata URI (IPFS)
        </label>
        <input
          type="text"
          id="metadataUri"
          name="metadataUri"
          value={formData.metadataUri}
          onChange={handleChange}
          required
          className="input"
          placeholder="ipfs://Qm..."
        />
        <p className="text-sm text-gray-500 mt-1">
          Upload product images and details to IPFS first, then paste the URI here.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Registering...' : 'Register Product'}
      </button>
    </form>
  );
}
