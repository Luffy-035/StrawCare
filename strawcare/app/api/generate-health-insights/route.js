import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request) {
  try {
    const { health_score, questionnaire_data } = await request.json();

    if (!health_score || !questionnaire_data) {
      return NextResponse.json(
        { error: 'Health score and questionnaire data are required' },
        { status: 400 }
      );
    }

    // Create a comprehensive prompt for health insights
    const prompt = createHealthInsightsPrompt(health_score, questionnaire_data);

    console.log('Calling Groq AI for health insights...');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional health and wellness AI advisor. Provide personalized, evidence-based health recommendations based on user data. Always be encouraging and focus on practical, achievable improvements. Format your response as valid JSON only.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant", // You can change this to other Groq models
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    let insights;
    try {
      insights = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', responseContent);
      throw new Error('Invalid JSON response from AI');
    }

    return NextResponse.json({ insights });

  } catch (error) {
    console.error('Error generating health insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate health insights: ' + error.message },
      { status: 500 }
    );
  }
}

function createHealthInsightsPrompt(healthScore, questionnaireData) {
  const { responses, categories } = questionnaireData;
  
  return `
Based on the following health assessment data, provide personalized health insights and recommendations:

HEALTH SCORE: ${healthScore}/100

QUESTIONNAIRE RESPONSES:
${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}

CATEGORY SCORES:
${Object.entries(categories || {}).map(([key, value]) => `${key}: ${value}/100`).join('\n')}

Please provide your response in the following JSON format:
{
  "overall_assessment": "A comprehensive 2-3 sentence assessment of their current health status and what the score indicates",
  "recommendations": [
    {
      "title": "Specific actionable recommendation title",
      "description": "Detailed explanation of what to do and why",
      "priority": "High|Medium|Low",
      "expected_impact": "Brief description of expected health improvement"
    }
  ],
  "focus_areas": ["Area 1", "Area 2", "Area 3"],
  "motivational_message": "Encouraging message to motivate the user"
}

Focus on:
1. The lowest scoring categories need the most attention
2. Provide 3-5 specific, actionable recommendations
3. Be encouraging and realistic
4. Consider interconnections between different health aspects
5. Prioritize recommendations by potential impact

Respond only with valid JSON, no additional text.
`;
}
