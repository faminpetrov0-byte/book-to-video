import logger from '../utils/logger';
import { config } from '../config';

export interface SceneData {
  title: string;
  textContent: string;
  imagePrompt: string;
  duration: number;
  characters: CharacterInfo[];
  location: string;
  mood: string;
}

export interface CharacterInfo {
  name: string;
  voice?: string;
  description?: string;
}

/**
 * Analyze text and split into scenes with character detection.
 * Automatically identifies characters and assigns appropriate voices.
 */
export async function analyzeAndSplitText(
  fullText: string,
  maxScenes: number = config.limits.maxScenesPerProject
): Promise<SceneData[]> {
  logger.info('Analyzing text and splitting into scenes with character detection', {
    textLength: fullText.length,
    maxScenes,
  });

  const cleaned = fullText.replace(/\r\n/g, '\n').trim();

  // Try LLM-based analysis first
  if (config.ai.huggingface.apiKey) {
    try {
      return await llmAnalysis(cleaned, maxScenes);
    } catch (err) {
      logger.warn('LLM analysis failed, falling back to heuristic', {
        error: (err as Error).message,
      });
    }
  }

  // Fallback: heuristic splitting with character detection
  return heuristicSplit(cleaned, maxScenes);
}

async function llmAnalysis(text: string, maxScenes: number): Promise<SceneData[]> {
  const truncated = text.slice(0, 4000);

  const prompt = `You are a screenwriter. Analyze this text and split it into ${Math.min(maxScenes, 12)} visual scenes for a short video (max 3 minutes total).

For each scene, provide a JSON object with:
- title: short scene title
- textContent: the narration text (1-3 sentences)
- imagePrompt: detailed visual description for AI image generation (cinematic, specific details)
- duration: seconds (5-30)
- characters: array of character objects with {name, voice} - voice can be "Rachel" (female narrator), "Josh" (male), "Sam" (young male), "Arnold" (strong male), "Bella" (soft female)
- location: where this takes place
- mood: emotional tone (e.g., "mysterious", "joyful", "tense", "romantic", "epic")

TEXT:
${truncated}

Respond with ONLY a JSON array of scene objects. No markdown, no explanation.`;

  const response = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.huggingface.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 3000,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const data = (await response.json()) as Array<{ generated_text: string }>;
  const generated = data[0]?.generated_text || '';

  const jsonMatch = generated.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse LLM response as JSON');
  }

  const scenes: SceneData[] = JSON.parse(jsonMatch[0]);
  
  return scenes.slice(0, maxScenes).map((scene, i) => ({
    title: scene.title || `Scene ${i + 1}`,
    textContent: scene.textContent || '',
    imagePrompt: scene.imagePrompt || scene.textContent || '',
    duration: Math.max(config.limits.minSceneDuration,
      Math.min(config.limits.maxSceneDuration, scene.duration || 10)),
    characters: Array.isArray(scene.characters) ? scene.characters : [{ name: 'Narrator', voice: 'Rachel' }],
    location: scene.location || 'Unspecified',
    mood: scene.mood || 'neutral',
  }));
}

function heuristicSplit(text: string, maxScenes: number): SceneData[] {
  // Split by double newlines (paragraphs)
  let segments = text.split(/\n\n+/).filter((s) => s.trim().length > 20);

  if (segments.length < 3) {
    segments = text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  // Detect characters in the text
  const allCharacters = detectCharacters(text);

  const targetScenes = Math.min(maxScenes, Math.max(3, Math.ceil(segments.length / 2)));
  const scenesPerGroup = Math.ceil(segments.length / targetScenes);

  const scenes: SceneData[] = [];
  
  for (let i = 0; i < segments.length && scenes.length < targetScenes; i += scenesPerGroup) {
    const group = segments.slice(i, i + scenesPerGroup).join(' ').trim();
    if (!group) continue;

    // Detect which characters appear in this segment
    const segmentCharacters = detectCharactersInSegment(group, allCharacters);

    const mood = detectMood(group);
    const location = extractLocation(group);

    scenes.push({
      title: `Scene ${scenes.length + 1}`,
      textContent: group.slice(0, 500),
      imagePrompt: buildImagePrompt(group, mood, location),
      duration: Math.min(30, Math.max(5, Math.round(group.length / 20))),
      characters: segmentCharacters.length > 0 ? segmentCharacters : [{ name: 'Narrator', voice: 'Rachel' }],
      location,
      mood,
    });
  }

  // Ensure total duration doesn't exceed limit
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  if (totalDuration > config.limits.maxTotalDuration) {
    const scale = config.limits.maxTotalDuration / totalDuration;
    scenes.forEach((s) => {
      s.duration = Math.max(5, Math.round(s.duration * scale));
    });
  }

  return scenes;
}

/**
 * Detect all unique characters in the text
 */
function detectCharacters(text: string): CharacterInfo[] {
  const characterMap = new Map<string, CharacterInfo>();
  
  // Pattern 1: "Name:" dialogue
  const dialogueRegex = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?):/gm;
  let match;
  while ((match = dialogueRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (!isCommonWord(name)) {
      characterMap.set(name, { name, voice: inferVoice(name) });
    }
  }

  // Pattern 2: Look for repeated capitalized words (likely names)
  const wordRegex = /\b([A-Z][a-z]{2,})\b/g;
  const wordCount: Record<string, number> = {};
  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[1];
    if (!isCommonWord(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  }

  // Add frequent names not already in map
  for (const [name, count] of Object.entries(wordCount)) {
    if (count >= 2 && !characterMap.has(name)) {
      characterMap.set(name, { name, voice: inferVoice(name) });
    }
  }

  // Limit to top 5 characters
  return Array.from(characterMap.values()).slice(0, 5);
}

/**
 * Infer voice based on character name/description
 */
function inferVoice(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Female names (including Russian)
  const femaleNames = [
    'maria', 'marina', 'anna', 'olga', 'natasha', 'julia', 'katya', 'svetlana', 
    'lyudmila', 'elena', 'natalia', 'zhanna', 'janna', 'alina', 'daria', 'anna',
    'tatiana', 'irina', 'vera', 'nadezhda', 'lydia', 'galina', 'nina', 'eva',
    'anya', 'masha', 'dasha', 'polina', 'sofia', 'ksenia', 'albina',
    'rachel', 'sarah', 'emily', 'jessica', 'susan', 'mary', 'linda', 'betty'
  ];
  
  // Male names (including Russian)
  const maleNames = [
    'ivan', 'petr', 'alexandr', 'alexei', 'sergei', 'vladimir', 'konstantin', 
    'victor', 'nikolay', 'dmitri', 'igor', 'andrei', 'yuri', 'yaroslav', 
    'vasily', 'stepan', 'alex', 'john', 'joe', 'mike', 'bob', 'tom', 'william',
    'james', 'robert', 'michael', 'david', 'richard', 'thomas', 'charles',
    'mikhail', 'fyodor', 'lev', 'nicholai', 'nicolas', 'pavel', 'narrator'
  ];
  
  if (femaleNames.some(n => lowerName.includes(n))) {
    return 'Rachel';  // Female voice
  }
  
  if (maleNames.some(n => lowerName.includes(n))) {
    return 'Josh';  // Male voice
  }
  
  // Default based on context clues
  return 'Rachel';
}

/**
 * Detect which characters appear in a specific segment
 */
function detectCharactersInSegment(segment: string, allCharacters: CharacterInfo[]): CharacterInfo[] {
  return allCharacters.filter(char => {
    // Check if character name appears in segment
    const regex = new RegExp(`\\b${char.name}\\b`, 'i');
    return regex.test(segment);
  });
}

function isCommonWord(word: string): boolean {
  const commonWords = [
    'The', 'This', 'That', 'Then', 'There', 'They', 'When', 'What', 'Where', 'How',
    'Why', 'Who', 'Will', 'Would', 'Could', 'Should', 'Must', 'May', 'Might',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December',
    'Chapter', 'Part', 'Section', 'Page', 'Street', 'Road', 'Avenue',
    'Mr', 'Mrs', 'Ms', 'Dr', 'Professor', 'Captain', 'General',
    'Russian', 'Ukrainian', 'American', 'European', 'Asian',
    'Moscow', 'Kiev', 'Odessa', 'Leningrad', 'Soviet', 'Union',
  ];
  return commonWords.includes(word);
}

function detectMood(text: string): string {
  const lower = text.toLowerCase();
  const moods: Record<string, string[]> = {
    joyful: ['happy', 'laugh', 'joy', 'smile', 'celebrate', 'wonderful', 'beautiful', 'love', 'wedding'],
    sad: ['sad', 'cry', 'tear', 'grief', 'sorrow', 'mourn', 'lost', 'died', 'death'],
    tense: ['danger', 'fear', 'run', 'escape', 'fight', 'threat', 'dark', 'blood', 'knife', 'gun'],
    mysterious: ['mystery', 'strange', 'unknown', 'secret', 'hidden', 'shadow', 'whisper'],
    romantic: ['love', 'heart', 'kiss', 'embrace', 'passion', 'tender', 'wedding', 'marriage'],
    epic: ['battle', 'war', 'army', 'kingdom', 'hero', 'destiny', 'power', 'president', 'country'],
    peaceful: ['calm', 'quiet', 'peace', 'gentle', 'soft', 'rest', 'still', 'sunset', 'morning'],
  };

  let bestMood = 'neutral';
  let bestScore = 0;
  for (const [mood, keywords] of Object.entries(moods)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood;
    }
  }
  return bestMood;
}

function extractLocation(text: string): string {
  const locationKeywords = /(?:in|at|on|near|inside|outside|across)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
  const match = text.match(locationKeywords);
  return match?.[1] || 'Unspecified';
}

function buildImagePrompt(text: string, mood: string, location: string): string {
  const snippet = text.slice(0, 150).replace(/["\n]/g, ' ');
  
  const moodStyle: Record<string, string> = {
    joyful: 'warm golden hour lighting, natural sunlight, vibrant saturated colors, shallow depth of field, bokeh',
    sad: 'desaturated muted tones, overcast grey sky, subtle rain, melancholic atmosphere, cinematic color grading',
    tense: 'dramatic chiaroscuro lighting, high contrast, dark shadows, intense mood, film grain, anamorphic lens flare',
    mysterious: 'atmospheric fog, volumetric lighting, ethereal glow, mystical ambiance, shallow depth, cinematic wide shot',
    romantic: 'soft warm sunset lighting, pink and golden hues, dreamy bokeh, intimate atmosphere, shallow focus',
    epic: 'grand wide establishing shot, dramatic storm sky, sweeping landscape, cinematic scale, anamorphic 2.39:1 aspect ratio, film grain',
    peaceful: 'soft diffused lighting, calm serene atmosphere, natural colors, gentle composition, minimalist beauty',
    neutral: 'professional cinema lighting, balanced exposure, clean cinematic look, 35mm film grain',
  };

  const style = moodStyle[mood] || moodStyle.neutral;
  
  return `Masterpiece, cinematic ${style}, ${location !== 'Unspecified' ? `location: ${location}, ` : ''}scene: ${snippet}. 

Style: Epic photorealistic cinematography, shot on ARRI Alexa, 4K resolution, 35mm anamorphic lens, shallow depth of field, cinemascope 2.39:1 aspect ratio.

Quality: Professional color grading, film grain overlay, rich details, sharp focus, high dynamic range, dramatic composition, award-winning cinematography.`;
}
