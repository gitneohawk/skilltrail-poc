import { DiagnosisResult } from '@/types/diagnosis-result';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o'; // or 'gpt-4o', 'gpt-4-turbo' etc.

export async function callOpenAI(prompt: string): Promise<DiagnosisResult> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'あなたは優秀なキャリア診断AIです。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error', await response.text());
    throw new Error('Failed to get response from OpenAI');
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  try {
    const cleanText = text.replace(/```json|```/g, '').trim();
    const result: DiagnosisResult = JSON.parse(cleanText);
    return result;
  } catch (err) {
    console.error('Failed to parse OpenAI response:', text);
    throw new Error('Invalid AI response format');
  }
}
