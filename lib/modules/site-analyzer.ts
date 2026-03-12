import { generateVisionContent, generateJSON } from '../gemini';

const SYSTEM_INSTRUCTION = `You are an expert construction site analyst and property valuator.
You analyze construction site images to determine:
- Construction stage and progress percentage
- Property/land valuation estimates
- Timeline analysis and completion estimates
- Risk assessments and recommendations
- Material and resource analysis

Always respond with detailed, structured analysis. When providing valuations,
consider location, construction quality, materials visible, and market factors.
Use geography-first reasoning for accurate local market context.`;

export interface SiteAnalysisResult {
  stage: string;
  progressPercent: number;
  timeline: {
    estimated: string;
    remaining: string;
    completionDate: string;
  };
  valuation: {
    currentValue: string;
    projectedValue: string;
    landValue: string;
    constructionCost: string;
  };
  materials: string[];
  riskFactors: string[];
  recommendations: string[];
  quality: string;
  confidence: number;
}

export async function analyzeSiteImage(
  imageBase64: string,
  mimeType: string,
  location?: string,
  currency?: string
): Promise<SiteAnalysisResult> {
  const prompt = `Analyze this construction site image in detail. ${location ? `Location: ${location}.` : ''} ${currency ? `Use ${currency} for all values.` : 'Use INR for values.'}

Return a JSON object with this exact structure:
{
  "stage": "description of current construction stage",
  "progressPercent": number 0-100,
  "timeline": {
    "estimated": "total estimated construction time",
    "remaining": "estimated remaining time",
    "completionDate": "estimated completion date"
  },
  "valuation": {
    "currentValue": "current market value range",
    "projectedValue": "projected value on completion",
    "landValue": "estimated land value",
    "constructionCost": "estimated total construction cost"
  },
  "materials": ["list of visible materials"],
  "riskFactors": ["identified risks"],
  "recommendations": ["actionable recommendations"],
  "quality": "overall quality assessment",
  "confidence": number 0-100
}

Return ONLY valid JSON, no markdown or extra text.`;

  return generateJSON<SiteAnalysisResult>(prompt, SYSTEM_INSTRUCTION);
}

export async function analyzeAdvanced(
  imageBase64: string,
  mimeType: string,
  baseResult: SiteAnalysisResult
): Promise<string> {
  const prompt = `Based on this construction site image and the base analysis below, provide an advanced deviation and risk analysis.

Base Analysis:
${JSON.stringify(baseResult, null, 2)}

Provide:
1. Progress vs ideal comparison
2. Timeline drift analysis
3. Cost risk signals
4. Detailed recommendations for corrective action
5. Quality control observations
6. Safety compliance observations

Format as a detailed report.`;

  return generateVisionContent(prompt, imageBase64, mimeType, SYSTEM_INSTRUCTION);
}

export function formatAnalysisForChat(result: SiteAnalysisResult): string {
  return `## Site Analysis Results

**Stage:** ${result.stage}
**Progress:** ${result.progressPercent}%
**Quality:** ${result.quality}
**Confidence:** ${result.confidence}%

### Timeline
- Estimated total: ${result.timeline.estimated}
- Remaining: ${result.timeline.remaining}
- Expected completion: ${result.timeline.completionDate}

### Valuation
- Current value: ${result.valuation.currentValue}
- Projected value: ${result.valuation.projectedValue}
- Land value: ${result.valuation.landValue}
- Construction cost: ${result.valuation.constructionCost}

### Materials Identified
${result.materials.map((m) => `- ${m}`).join('\n')}

### Risk Factors
${result.riskFactors.map((r) => `- ${r}`).join('\n')}

### Recommendations
${result.recommendations.map((r) => `- ${r}`).join('\n')}`;
}
