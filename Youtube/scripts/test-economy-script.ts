/**
 * Test Script: Economy Script Generation
 *
 * 선정된 경제 주제로 YouTube 영상 스크립트를 생성합니다.
 */

import { scriptAgent } from '../src/agents/research/ScriptAgent.js';
import type { AgentContext } from '../src/agents/base/types.js';

async function main() {
  console.log('='.repeat(70));
  console.log('📝 YouTube 영상 스크립트 생성');
  console.log('='.repeat(70));

  const context: AgentContext = {
    sessionId: `economy-script-${Date.now()}`,
    phase: 'research',
    videoType: 'medium',
    maxCost: 10.0,
  };

  // 이전 단계에서 선정된 주제 정보
  const selectedTopic = {
    title: '2026년 서울 아파트 공급 절벽: 지금 안 사면 평생 못 살까? (데이터 분석)',
    hook: '2026년, 서울에 새 아파트가 사라집니다. 통계가 가리키는 역대급 공급 절벽 시나리오, 2040 세대에게는 위기일까요 기회일까요?',
    angle: '단순한 공포 조장이 아닌 국토부 및 인허가 데이터를 기반으로 한 정밀 분석을 제공합니다. 공급 부족이 확정된 2026년 시장에서 실거주자와 투자자가 취해야 할 구체적인 포트폴리오 조정 전략을 제시하여 차별화합니다.',
    targetKeywords: ['서울 부동산', '2026년 공급 절벽', '수도권 아파트 전망', '내 집 마련', '부동산 사이클'],
  };

  try {
    console.log(`\n🎬 주제: ${selectedTopic.title}\n`);
    console.log('📝 스크립트 생성 중... (약 30-60초 소요)\n');

    const scriptResult = await scriptAgent.execute({
      topic: selectedTopic,
      videoType: 'medium',
      targetDuration: 480, // 8분 = 480초
      targetAudience: '20-40대 직장인, 투자에 관심있는 사람들',
      style: '정보 제공 + 분석, 전문적이지만 이해하기 쉽게',
      language: 'ko',
      toneOfVoice: 'professional',
      includeCallToAction: true,
    }, context);

    if (!scriptResult.success) {
      throw new Error(`스크립트 생성 실패: ${scriptResult.error?.message}`);
    }

    const data = scriptResult.data;
    const script = data?.script;
    const storyboard = data?.storyboard;
    const metadata = data?.metadata;

    console.log('✅ 스크립트 생성 완료!\n');
    console.log('='.repeat(70));
    console.log('📺 YouTube 영상 스크립트');
    console.log('='.repeat(70));

    // 제목
    console.log(`\n🎬 제목: ${script?.title || selectedTopic.title}`);
    console.log(`⏱️  예상 길이: ${Math.round((script?.estimatedDuration || 480) / 60)}분`);
    console.log(`📈 목표 시청 유지율: ${((script?.targetRetention || 0.5) * 100).toFixed(0)}%`);

    // 훅/오프닝
    console.log('\n' + '-'.repeat(70));
    console.log('🎣 오프닝 훅');
    console.log('-'.repeat(70));
    console.log(script?.hook || selectedTopic.hook);

    // 섹션별 스크립트
    if (script?.sections?.length) {
      let timeOffset = 0;
      script.sections.forEach((section: any, i: number) => {
        const startTime = formatTime(timeOffset);
        const endTime = formatTime(timeOffset + (section.duration || 30));
        timeOffset += section.duration || 30;

        console.log('\n' + '-'.repeat(70));
        console.log(`📍 섹션 ${i + 1}: ${section.type?.toUpperCase() || 'MAIN'} [${startTime} - ${endTime}]`);
        console.log('-'.repeat(70));
        console.log(section.content);

        if (section.visualNotes) {
          console.log(`\n   🎥 영상: ${section.visualNotes}`);
        }
        if (section.audioNotes) {
          console.log(`   🎙️ 오디오: ${section.audioNotes}`);
        }
        if (section.emotionalBeat) {
          console.log(`   💫 감정: ${section.emotionalBeat}`);
        }
      });
    }

    // CTA
    console.log('\n' + '-'.repeat(70));
    console.log('📢 CTA (Call to Action)');
    console.log('-'.repeat(70));
    console.log(script?.callToAction || '좋아요와 구독 부탁드립니다!');

    // 스토리보드
    if (storyboard?.scenes?.length) {
      console.log('\n' + '='.repeat(70));
      console.log(`🎬 스토리보드 (${storyboard.sceneCount || storyboard.scenes.length}개 장면)`);
      console.log('='.repeat(70));

      storyboard.scenes.slice(0, 5).forEach((scene: any, i: number) => {
        console.log(`\n  장면 ${i + 1} [${scene.priority}] - ${scene.duration}초`);
        console.log(`    설명: ${scene.description}`);
        console.log(`    프롬프트: ${scene.prompt?.substring(0, 100)}...`);
      });

      if (storyboard.scenes.length > 5) {
        console.log(`\n  ... 외 ${storyboard.scenes.length - 5}개 장면`);
      }
    }

    // 전체 스크립트 텍스트
    console.log('\n' + '='.repeat(70));
    console.log('📄 전체 나레이션 텍스트');
    console.log('='.repeat(70));
    console.log(script?.fullText || '(전체 텍스트 없음)');

    // 메타데이터
    if (metadata) {
      console.log('\n' + '-'.repeat(70));
      console.log('📊 메타데이터');
      console.log('-'.repeat(70));
      console.log(`   단어 수: ${metadata.wordCount || 'N/A'}`);
      console.log(`   읽기 속도: ${metadata.readingSpeed || 'N/A'} WPM`);
      console.log(`   복잡도: ${((metadata.complexityScore || 0) * 100).toFixed(0)}%`);
      if (metadata.emotionalArc?.length) {
        console.log(`   감정 흐름: ${metadata.emotionalArc.join(' → ')}`);
      }
    }

    // 키워드
    console.log('\n' + '-'.repeat(70));
    console.log('🔑 SEO 키워드');
    console.log('-'.repeat(70));
    console.log((script?.keywords || selectedTopic.targetKeywords).join(', '));

    // 비용 정보
    console.log('\n' + '='.repeat(70));
    console.log(`💰 비용: $${scriptResult.metrics?.cost?.toFixed(4) || '0.0000'}`);
    console.log(`⏱️  소요 시간: ${(scriptResult.metrics?.duration || 0) / 1000}초`);
    console.log(`📊 토큰 사용: ${scriptResult.metrics?.tokensUsed || 0}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

main();
