import { generateText } from '../gemini';
import type { FloorPlan } from './floorplan-generator';

const SYSTEM_INSTRUCTION = `You are VitruviAI, an expert AI architect.`;

export async function generateInsights(plan: FloorPlan): Promise<string> {
  const prompt = `Analyze this floor plan and provide architectural insights:

${JSON.stringify(plan, null, 2)}

Provide:
1. Space efficiency analysis
2. Natural light and ventilation assessment
3. Vastu/Feng Shui compliance (if applicable)
4. Accessibility observations
5. Cost optimization suggestions
6. Material recommendations with estimated costs
7. MEP (Mechanical, Electrical, Plumbing) suggestions`;

  return generateText(prompt, SYSTEM_INSTRUCTION);
}
