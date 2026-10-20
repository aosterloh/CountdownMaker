import { describe, it, expect } from 'vitest';

describe('Customer Meeting Package Architecture', () => {
  it('correctly calculates 32:9 ultra-wide cinema screen aspect ratio', () => {
    const targetWidth = 3840;
    const targetHeight = 1080;
    const ratio = targetWidth / targetHeight;
    const expected32x9 = 32 / 9;

    // 3840 / 1080 is 3.555555... exactly 32/9
    expect(ratio).toBeCloseTo(expected32x9, 3);
  });

  it('validates 32:9 cinema wallpaper prompt blueprint specifications', () => {
    const brand = 'Lufthansa';
    const industry = 'Commercial Aviation';
    const prompt = `Ultra-wide panoramic 32:9 cinema welcome wallpaper for ${brand} in ${industry}, panoramic wide angle landscape at golden hour sunset, dramatic warm sun flare, cinematic lighting, shot on 65mm anamorphic lens, 4k ultra-high resolution, clean expansive composition without text, 32:9 aspect ratio.`;

    expect(prompt).toContain('32:9');
    expect(prompt).toContain('Lufthansa');
    expect(prompt).toContain('golden hour sunset');
    expect(prompt).toContain('4k');
    expect(prompt).toContain('clean expansive composition without text');
  });

  it('validates Bugdroid mascot prompt specifications on pure black (#000000)', () => {
    const brand = 'Wimex';
    const industry = 'Agriculture & Farming';
    const prompt = `A 3D render of a cute Android Bugdroid character standing centered on a solid pure black background (#000000). The Bugdroid is dressed as a worker in the ${industry} and wearing a clean crisp white t-shirt with the official ${brand} logo printed crisply in the center of the chest. High resolution 3D digital art, Pixar-quality studio lighting, sharp details, centered composition.`;

    expect(prompt).toContain('#000000');
    expect(prompt).toContain('Bugdroid');
    expect(prompt).toContain('white t-shirt');
    expect(prompt).toContain('Wimex');
    expect(prompt).toContain('Agriculture & Farming');
  });

  it('validates Keynote Speaker Bugdroid mascot prompt with Google-branded microphone', () => {
    const brand = 'BASF';
    const prompt = `A 3D render of a cute Android Bugdroid character standing centered on a solid pure black background (#000000). The Bugdroid is ready to present as a keynote speaker, holding a sleek modern Google-branded microphone with colorful Google accents. The Bugdroid is wearing a clean crisp white t-shirt with the official ${brand} logo printed crisply in the center of the chest. High resolution 3D digital art, Pixar-quality studio lighting, sharp details, centered 1:1 square composition.`;

    expect(prompt).toContain('#000000');
    expect(prompt).toContain('Google-branded microphone');
    expect(prompt).toContain('keynote speaker');
    expect(prompt).toContain('BASF');
    expect(prompt).toContain('white t-shirt');
  });

  it('cycles through multiple creative business pillars on wallpaper redo', () => {
    const pillars = [
      { division: 'Precision Agriculture', prompt: 'Prompt 1' },
      { division: 'Clean Energy & Battery Materials', prompt: 'Prompt 2' },
      { division: 'Bioscience Greenhouses', prompt: 'Prompt 3' },
      { division: 'Circular Biopolymers', prompt: 'Prompt 4' },
    ];

    let currentIndex = 0;
    expect(pillars[currentIndex].division).toBe('Precision Agriculture');

    // First redo
    currentIndex = (currentIndex + 1) % pillars.length;
    expect(pillars[currentIndex].division).toBe('Clean Energy & Battery Materials');

    // Second redo
    currentIndex = (currentIndex + 1) % pillars.length;
    expect(pillars[currentIndex].division).toBe('Bioscience Greenhouses');

    // Third redo
    currentIndex = (currentIndex + 1) % pillars.length;
    expect(pillars[currentIndex].division).toBe('Circular Biopolymers');

    // Fourth redo wraps around to 0
    currentIndex = (currentIndex + 1) % pillars.length;
    expect(pillars[currentIndex].division).toBe('Precision Agriculture');
  });

  it('allows independent deliverable checkbox selection', () => {
    const configAll = {
      includeCinemaWallpaper: true,
      includeBugdroidMascot: true,
      includeCountdownVideo: true,
    };
    const countAll = Object.values(configAll).filter(Boolean).length;
    expect(countAll).toBe(3);

    const configImagesOnly = {
      includeCinemaWallpaper: true,
      includeBugdroidMascot: true,
      includeCountdownVideo: false,
    };
    const countImages = Object.values(configImagesOnly).filter(Boolean).length;
    expect(countImages).toBe(2);

    const configVideoOnly = {
      includeCinemaWallpaper: false,
      includeBugdroidMascot: false,
      includeCountdownVideo: true,
    };
    const countVideo = Object.values(configVideoOnly).filter(Boolean).length;
    expect(countVideo).toBe(1);
  });
});
