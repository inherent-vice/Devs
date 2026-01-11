/**
 * Test Script: Economy Topic Generation
 *
 * 경제 관련 YouTube 영상 주제를 생성합니다.
 */

import { trendAgent } from '../src/agents/research/TrendAgent.js';
import { topicAgent } from '../src/agents/research/TopicAgent.js';
import type { AgentContext } from '../src/agents/base/types.js';

async function main() {
  console.log('='.repeat(60));
  console.log('🎯 경제 주제 YouTube 영상 아이디어 생성');
  console.log('='.repeat(60));

  const context: AgentContext = {
    sessionId: `economy-test-${Date.now()}`,
    phase: 'research',
    videoType: 'medium', // 5-10분 영상
    maxCost: 10.0,
  };

  try {
    // Step 1: 트렌드 분석
    console.log('\n📊 Step 1: 경제 트렌드 분석 중...\n');

    const trendResult = await trendAgent.execute({
      idea: '2026년 한국 경제 전망, 주식투자, 부동산 시장, 금리 인하, 환율 변동, 인플레이션, 개인 재테크',
      videoType: 'medium',
      targetAudience: '20-40대 직장인, 투자에 관심있는 사람들',
      language: 'ko',
      maxTrends: 10,
    }, context);

    if (!trendResult.success) {
      throw new Error(`트렌드 분석 실패: ${trendResult.error?.message}`);
    }

    console.log('✅ 트렌드 분석 완료!');
    console.log('\n발견된 트렌드:');
    const trends = trendResult.data?.trends || [];
    trends.forEach((trend: any, i: number) => {
      console.log(`  ${i + 1}. ${trend.topic}`);
      console.log(`     점수: ${trend.score?.toFixed(2)}, 성장률: ${trend.growth}%, 난이도: ${trend.difficulty}`);
    });

    if (trendResult.data?.analysis) {
      console.log('\n📈 시장 분석:');
      console.log(`   시장 포화도: ${(trendResult.data.analysis.marketSaturation * 100).toFixed(0)}%`);
      console.log(`   최적 게시 시간: ${trendResult.data.analysis.bestTimeToPost}`);
      console.log(`   콘텐츠 갭: ${trendResult.data.analysis.contentGaps?.join(', ')}`);
    }

    // Step 2: 주제 선정
    console.log('\n🎬 Step 2: YouTube 영상 주제 선정 중...\n');

    const topicResult = await topicAgent.execute({
      trends: trends,
      videoType: 'medium',
      targetAudience: '20-40대 직장인, 투자에 관심있는 사람들',
      style: '정보 제공 + 분석, 전문적이지만 이해하기 쉽게',
      language: 'ko',
    }, context);

    if (!topicResult.success) {
      throw new Error(`주제 선정 실패: ${topicResult.error?.message}`);
    }

    console.log('✅ 주제 선정 완료!');
    console.log('\n' + '='.repeat(60));
    console.log('🏆 선정된 YouTube 영상 주제');
    console.log('='.repeat(60));

    const selected = topicResult.data?.selectedTopic;
    if (selected) {
      console.log(`\n📌 최종 선정: ${selected.title}`);
      console.log(`\n   🎣 훅: "${selected.hook}"`);
      console.log(`   🎯 각도: ${selected.angle}`);
      console.log(`   📊 예상 CTR: ${(selected.estimatedCTR * 100).toFixed(1)}%`);
      console.log(`   ⚡ 난이도: ${selected.difficulty}`);
      console.log(`   🔑 키워드: ${selected.targetKeywords?.join(', ')}`);
      console.log(`   💡 선정 이유: ${selected.reasoning}`);
    }

    // 대안 주제들
    if (topicResult.data?.alternativeTopics?.length) {
      console.log('\n📋 대안 주제:');
      topicResult.data.alternativeTopics.forEach((alt: any, i: number) => {
        console.log(`   ${i + 1}. ${alt.title} (점수: ${alt.score?.toFixed(2)})`);
      });
    }

    // 제목 변형
    if (topicResult.data?.titleVariants?.length) {
      console.log('\n✏️ 제목 A/B 테스트 변형:');
      topicResult.data.titleVariants.forEach((title: string, i: number) => {
        console.log(`   ${i + 1}. ${title}`);
      });
    }

    // 썸네일 컨셉
    if (topicResult.data?.thumbnailConcepts?.length) {
      console.log('\n🖼️ 썸네일 컨셉:');
      topicResult.data.thumbnailConcepts.forEach((thumb: any, i: number) => {
        console.log(`   ${i + 1}. ${thumb.description}`);
        if (thumb.textOverlay) console.log(`      텍스트: "${thumb.textOverlay}"`);
        console.log(`      감정 트리거: ${thumb.emotionalTrigger}`);
      });
    }

    // SEO 전략
    if (topicResult.data?.seoStrategy) {
      const seo = topicResult.data.seoStrategy;
      console.log('\n🔍 SEO 전략:');
      console.log(`   주요 키워드: ${seo.primaryKeyword}`);
      console.log(`   보조 키워드: ${seo.secondaryKeywords?.join(', ')}`);
      console.log(`   태그: ${seo.tags?.slice(0, 5).join(', ')}...`);
    }

    // 비용 정보
    const totalCost = (trendResult.metrics?.cost || 0) + (topicResult.metrics?.cost || 0);
    console.log('\n' + '='.repeat(60));
    console.log(`💰 총 비용: $${totalCost.toFixed(4)}`);
    console.log(`⏱️  소요 시간: ${((trendResult.metrics?.duration || 0) + (topicResult.metrics?.duration || 0)) / 1000}초`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
