/**
 * Test Script: Full Video Pipeline
 *
 * 스크립트 → 음성 → 이미지 → 영상 (자막 포함)
 * 전체 파이프라인을 테스트합니다.
 */

import * as path from 'path';
import * as fs from 'fs';
import { createSessionStorage } from '../src/storage/LocalStorageManager.js';
import { getGeminiTTSClient, GeminiVoicePresets } from '../src/clients/gemini-tts.js';
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
  title: '2026년 부동산 투자 전략',
  sections: [
    {
      id: 'sec_01',
      type: 'hook',
      content: '2026년, 대한민국 인구 구조가 거대한 변곡점을 맞이합니다.',
      duration: 5,
      visualNotes: '도시 야경 타임랩스',
    },
    {
      id: 'sec_02',
      type: 'intro',
      content: '안녕하세요. 오늘은 인구 절벽 시대에 살아남을 부동산의 핵심 특징을 분석합니다.',
      duration: 8,
      visualNotes: '전문가 인터뷰 스타일',
    },
    {
      id: 'sec_03',
      type: 'main',
      content: '첫 번째는 일자리 초집중 지역입니다. 판교, 강남, 여의도처럼 고연봉 일자리가 밀집된 곳의 주거지는 하락장에서도 견고합니다.',
      duration: 15,
      visualNotes: '서울 지도 인포그래픽',
    },
    {
      id: 'sec_04',
      type: 'main',
      content: '두 번째는 콤팩트 시티입니다. 병원, 마트, 문화 시설이 한곳에 모인 역세권 중심지로 도시 기능이 압축됩니다.',
      duration: 12,
      visualNotes: '도시 개발 비교 이미지',
    },
    {
      id: 'sec_05',
      type: 'outro',
      content: '결론입니다. 2026년 이후의 부동산은 살아남는 곳만 오르는 시대입니다. 구독과 좋아요 부탁드립니다.',
      duration: 10,
      visualNotes: 'CTA 그래픽',
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
  console.log('🎬 비디오 파이프라인 테스트 (스크립트 → 음성 → 영상 + 자막)');
  console.log('='.repeat(70));

  // 세션 생성
  const storage = createSessionStorage({
    topic: '부동산 투자',
    videoType: 'medium',
  });

  const session = storage.getCurrentSession()!;
  console.log(`\n📁 세션 ID: ${session.id}`);
  console.log(`📂 저장 위치: ${storage.getSessionDir()}`);

  try {
    // ===========================================
    // Step 1: 음성 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎙️ Step 1: 음성 생성 (Gemini TTS)');
    console.log('='.repeat(70));

    const ttsClient = getGeminiTTSClient();
    const voice = GeminiVoicePresets['Kore']; // 한국어 친화적 음성

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

    console.log(`✅ 음성 생성 완료: ${ttsResult.duration.toFixed(1)}초`);
    console.log(`💾 파일: ${ttsResult.fileId}`);
    console.log(`💰 비용: $${ttsResult.cost.toFixed(4)}`);

    const audioPath = path.join(storage.getSessionDir(), 'audio', 'narration.wav');

    // ===========================================
    // Step 2: 장면 이미지 생성 (플레이스홀더)
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🖼️ Step 2: 장면 이미지 생성 (플레이스홀더)');
    console.log('='.repeat(70));

    const thumbnailsDir = path.join(storage.getSessionDir(), 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const scenes: SceneImage[] = [];
    const composer = getVideoComposer();

    for (const section of testScript.sections) {
      const imagePath = path.join(thumbnailsDir, `scene-${section.id}.png`);

      // 플레이스홀더 이미지 생성
      await composer.createTestImage(
        section.type.toUpperCase(),
        imagePath,
        { width: 1920, height: 1080, bgColor: getColorForType(section.type) }
      );

      scenes.push({
        id: section.id,
        imagePath,
        duration: section.duration,
        transition: 'fade',
        transitionDuration: 0.5,
      });

      console.log(`✅ ${section.id}: ${section.type} (${section.duration}초)`);
    }

    console.log(`\n📷 총 ${scenes.length}개 장면 이미지 생성`);

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
        maxCharsPerLine: 40,
        maxLinesPerSubtitle: 2,
      }
    );

    console.log(`✅ ${subtitles.length}개 자막 엔트리 생성`);

    // 자막 미리보기
    console.log('\n📋 자막 미리보기:');
    subtitles.slice(0, 5).forEach((sub, i) => {
      const start = formatTime(sub.startTime);
      const end = formatTime(sub.endTime);
      console.log(`   ${i + 1}. [${start} → ${end}] ${sub.text.substring(0, 30)}...`);
    });

    // ===========================================
    // Step 4: 영상 합성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎬 Step 4: 영상 합성 (FFmpeg)');
    console.log('='.repeat(70));

    const videoResult = await composer.compose({
      scenes,
      audioPath,
      subtitles,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      format: 'mp4',
      outputFilename: 'final-video.mp4',
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

    const assets = storage.getAssets();
    console.log('\n📦 생성된 에셋:');
    assets.forEach(a => {
      console.log(`   ${a.type}: ${a.filename} (${(a.size / 1024).toFixed(1)} KB)`);
    });

    // 세션 완료
    storage.completeSession();

    console.log('\n' + '='.repeat(70));
    console.log('✅ 파이프라인 완료!');
    console.log(`📂 출력 폴더: ${storage.getSessionDir()}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// ===========================================
// 헬퍼 함수
// ===========================================

function getColorForType(type: string): string {
  const colors: Record<string, string> = {
    hook: '#e74c3c',
    intro: '#3498db',
    main: '#2ecc71',
    outro: '#9b59b6',
  };
  return colors[type] || '#34495e';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 실행
main().catch(console.error);
