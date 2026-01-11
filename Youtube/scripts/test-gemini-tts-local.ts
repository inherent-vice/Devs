/**
 * Test Script: Gemini TTS Local Test
 *
 * Gemini 2.5 Flash TTS로 음성을 생성하고 로컬에 저장합니다.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../src/utils/env.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Add WAV header to PCM audio data
 */
function addWavHeader(
  pcmData: Buffer,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎙️ Gemini 2.5 Flash TTS 테스트');
  console.log('='.repeat(70));

  const env = getEnv();
  const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

  // 테스트 텍스트 (짧은 버전)
  const testText = `2026년, 서울에 새 아파트가 사라집니다.
통계가 가리키는 역대급 공급 절벽 시나리오, 2040 세대에게는 위기일까요 기회일까요?
안녕하세요. 오늘은 국토교통부의 인허가 실적과 착공 데이터를 바탕으로
2026년 서울 부동산 시장의 냉혹한 현실을 분석해 보려 합니다.`;

  const voiceName = 'Kore'; // Warm and professional voice
  const stylePrompt = 'Speak in Korean with natural Korean pronunciation. Use a professional YouTube narration style with engaging energy.';

  try {
    console.log(`\n📝 텍스트 길이: ${testText.length}자`);
    console.log(`🎤 음성: ${voiceName}`);
    console.log(`🎨 스타일: ${stylePrompt}\n`);
    console.log('🔄 Gemini TTS 생성 중...\n');

    const startTime = Date.now();

    // Get the TTS model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
    });

    // Generate speech
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `${stylePrompt}\n\n${testText}` }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      } as any,
    });

    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate?.content?.parts?.[0]) {
      throw new Error('No audio content in response');
    }

    const audioPart = candidate.content.parts[0] as any;

    if (!audioPart.inlineData?.data) {
      throw new Error('No audio data in response');
    }

    const audioContent = Buffer.from(audioPart.inlineData.data, 'base64');
    const mimeType = audioPart.inlineData.mimeType || 'audio/wav';
    const duration = Date.now() - startTime;

    // Save to local file
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert PCM to WAV if needed
    let finalAudio = audioContent;
    let ext = 'wav';

    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      // PCM data - add WAV header
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      finalAudio = addWavHeader(audioContent, sampleRate, numChannels, bitsPerSample);
    }

    const outputPath = path.join(outputDir, `gemini-tts-test-${Date.now()}.${ext}`);
    fs.writeFileSync(outputPath, finalAudio);

    // Estimate audio duration (approx 13 chars/sec for Korean)
    const estimatedDuration = testText.length / 13;

    console.log('✅ 음성 생성 완료!\n');
    console.log('='.repeat(70));
    console.log('🎧 결과');
    console.log('='.repeat(70));
    console.log(`\n📁 저장 위치: ${outputPath}`);
    console.log(`📊 파일 크기: ${(audioContent.length / 1024).toFixed(1)} KB`);
    console.log(`🎵 MIME 타입: ${mimeType}`);
    console.log(`⏱️  예상 오디오 길이: ${estimatedDuration.toFixed(1)}초`);
    console.log(`⚡ API 응답 시간: ${(duration / 1000).toFixed(1)}초`);

    // Cost estimation
    const inputTokens = testText.length / 4; // ~4 chars per token
    const outputTokens = audioContent.length / 100; // rough estimate
    const inputCost = (inputTokens / 1_000_000) * 0.50;
    const outputCost = (outputTokens / 1_000_000) * 10.00;
    const totalCost = inputCost + outputCost;

    console.log(`\n💰 예상 비용: $${totalCost.toFixed(6)}`);
    console.log('='.repeat(70));
    console.log('\n🎉 테스트 성공! 오디오 파일을 확인하세요.');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
