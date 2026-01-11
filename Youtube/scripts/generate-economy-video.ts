/**
 * 5분 경제 영상 전체 생성
 *
 * Nano Banana Pro 이미지 + Gemini TTS 음성 + FFmpeg 합성
 * YouTube 최적화 자막 포함
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
// 5분 경제 영상 스크립트
// ===========================================

const economyScript = {
  title: '2026년 글로벌 경제 전망: AI가 바꾸는 미래',
  description: 'AI 기술 혁명이 가져올 경제 변화와 투자 전략',

  sections: [
    // Hook (0:00 - 0:15)
    {
      id: 'hook',
      type: 'hook',
      content: '2026년, 전 세계 경제가 거대한 변화의 소용돌이에 빠져들고 있습니다. AI 기술 혁명이 일자리, 산업, 그리고 우리의 삶을 완전히 바꿔놓고 있죠.',
      duration: 15,
      prompt: 'Dramatic view of global financial district with holographic AI data streams flowing between skyscrapers, blue and gold colors, cinematic lighting, futuristic city',
      visualNotes: 'Establishing shot showing AI-driven global economy',
    },

    // Intro (0:15 - 0:35)
    {
      id: 'intro',
      type: 'intro',
      content: '안녕하세요. 오늘은 2026년 글로벌 경제 전망과 AI가 가져올 변화, 그리고 우리가 준비해야 할 투자 전략에 대해 깊이 있게 분석해보겠습니다.',
      duration: 20,
      prompt: 'Professional economic analyst studio with multiple holographic screens showing global market data, stock charts, and AI analytics dashboard, modern minimalist design',
      visualNotes: 'News anchor style professional setting',
    },

    // Section 1: AI Economic Impact (0:35 - 1:20)
    {
      id: 'ai_impact_1',
      type: 'main',
      content: '먼저 AI가 경제에 미치는 영향을 살펴보겠습니다. 맥킨지 보고서에 따르면, AI 기술은 2030년까지 전 세계 GDP의 약 16%에 해당하는 13조 달러의 경제 가치를 창출할 것으로 예상됩니다.',
      duration: 25,
      prompt: 'Infographic visualization showing global GDP growth with AI contribution, world map with glowing data points, ascending bar charts, professional business graphics style',
      visualNotes: 'Data visualization of AI economic impact',
    },
    {
      id: 'ai_impact_2',
      type: 'main',
      content: '특히 제조업, 금융, 헬스케어 분야에서 AI 도입이 가속화되고 있습니다. 자동화와 효율성 향상으로 기업들의 수익성이 크게 개선되고 있죠.',
      duration: 20,
      prompt: 'Split screen showing AI robots in manufacturing factory, AI-powered financial trading floor, and AI medical diagnosis system, futuristic industrial scenes',
      visualNotes: 'AI applications across industries',
    },

    // Section 2: Job Market Changes (1:20 - 2:05)
    {
      id: 'jobs_1',
      type: 'main',
      content: '하지만 우려되는 부분도 있습니다. AI로 인해 사라지는 일자리와 새로 생기는 일자리의 격차입니다. 세계경제포럼에 따르면 2027년까지 8천 3백만 개의 일자리가 사라지고, 6천 9백만 개의 새로운 일자리가 생길 것으로 예측됩니다.',
      duration: 25,
      prompt: 'Conceptual image of job transformation, human workers transitioning to new roles with AI assistance, balance scale showing old jobs vs new jobs, modern workplace evolution',
      visualNotes: 'Job market transformation visualization',
    },
    {
      id: 'jobs_2',
      type: 'main',
      content: 'AI 엔지니어, 데이터 사이언티스트, AI 윤리 전문가 등 새로운 직종이 급부상하고 있습니다. 지금이 바로 미래 직업을 준비할 때입니다.',
      duration: 20,
      prompt: 'Diverse group of young professionals working with AI systems, coding on holographic displays, collaborative tech workspace, bright optimistic atmosphere',
      visualNotes: 'New AI-related careers',
    },

    // Section 3: Investment Strategy (2:05 - 3:00)
    {
      id: 'invest_1',
      type: 'main',
      content: '그렇다면 투자 관점에서는 어떻게 접근해야 할까요? 첫째, AI 인프라 기업에 주목하세요. 엔비디아, AMD 같은 반도체 기업과 마이크로소프트, 구글 같은 클라우드 플랫폼 기업들이 핵심입니다.',
      duration: 28,
      prompt: 'Stock market visualization with highlighted tech giants logos floating in 3D space, NVIDIA AMD Microsoft Google logos with upward trending charts, golden bull market atmosphere',
      visualNotes: 'Tech investment opportunities',
    },
    {
      id: 'invest_2',
      type: 'main',
      content: '둘째, AI 응용 분야 기업들입니다. 자율주행, 로봇공학, AI 헬스케어 분야에서 혁신적인 스타트업들이 급성장하고 있습니다. 하지만 리스크 관리도 중요합니다.',
      duration: 27,
      prompt: 'Futuristic scene with autonomous vehicles, humanoid robots, and AI medical devices, innovative technology showcase, venture capital investment concept',
      visualNotes: 'AI application sectors for investment',
    },

    // Section 4: Global Economy Outlook (3:00 - 3:50)
    {
      id: 'global_1',
      type: 'main',
      content: '글로벌 경제 측면에서 보면, 미국과 중국의 AI 패권 경쟁이 더욱 치열해지고 있습니다. 두 나라는 AI 기술 개발에 수천억 달러를 투자하고 있으며, 이는 새로운 냉전의 양상을 띠고 있습니다.',
      duration: 25,
      prompt: 'World map showing US and China highlighted with AI technology competition visualization, digital cold war concept, strategic technology battle imagery',
      visualNotes: 'US-China AI competition',
    },
    {
      id: 'global_2',
      type: 'main',
      content: '한국도 이 경쟁에서 중요한 위치를 차지하고 있습니다. 삼성, SK하이닉스의 반도체 기술과 네이버, 카카오의 AI 서비스가 글로벌 시장에서 경쟁력을 발휘하고 있죠.',
      duration: 25,
      prompt: 'South Korea tech hub visualization with Samsung SK Hynix Naver Kakao company representations, Korean flag, semiconductor chips and AI services, proud national technology showcase',
      visualNotes: 'Korean companies in AI race',
    },

    // Section 5: Risks and Warnings (3:50 - 4:25)
    {
      id: 'risk_1',
      type: 'main',
      content: '물론 주의해야 할 점도 있습니다. AI 버블 가능성입니다. 현재 AI 관련 주식들의 밸류에이션이 과도하게 높아진 측면이 있습니다. 닷컴 버블의 교훈을 잊지 말아야 합니다.',
      duration: 20,
      prompt: 'Warning visualization showing stock bubble concept, inflating balloon with AI logos, dotcom crash reference, cautionary financial imagery with red warning signals',
      visualNotes: 'AI bubble risk warning',
    },
    {
      id: 'risk_2',
      type: 'main',
      content: '분산 투자와 장기적 관점이 중요합니다. 단기 수익에 현혹되지 말고, 실제로 수익을 내는 기업과 아직 수익 모델이 불확실한 기업을 구분하는 눈이 필요합니다.',
      duration: 15,
      prompt: 'Balanced investment portfolio visualization, diversified assets pie chart, long-term growth concept with stable upward trend, wise investor decision making',
      visualNotes: 'Smart investment strategy',
    },

    // Conclusion (4:25 - 4:50)
    {
      id: 'conclusion',
      type: 'main',
      content: '2026년은 AI 기술이 본격적으로 경제에 영향을 미치기 시작하는 변곡점이 될 것입니다. 변화를 두려워하지 말고, 새로운 기회를 포착하는 지혜가 필요한 때입니다.',
      duration: 25,
      prompt: 'Inspiring sunrise over futuristic city skyline, human and AI collaboration concept, hopeful future vision, golden hour cinematic atmosphere',
      visualNotes: 'Optimistic future outlook',
    },

    // Outro (4:50 - 5:00)
    {
      id: 'outro',
      type: 'outro',
      content: '오늘 영상이 도움이 되셨다면 구독과 좋아요 부탁드립니다. 다음 영상에서는 구체적인 AI 투자 종목 분석을 다루겠습니다. 감사합니다.',
      duration: 10,
      prompt: 'Clean outro screen with subscribe button animation, thumbs up icon, channel logo placeholder, professional YouTube end screen design, call to action',
      visualNotes: 'YouTube subscribe CTA',
    },
  ],

  fullText: '', // Will be populated below
};

// Combine all content for TTS
economyScript.fullText = economyScript.sections.map(s => s.content).join(' ');

// ===========================================
// 메인 실행 함수
// ===========================================

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 5분 경제 영상 전체 생성');
  console.log('='.repeat(70));
  console.log(`\n📺 제목: ${economyScript.title}`);
  console.log(`📝 섹션 수: ${economyScript.sections.length}`);
  console.log(`⏱️  목표 길이: 5분 (${economyScript.sections.reduce((a, s) => a + s.duration, 0)}초)`);
  console.log(`📊 전체 텍스트: ${economyScript.fullText.length}자\n`);

  // 세션 생성
  const storage = createSessionStorage({
    topic: '2026 경제 전망 AI',
    videoType: 'medium',
  });

  const session = storage.getCurrentSession()!;
  console.log(`📁 세션 ID: ${session.id}`);
  console.log(`📂 저장 위치: ${storage.getSessionDir()}\n`);

  const costs: { phase: string; cost: number; detail?: string }[] = [];
  const startTime = Date.now();

  try {
    // ===========================================
    // Step 1: Nano Banana Pro 이미지 생성
    // ===========================================
    console.log('='.repeat(70));
    console.log('🖼️  Step 1: Nano Banana Pro 이미지 생성');
    console.log('='.repeat(70));

    const nanoBanana = getNanoBananaClient();
    const scenes: SceneImage[] = [];
    let imageCost = 0;
    let imageSuccess = 0;
    let imageFail = 0;

    for (let i = 0; i < economyScript.sections.length; i++) {
      const section = economyScript.sections[i];
      console.log(`\n[${i + 1}/${economyScript.sections.length}] 📷 ${section.id} (${section.type})`);
      console.log(`   프롬프트: ${section.prompt.substring(0, 50)}...`);

      try {
        const result = await nanoBanana.generateSceneImage({
          id: section.id,
          prompt: section.prompt,
          visualNotes: section.visualNotes,
          style: 'Cinematic, professional, YouTube video quality, high detail',
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
        imageSuccess++;
        console.log(`   ✅ 생성 완료: ${result.filename} ($${result.cost.toFixed(2)})`);

        // API 레이트 리밋 방지 - 이미지 간 충분한 간격 (10초)
        if (i < economyScript.sections.length - 1) {
          console.log(`   ⏳ 다음 이미지 생성까지 10초 대기...`);
          await sleep(10000);
        }
      } catch (error) {
        imageFail++;
        console.error(`   ❌ 생성 실패:`, (error as Error).message);
        throw error; // 폴백 없이 에러 발생
      }
    }

    costs.push({
      phase: 'images',
      cost: imageCost,
      detail: `${imageSuccess}/${economyScript.sections.length} 성공`,
    });

    console.log(`\n📊 이미지 생성 완료: ${imageSuccess}개 성공, ${imageFail}개 실패`);
    console.log(`💰 이미지 비용: $${imageCost.toFixed(2)}`);

    // ===========================================
    // Step 2: Gemini TTS 음성 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎙️  Step 2: Gemini TTS 음성 생성');
    console.log('='.repeat(70));

    const ttsClient = getGeminiTTSClient();
    const voice = GeminiVoicePresets['Kore']; // 한국어 남성 음성

    console.log(`\n📢 음성: ${voice.name} (${voice.description})`);
    console.log(`📝 텍스트 길이: ${economyScript.fullText.length}자`);

    const ttsResult = await ttsClient.synthesizeAndUpload(
      {
        text: economyScript.fullText,
        voice,
        language: 'ko',
        speakingRate: 0.95, // 약간 느리게 (경제 뉴스 스타일)
      },
      session.id,
      'narration.wav'
    );

    costs.push({
      phase: 'voice',
      cost: ttsResult.cost,
      detail: `${ttsResult.duration.toFixed(1)}초`,
    });

    console.log(`\n✅ 음성 생성 완료`);
    console.log(`   ⏱️  길이: ${ttsResult.duration.toFixed(1)}초`);
    console.log(`   💾 크기: ${(ttsResult.audioSize / 1024).toFixed(1)} KB`);
    console.log(`   💰 비용: $${ttsResult.cost.toFixed(4)}`);

    const audioPath = path.join(storage.getSessionDir(), 'audio', 'narration.wav');

    // ===========================================
    // Step 3: YouTube 최적화 자막 생성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 Step 3: YouTube 최적화 자막 생성');
    console.log('='.repeat(70));

    const subtitles: SubtitleEntry[] = scriptToSubtitles(
      economyScript.sections.map(s => ({
        id: s.id,
        content: s.content,
        duration: s.duration,
      })),
      {
        language: 'korean',
        // YouTube 한국어 최적화: 18자/줄, 9자/초
      }
    );

    console.log(`\n✅ 자막 생성 완료: ${subtitles.length}개 엔트리`);

    // 자막 샘플 출력
    console.log('\n📋 자막 샘플 (처음 5개):');
    subtitles.slice(0, 5).forEach((sub, i) => {
      console.log(`   [${i + 1}] ${sub.startTime.toFixed(2)}s - ${sub.endTime.toFixed(2)}s`);
      console.log(`       "${sub.text.replace(/\n/g, ' | ')}"`);
    });

    // ===========================================
    // Step 4: FFmpeg 영상 합성
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎬 Step 4: FFmpeg 영상 합성');
    console.log('='.repeat(70));

    const composer = getVideoComposer();

    console.log(`\n🎞️  영상 설정:`);
    console.log(`   해상도: 1920x1080 (Full HD)`);
    console.log(`   FPS: 30`);
    console.log(`   씬 수: ${scenes.length}`);
    console.log(`   오디오: ${fs.existsSync(audioPath) ? '있음' : '없음'}`);
    console.log(`   자막: ${subtitles.length}개\n`);

    const videoResult = await composer.compose({
      scenes,
      audioPath,
      subtitles,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      format: 'mp4',
      outputFilename: 'economy-2026-ai-outlook.mp4',
    });

    console.log(`\n✅ 영상 합성 완료!`);
    console.log(`   📹 파일: ${videoResult.videoPath}`);
    console.log(`   ⏱️  길이: ${videoResult.duration.toFixed(1)}초 (${(videoResult.duration / 60).toFixed(1)}분)`);
    console.log(`   💾 크기: ${(videoResult.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   🔊 오디오: ${videoResult.hasAudio ? '포함' : '없음'}`);
    console.log(`   📝 자막: ${videoResult.hasSubtitles ? '포함' : '없음'}`);

    // ===========================================
    // 최종 결과 요약
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 최종 결과 요약');
    console.log('='.repeat(70));

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalDuration = (Date.now() - startTime) / 1000;

    console.log('\n💰 비용 내역:');
    costs.forEach(c => {
      console.log(`   ${c.phase.padEnd(10)} $${c.cost.toFixed(4).padStart(8)} ${c.detail ? `(${c.detail})` : ''}`);
    });
    console.log(`   ${'─'.repeat(30)}`);
    console.log(`   ${'합계'.padEnd(8)} $${totalCost.toFixed(4).padStart(8)}`);

    console.log(`\n⏱️  총 소요 시간: ${totalDuration.toFixed(1)}초 (${(totalDuration / 60).toFixed(1)}분)`);

    // 생성된 에셋 목록
    const assets = storage.getAssets();
    console.log('\n📦 생성된 에셋:');
    assets.forEach(a => {
      const sizeStr = a.size > 1024 * 1024
        ? `${(a.size / 1024 / 1024).toFixed(1)} MB`
        : `${(a.size / 1024).toFixed(1)} KB`;
      console.log(`   ${a.type.padEnd(12)} ${a.filename.padEnd(40)} ${sizeStr}`);
    });

    // 세션 완료 저장
    storage.saveResult({
      title: economyScript.title,
      description: economyScript.description,
      costs,
      totalCost,
      totalDuration,
      videoPath: videoResult.videoPath,
      videoDuration: videoResult.duration,
      videoSize: videoResult.fileSize,
      sceneCount: scenes.length,
      subtitleCount: subtitles.length,
    });
    storage.completeSession();

    console.log('\n' + '='.repeat(70));
    console.log('✅ 5분 경제 영상 생성 완료!');
    console.log('='.repeat(70));
    console.log(`\n📂 출력 폴더: ${storage.getSessionDir()}`);
    console.log(`📹 영상 파일: ${videoResult.videoPath}`);
    console.log('\n🎉 영상을 확인해보세요!\n');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ 오류 발생');
    console.error('='.repeat(70));
    console.error('\n에러:', error);

    if ((error as Error).message?.includes('billing') || (error as Error).message?.includes('quota')) {
      console.error('\n⚠️  API 과금 또는 할당량 문제입니다.');
      console.error('   - Google Cloud Console에서 Imagen API 활성화 확인');
      console.error('   - 결제 계정 연결 확인');
      console.error('   - API 할당량 확인');
    }

    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 실행
main().catch(console.error);
