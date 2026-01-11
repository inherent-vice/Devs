/**
 * Test Script: Nano Banana Pro Full Pipeline
 *
 * 스크립트 → Nano Banana Pro 이미지 → Gemini TTS 음성 → FFmpeg 영상 합성
 * 전체 파이프라인을 Nano Banana Pro와 함께 테스트합니다.
 */

import * as path from 'path';
import * as fs from 'fs';
import { createSessionStorage } from '../src/storage/LocalStorageManager.js';
import { getGeminiTTSClient, GeminiVoicePresets } from '../src/clients/gemini-tts.js';
import { getNanoBananaClient } from '../src/clients/nano-banana.js';
import {
  getVideoComposer,
  scriptToSubtitles,
  type SceneImage,
  type SubtitleEntry,
} from '../src/clients/video-composer.js';

// ===========================================
// 테스트 스크립트 데이터
// ===========================================

const testScript = {
  title: 'AI 시대의 부동산 투자',
  sections: [
    {
      id: 'sec_01',
      type: 'hook',
      content: '2026년, AI가 부동산 시장을 완전히 바꿔놓고 있습니다.',
      duration: 5,
      prompt: 'Futuristic city skyline with holographic AI displays overlaying buildings, neon blue and purple colors',
      visualNotes: 'Cinematic drone shot of Seoul at night with AI overlays',
    },
    {
      id: 'sec_02',
      type: 'intro',
      content: '안녕하세요. 오늘은 AI 기술이 부동산 투자에 미치는 영향을 분석합니다.',
      duration: 8,
      prompt: 'Professional news anchor style studio with modern holographic screens showing real estate data and AI graphs',
      visualNotes: 'Modern studio with data visualization',
    },
    {
      id: 'sec_03',
      type: 'main',
      content: 'AI 예측 모델은 인간보다 정확하게 부동산 가격을 예측합니다. 빅데이터와 머신러닝의 결합입니다.',
      duration: 12,
      prompt: 'Abstract visualization of AI neural network analyzing city buildings and real estate data, digital matrix style',
      visualNotes: 'AI/ML visualization with building data',
    },
    {
      id: 'sec_04',
      type: 'outro',
      content: '다음 영상에서는 구체적인 AI 투자 전략을 다루겠습니다. 구독과 좋아요 부탁드립니다.',
      duration: 8,
      prompt: 'Split screen showing AI robot handshake with human investor, modern office background with city view',
      visualNotes: 'Human-AI collaboration concept',
    },
  ],
  fullText: '',
};

// Combine all content
testScript.fullText = testScript.sections.map(s => s.content).join(' ');

// ===========================================
// 메인 테스트 함수
// ===========================================

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 Nano Banana Pro 전체 파이프라인 테스트');
  console.log('='.repeat(70));

  // 세션 생성
  const storage = createSessionStorage({
    topic: 'AI 부동산 투자',
    videoType: 'medium',
  });

  const session = storage.getCurrentSession()!;
  console.log(`\n📁 세션 ID: ${session.id}`);
  console.log(`📂 저장 위치: ${storage.getSessionDir()}`);

  const costs: { phase: string; cost: number }[] = [];
  const startTime = Date.now();

  try {
    // ===========================================
    // Step 1: Nano Banana Pro 이미지 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🖼️ Step 1: Nano Banana Pro 이미지 생성');
    console.log('='.repeat(70));

    const nanoBanana = getNanoBananaClient();
    const scenes: SceneImage[] = [];
    let imageCost = 0;

    for (const section of testScript.sections) {
      console.log(`\n📷 ${section.id}: ${section.type}`);
      console.log(`   프롬프트: ${section.prompt.substring(0, 60)}...`);

      const result = await nanoBanana.generateSceneImage({
        id: section.id,
        prompt: section.prompt,
        visualNotes: section.visualNotes,
        style: 'Cinematic, professional, YouTube thumbnail quality',
        aspectRatio: '16:9',
        duration: section.duration,
      });

      scenes.push({
        id: result.id,
        imagePath: result.imagePath,
        duration: section.duration,
        transition: 'fade',
        transitionDuration: 0.5,
      });

      imageCost += result.cost;
      console.log(`   ✅ 생성 완료: ${result.filename} ($${result.cost.toFixed(2)})`);
    }

    costs.push({ phase: 'images', cost: imageCost });
    console.log(`\n📊 이미지 생성 완료: ${scenes.length}개, 총 비용: $${imageCost.toFixed(2)}`);

    // ===========================================
    // Step 2: Gemini TTS 음성 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎙️ Step 2: Gemini TTS 음성 생성');
    console.log('='.repeat(70));

    const ttsClient = getGeminiTTSClient();
    const voice = GeminiVoicePresets['Kore'];

    console.log(`📢 음성: ${voice.name} (${voice.description})`);
    console.log(`📝 텍스트 길이: ${testScript.fullText.length}자`);

    const ttsResult = await ttsClient.synthesizeAndUpload(
      {
        text: testScript.fullText,
        voice,
        language: 'ko',
        speakingRate: 1.0,
      },
      session.id,
      'narration.wav'
    );

    costs.push({ phase: 'voice', cost: ttsResult.cost });
    console.log(`✅ 음성 생성 완료: ${ttsResult.duration.toFixed(1)}초, $${ttsResult.cost.toFixed(4)}`);

    const audioPath = path.join(storage.getSessionDir(), 'audio', 'narration.wav');

    // ===========================================
    // Step 3: 자막 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 Step 3: 자막 생성');
    console.log('='.repeat(70));

    const subtitles: SubtitleEntry[] = scriptToSubtitles(
      testScript.sections.map(s => ({
        id: s.id,
        content: s.content,
        duration: s.duration,
      })),
      {
        language: 'korean',  // YouTube 최적화 한국어 자막 설정 사용
        // maxCharsPerLine: 18 (한국어 기본값)
        // targetCPS: 9 (초당 9자)
      }
    );

    console.log(`✅ ${subtitles.length}개 자막 엔트리 생성`);

    // ===========================================
    // Step 4: FFmpeg 영상 합성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎬 Step 4: FFmpeg 영상 합성');
    console.log('='.repeat(70));

    const composer = getVideoComposer();

    const videoResult = await composer.compose({
      scenes,
      audioPath,
      subtitles,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      format: 'mp4',
      outputFilename: 'nano-banana-video.mp4',
    });

    console.log(`\n✅ 영상 합성 완료!`);
    console.log(`📹 파일: ${videoResult.videoPath}`);
    console.log(`⏱️  길이: ${videoResult.duration.toFixed(1)}초`);
    console.log(`💾 크기: ${(videoResult.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔊 오디오: ${videoResult.hasAudio ? '포함' : '없음'}`);
    console.log(`📝 자막: ${videoResult.hasSubtitles ? '포함' : '없음'}`);

    // ===========================================
    // 결과 요약
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 최종 결과');
    console.log('='.repeat(70));

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalDuration = (Date.now() - startTime) / 1000;

    console.log('\n💰 비용 내역:');
    costs.forEach(c => {
      console.log(`   ${c.phase}: $${c.cost.toFixed(4)}`);
    });
    console.log(`   ────────────────`);
    console.log(`   합계: $${totalCost.toFixed(4)}`);

    console.log(`\n⏱️  총 소요 시간: ${totalDuration.toFixed(1)}초`);

    // 생성된 에셋 목록
    const assets = storage.getAssets();
    console.log('\n📦 생성된 에셋:');
    assets.forEach(a => {
      console.log(`   ${a.type}: ${a.filename} (${(a.size / 1024).toFixed(1)} KB)`);
    });

    // 세션 완료
    storage.saveResult({
      title: testScript.title,
      costs,
      totalCost,
      totalDuration,
      videoPath: videoResult.videoPath,
      sceneCount: scenes.length,
    });
    storage.completeSession();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Nano Banana Pro 파이프라인 완료!');
    console.log(`📂 출력 폴더: ${storage.getSessionDir()}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);

    // 오류 시 플레이스홀더로 폴백
    if ((error as Error).message?.includes('No image data')) {
      console.log('\n⚠️  Nano Banana Pro API 실패, 플레이스홀더 사용 중...');
      console.log('   (API 키 확인 또는 할당량 확인 필요)');
    }

    process.exit(1);
  }
}

// 실행
main().catch(console.error);
