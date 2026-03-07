import { describe, it, expect } from 'vitest';
import { analyzeAndSplitText } from '../services/sceneAnalyzer';

describe('analyzeAndSplitText', () => {
  it('should split a simple text into scenes', async () => {
    const text = `The old wizard stood atop the tower, gazing at the stars. His long beard swayed in the cold wind.

The young apprentice ran through the dark forest. Strange sounds echoed between the ancient trees. She knew she had to reach the castle before dawn.

In the great hall, the king sat upon his throne. His advisors whispered nervously. War was coming, and they all knew it.

The dragon emerged from the mountain, spreading its wings against the crimson sky. Fire erupted from its jaws, illuminating the valley below.`;

    const scenes = await analyzeAndSplitText(text, 10);

    expect(scenes.length).toBeGreaterThanOrEqual(2);
    expect(scenes.length).toBeLessThanOrEqual(10);

    for (const scene of scenes) {
      expect(scene.title).toBeTruthy();
      expect(scene.textContent).toBeTruthy();
      expect(scene.imagePrompt).toBeTruthy();
      expect(scene.duration).toBeGreaterThanOrEqual(5);
      expect(scene.duration).toBeLessThanOrEqual(30);
      expect(Array.isArray(scene.characters)).toBe(true);
      expect(scene.location).toBeTruthy();
      expect(scene.mood).toBeTruthy();
    }
  });

  it('should handle very short text', async () => {
    const text = 'A single sentence about a lonely traveler walking through the rain.';
    const scenes = await analyzeAndSplitText(text, 5);

    expect(scenes.length).toBeGreaterThanOrEqual(1);
    expect(scenes[0].textContent).toBeTruthy();
  });

  it('should respect maxScenes limit', async () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) =>
      `This is paragraph ${i + 1}. It contains enough text to be considered a meaningful segment of content.`
    ).join('\n\n');

    const scenes = await analyzeAndSplitText(paragraphs, 5);
    expect(scenes.length).toBeLessThanOrEqual(5);
  });

  it('should not exceed total duration limit', async () => {
    const text = Array.from({ length: 30 }, (_, i) =>
      `Scene ${i}: A long descriptive passage about various events happening in sequence with many details and vivid imagery that creates a rich tapestry of narrative.`
    ).join('\n\n');

    const scenes = await analyzeAndSplitText(text, 30);
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    expect(totalDuration).toBeLessThanOrEqual(180);
  });

  it('should detect mood from text', async () => {
    const text = 'The hero fought bravely in the great battle. Armies clashed and kingdoms fell. It was a war that would shape destiny forever.';
    const scenes = await analyzeAndSplitText(text, 3);
    // Epic or tense mood expected
    expect(['epic', 'tense', 'neutral']).toContain(scenes[0].mood);
  });
});
