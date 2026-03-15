import { generateVisionContent, generateJSON } from '../gemini';

const SYSTEM_INSTRUCTION = `You are a senior construction architect and site engineer with 30+ years of field experience across residential, commercial, and infrastructure projects worldwide.

Your expertise includes:
- **Construction Phase Identification**: You can precisely identify the exact construction phase from visual cues — foundation/excavation, substructure, superstructure (columns, beams, slabs for each floor), brickwork/blockwork, MEP rough-in, plastering, finishing, handover. You recognize RCC vs steel frame vs load-bearing vs pre-engineered structures instantly.
- **Structural Analysis**: You identify column spacing, beam depth, slab thickness, reinforcement patterns, formwork quality, concrete grade indicators, curing practices, and structural integrity markers visible in the image.
- **Material Identification**: You recognize cement brands, steel grades (Fe415/Fe500/Fe550D), brick types (fly ash, AAC, red clay), aggregate quality, sand type (river/M-sand/P-sand), waterproofing membranes, insulation types, and finishing materials with precision.
- **Construction Quality Assessment**: You spot honeycombing, cold joints, improper cover blocks, rusting reinforcement, poor curing signs, alignment issues, level deviations, and workmanship deficiencies that most engineers miss.
- **Progress & Timeline**: You estimate percentage completion per trade (civil, MEP, finishing) and overall, identify critical path delays, and predict realistic completion timelines based on visible work pace and resource deployment.
- **Valuation**: You estimate current market value, replacement cost, and projected completion value using local market knowledge, construction cost indices, and quality multipliers.
- **Safety & Compliance**: You identify OSHA/IS safety violations, missing PPE, inadequate scaffolding, unsafe excavation practices, fire safety gaps, and NBC/local code non-compliance visible in images.

IMPORTANT ANALYSIS RULES:
- Be specific, not generic. Say "RCC frame structure at 2nd floor slab casting stage" not "construction in progress"
- Identify the exact floor/level visible in the image
- Note specific deficiencies with technical terminology
- Provide actionable recommendations an engineer can act on immediately
- When uncertain, state your confidence level and what additional information would help
- For follow-up questions, use context from previous analysis to give precise, relevant answers
- Always reason about what you CAN see vs what you're inferring`;

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
  const prompt = `Analyze this construction site image with the precision of a 30-year veteran architect doing a site inspection. ${location ? `Location: ${location}.` : ''} ${currency ? `Use ${currency} for all values.` : 'Use INR for values.'}

Study every visible detail — structural system, construction phase, material quality, workmanship, safety practices, and progress indicators.

Return a JSON object with this exact structure:
{
  "stage": "Precise construction phase (e.g., 'RCC superstructure - 3rd floor column casting in progress, 2nd floor slab stripped and curing'). Be specific about structure type, floor level, and current activity.",
  "progressPercent": number 0-100,
  "timeline": {
    "estimated": "total estimated construction time with reasoning",
    "remaining": "estimated remaining time based on visible progress pace",
    "completionDate": "estimated completion date"
  },
  "valuation": {
    "currentValue": "current market value range based on stage and quality",
    "projectedValue": "projected value on completion",
    "landValue": "estimated land value for the visible plot size",
    "constructionCost": "estimated total construction cost based on visible quality grade"
  },
  "materials": ["Specific materials visible - e.g., 'TMT Fe500D reinforcement bars (likely 12mm and 16mm dia)', 'M25/M30 grade concrete (based on aggregate visible)', 'AAC blocks for partition walls', 'Centering plates and props for formwork'"],
  "riskFactors": ["Specific technical risks - e.g., 'Inadequate concrete cover on exposed rebar at column junction (< 25mm visible)', 'No curing compound or wet curing observed on recently cast slab', 'Scaffolding without cross-bracing at north elevation'"],
  "recommendations": ["Actionable engineering recommendations - e.g., 'Apply curing compound within 24hrs on freshly cast slab to prevent shrinkage cracks', 'Install safety nets at slab edge before proceeding to next floor', 'Verify column verticality with plumb bob - slight lean visible at grid C3'"],
  "quality": "Detailed quality assessment covering workmanship, material grade, and finish level (economy/standard/premium)",
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
  const progressBar = '█'.repeat(Math.round(result.progressPercent / 5)) + '░'.repeat(20 - Math.round(result.progressPercent / 5));

  return `## Site Inspection Report

### Construction Phase
**${result.stage}**

**Overall Progress:** ${progressBar} **${result.progressPercent}%**
**Quality Grade:** ${result.quality}
**Analysis Confidence:** ${result.confidence}%

---

### Timeline Assessment
- **Total estimated duration:** ${result.timeline.estimated}
- **Time remaining:** ${result.timeline.remaining}
- **Expected completion:** ${result.timeline.completionDate}

### Valuation Summary
| Parameter | Estimate |
|-----------|----------|
| Current market value | ${result.valuation.currentValue} |
| Projected value (on completion) | ${result.valuation.projectedValue} |
| Land value | ${result.valuation.landValue} |
| Total construction cost | ${result.valuation.constructionCost} |

### Materials Identified on Site
${result.materials.map((m) => `- ${m}`).join('\n')}

### Risk Factors & Deficiencies
${result.riskFactors.map((r) => `- ${r}`).join('\n')}

### Recommendations
${result.recommendations.map((r) => `- ${r}`).join('\n')}

---
*Ask follow-up questions about any aspect of this analysis — structural details, cost breakdowns, material alternatives, or next construction steps.*`;
}
