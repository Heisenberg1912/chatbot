import { generateText } from '../gemini';
import { connectDB } from '../mongodb';
import { Supplier } from '../models';

const SYSTEM_INSTRUCTION = `You are a construction material and supplier expert.
You help users find construction materials, suppliers, and provide guidance on:
- Material selection for different construction needs
- Supplier recommendations by region
- Price estimates and comparisons
- Quality standards and certifications
- Sustainable/green material alternatives`;

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Hardware',
  'Structural',
  'Finishing',
  'Machinery',
  'Fabrication',
  'Interior',
];

const COUNTRIES = [
  { code: 'IN', name: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'] },
  { code: 'US', name: 'USA', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
  { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
];

export interface SupplierSearchParams {
  country?: string;
  city?: string;
  category?: string;
  query?: string;
  page?: number;
  limit?: number;
}

export async function searchSuppliers(params: SupplierSearchParams) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (params.country) filter.country = params.country;
  if (params.city) filter.city = new RegExp(params.city, 'i');
  if (params.category) filter.category = new RegExp(params.category, 'i');
  if (params.query) {
    filter.$text = { $search: params.query };
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(filter),
  ]);

  return { suppliers, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getSupplierStats() {
  await connectDB();

  const [totalCount, categoryStats, countryStats] = await Promise.all([
    Supplier.countDocuments(),
    Supplier.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Supplier.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { totalCount, categories: categoryStats, countries: countryStats };
}

export async function recommendMaterials(
  projectType: string,
  location: string,
  budget?: string
): Promise<string> {
  const prompt = `Recommend construction materials for the following project:
- Project Type: ${projectType}
- Location: ${location}
${budget ? `- Budget: ${budget}` : ''}

Provide:
1. Essential materials list with specifications
2. Recommended brands/suppliers for the location
3. Estimated costs per unit
4. Quality grades (economy, standard, premium)
5. Sustainable alternatives
6. Procurement tips for the region

Format as a detailed, organized response.`;

  return generateText(prompt, SYSTEM_INSTRUCTION);
}

export function getCategories() {
  return CATEGORIES;
}

export function getCountries() {
  return COUNTRIES;
}

export function formatSuppliersForChat(
  suppliers: Array<Record<string, unknown>>,
  total: number
): string {
  if (suppliers.length === 0) {
    return 'No suppliers found matching your criteria. Try broadening your search.';
  }

  const list = suppliers
    .slice(0, 10)
    .map((s) => {
      const rating = s.rating ? ` ⭐ ${s.rating}` : '';
      const phone = s.phone ? ` | 📞 ${s.phone}` : '';
      return `  - **${s.name}** (${s.city}, ${s.country})${rating}${phone}\n    ${s.category}${s.website ? ` | [Website](${s.website})` : ''}`;
    })
    .join('\n');

  return `## 🏪 Supplier Results (${total} found)

${list}${total > 10 ? `\n\n*Showing 10 of ${total} results.*` : ''}`;
}
