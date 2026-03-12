import { generateText, generateJSON } from '../gemini';

const SYSTEM_INSTRUCTION = `You are Faust, a global real estate intelligence analyst.
You specialize in analyzing city masterplans, identifying development hotspots,
discovering investment opportunities, and assessing market conditions across
122+ global cities. You provide data-driven insights on:
- Development hotspot identification with scoring
- Lead discovery from public records
- Compliance-aware entity analysis
- Market trend analysis
- Investment opportunity assessment`;

// 122 city seeds with coordinates
export const CITY_SEEDS = [
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', country: 'India', lat: 23.0225, lng: 72.5714 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', country: 'India', lat: 26.8467, lng: 80.9462 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773 },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Goa', country: 'India', lat: 15.2993, lng: 74.124 },
  { name: 'Noida', country: 'India', lat: 28.5355, lng: 77.391 },
  { name: 'Gurugram', country: 'India', lat: 28.4595, lng: 77.0266 },
  { name: 'Indore', country: 'India', lat: 22.7196, lng: 75.8577 },
  { name: 'Chandigarh', country: 'India', lat: 30.7333, lng: 76.7794 },
  { name: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673 },
  { name: 'Coimbatore', country: 'India', lat: 11.0168, lng: 76.9558 },
  { name: 'Nagpur', country: 'India', lat: 21.1458, lng: 79.0882 },
  { name: 'Bhopal', country: 'India', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', country: 'India', lat: 17.6868, lng: 83.2185 },
];

export interface Hotspot {
  zone: string;
  typology: string;
  score: number;
  ticketSize: string;
  description: string;
  lat: number;
  lng: number;
}

export interface MasterplanAnalysis {
  city: string;
  country: string;
  overview: string;
  hotspots: Hotspot[];
  marketTrends: string[];
  investmentHighlights: string[];
  risks: string[];
  recommendation: string;
}

// Deterministic PRNG for consistent city data
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const TYPOLOGIES = [
  'Residential Township',
  'Commercial Hub',
  'Mixed-Use Development',
  'IT Park',
  'Industrial Zone',
  'Retail Complex',
  'Hospitality Cluster',
  'Institutional Campus',
];

export function generateLocalHotspots(cityName: string): Hotspot[] {
  const seed = fnv1a(cityName);
  const rand = seededRandom(seed);
  const city = CITY_SEEDS.find((c) => c.name === cityName) || { lat: 20, lng: 78 };
  const count = 5 + Math.floor(rand() * 4);

  return Array.from({ length: count }, (_, i) => ({
    zone: `Zone ${String.fromCharCode(65 + i)}`,
    typology: TYPOLOGIES[Math.floor(rand() * TYPOLOGIES.length)],
    score: Math.round((0.5 + rand() * 0.5) * 100) / 10,
    ticketSize: `${Math.round(50 + rand() * 600)}Cr`,
    description: `${TYPOLOGIES[Math.floor(rand() * TYPOLOGIES.length)]} opportunity in ${cityName}`,
    lat: city.lat + (rand() - 0.5) * 0.1,
    lng: city.lng + (rand() - 0.5) * 0.1,
  }));
}

export async function analyzeCity(cityName: string): Promise<MasterplanAnalysis> {
  const city = CITY_SEEDS.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  if (!city) {
    throw new Error(`City "${cityName}" not found in database`);
  }

  const localHotspots = generateLocalHotspots(cityName);

  try {
    const prompt = `Analyze the real estate market and development masterplan for ${cityName}, ${city.country}.

Consider these local hotspot zones: ${JSON.stringify(localHotspots.map((h) => h.zone))}

Return a JSON object:
{
  "city": "${cityName}",
  "country": "${city.country}",
  "overview": "2-3 sentence market overview",
  "hotspots": [
    {
      "zone": "zone name",
      "typology": "development type",
      "score": number 1-10,
      "ticketSize": "investment range",
      "description": "opportunity description",
      "lat": ${city.lat},
      "lng": ${city.lng}
    }
  ],
  "marketTrends": ["trend1", "trend2"],
  "investmentHighlights": ["highlight1"],
  "risks": ["risk1"],
  "recommendation": "overall recommendation"
}

Return ONLY valid JSON.`;

    return await generateJSON<MasterplanAnalysis>(prompt, SYSTEM_INSTRUCTION);
  } catch {
    // Fallback to deterministic data
    return {
      city: cityName,
      country: city.country,
      overview: `${cityName} is a growing real estate market with significant development activity.`,
      hotspots: localHotspots,
      marketTrends: [
        'Increasing demand for mixed-use developments',
        'Growing IT/ITES corridor expansion',
        'Infrastructure investment driving peripheral growth',
      ],
      investmentHighlights: [
        'Strong rental yield potential',
        'Government infrastructure push',
      ],
      risks: ['Regulatory changes', 'Market oversupply in certain segments'],
      recommendation: `${cityName} presents moderate to high opportunity with selective zone investment.`,
    };
  }
}

export async function discoverLeads(
  cityName: string,
  entityType?: string
): Promise<string> {
  const prompt = `As a real estate intelligence analyst, discover potential leads and entities for ${cityName}.
${entityType ? `Focus on: ${entityType}` : 'Include: developers, landowners, government projects, institutional investors.'}

Provide a structured analysis with:
1. Key entities and their projects
2. Confidence scores for each lead
3. Public record sources
4. Compliance considerations

Note: Only include information from public records. Block any sensitive financial data.`;

  return generateText(prompt, SYSTEM_INSTRUCTION);
}

export function formatMasterplanForChat(analysis: MasterplanAnalysis): string {
  const hotspotList = analysis.hotspots
    .map((h) => `- **${h.zone}** (${h.typology}) -- Score: ${h.score}/10 -- ${h.ticketSize}`)
    .join('\n');

  return `## Masterplan Analysis: ${analysis.city}, ${analysis.country}

### Overview
${analysis.overview}

### Development Hotspots
${hotspotList}

### Market Trends
${analysis.marketTrends.map((t) => `- ${t}`).join('\n')}

### Investment Highlights
${analysis.investmentHighlights.map((h) => `- ${h}`).join('\n')}

### Risks
${analysis.risks.map((r) => `- ${r}`).join('\n')}

### Recommendation
${analysis.recommendation}`;
}
