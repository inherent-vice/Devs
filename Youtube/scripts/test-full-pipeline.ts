/**
 * Test Script: Full Pipeline with Session Storage
 *
 * 트렌드 분석 → 주제 선정 → 스크립트 생성 → 음성 생성까지
 * 모든 에셋을 세션별로 로컬에 저장합니다.
 */

import { trendAgent } from '../src/agents/research/TrendAgent.js';
import { topicAgent } from '../src/agents/research/TopicAgent.js';
import { scriptAgent } from '../src/agents/research/ScriptAgent.js';
import { voiceAgent } from '../src/agents/production/VoiceAgent.js';
import { createSessionStorage } from '../src/storage/LocalStorageManager.js';
import type { AgentContext } from '../src/agents/base/types.js';

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 YouTube 영상 제작 파이프라인 (세션 기반 저장)');
  console.log('='.repeat(70));

  // Parse command line arguments
  const args = process.argv.slice(2);
  const topic = args[0] || '경제/부동산';
  const videoType = (args[1] as 'shorts' | 'medium' | 'longform') || 'medium';

  console.log(`\n📝 주제: ${topic}`);
  console.log(`📺 영상 유형: ${videoType}`);

  // Create session with local storage
  const storage = createSessionStorage({
    topic,
    videoType,
  });

  const session = storage.getCurrentSession()!;
  console.log(`\n📁 세션 ID: ${session.id}`);
  console.log(`📂 저장 위치: ${storage.getSessionDir()}`);

  const context: AgentContext = {
    sessionId: session.id,
    phase: 'research',
    videoType,
    maxCost: 10.0,
  };

  const costs: { phase: string; cost: number }[] = [];
  const startTime = Date.now();

  try {
    // ===========================================
    // Phase 1: Trend Analysis
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 Phase 1: 트렌드 분석');
    console.log('='.repeat(70));

    const trendResult = await trendAgent.execute({
      idea: topic,
      videoType,
      targetAudience: '20-40대 직장인',
      language: 'ko',
      maxTrends: 10,
    }, context);

    if (!trendResult.success) {
      throw new Error(`트렌드 분석 실패: ${trendResult.error?.message}`);
    }

    const trends = trendResult.data?.trends || [];
    console.log(`✅ ${trends.length}개 트렌드 발견`);

    // Save trends
    storage.saveMetadata({
      phase: 'trends',
      trends,
      analysis: trendResult.data?.analysis,
    }, 'trends.json');

    costs.push({ phase: 'trends', cost: trendResult.metrics?.cost || 0 });

    // ===========================================
    // Phase 2: Topic Selection
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎯 Phase 2: 주제 선정');
    console.log('='.repeat(70));

    const topicResult = await topicAgent.execute({
      trends,
      videoType,
      targetAudience: '20-40대 직장인',
      style: '정보 제공 + 분석',
      language: 'ko',
    }, context);

    if (!topicResult.success) {
      throw new Error(`주제 선정 실패: ${topicResult.error?.message}`);
    }

    const selectedTopic = topicResult.data?.selectedTopic;
    console.log(`✅ 선정된 주제: ${selectedTopic?.title}`);

    // Save topic
    storage.saveMetadata({
      phase: 'topic',
      selectedTopic,
      alternativeTopics: topicResult.data?.alternativeTopics,
      titleVariants: topicResult.data?.titleVariants,
      thumbnailConcepts: topicResult.data?.thumbnailConcepts,
      seoStrategy: topicResult.data?.seoStrategy,
    }, 'topic.json');

    // Save checkpoint
    storage.saveCheckpoint({ trends, selectedTopic }, 'research');

    costs.push({ phase: 'topic', cost: topicResult.metrics?.cost || 0 });

    // ===========================================
    // Phase 3: Script Generation
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 Phase 3: 스크립트 생성');
    console.log('='.repeat(70));

    context.phase = 'production';

    const scriptResult = await scriptAgent.execute({
      topic: selectedTopic,
      videoType,
      targetDuration: videoType === 'shorts' ? 60 : videoType === 'medium' ? 480 : 900,
      targetAudience: '20-40대 직장인',
      style: '정보 제공 + 분석',
      language: 'ko',
      toneOfVoice: 'professional',
      includeCallToAction: true,
    }, context);

    if (!scriptResult.success) {
      throw new Error(`스크립트 생성 실패: ${scriptResult.error?.message}`);
    }

    const script = scriptResult.data?.script;
    const storyboard = scriptResult.data?.storyboard;
    console.log(`✅ 스크립트 생성 완료 (${script?.sections?.length || 0}개 섹션)`);

    // Save script and storyboard
    storage.saveScript(script || {}, 'script.json');
    storage.saveStoryboard(storyboard || {}, 'storyboard.json');

    // Save checkpoint
    storage.saveCheckpoint({ script, storyboard }, 'script');

    costs.push({ phase: 'script', cost: scriptResult.metrics?.cost || 0 });

    // ===========================================
    // Phase 4: Voice Generation
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('🎙️ Phase 4: 음성 생성');
    console.log('='.repeat(70));

    if (script?.fullText && script?.sections) {
      const voiceResult = await voiceAgent.execute({
        script: {
          fullText: script.fullText,
          sections: script.sections.map((s: any) => ({
            id: s.id || `sec_${Math.random().toString(36).substr(2, 6)}`,
            content: s.content,
            duration: s.duration || 30,
            audioNotes: s.audioNotes,
          })),
        },
        language: 'ko-KR',
        voicePreference: {
          gender: 'neutral',
          age: 'middle',
          style: 'news',
        },
        speakingRate: 1.0,
        pitch: 0,
        outputFormat: 'wav',
      }, context);

      if (!voiceResult.success) {
        console.warn(`⚠️ 음성 생성 실패: ${voiceResult.error?.message}`);
      } else {
        console.log(`✅ 음성 생성 완료: ${voiceResult.data?.duration?.toFixed(1)}초`);
        costs.push({ phase: 'voice', cost: voiceResult.metrics?.cost || 0 });

        // Voice is automatically saved by VoiceAgent via GeminiTTS
      }
    } else {
      console.log('⚠️ 스크립트 텍스트 없음, 음성 생성 스킵');
    }

    // ===========================================
    // Summary
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 최종 결과');
    console.log('='.repeat(70));

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalDuration = (Date.now() - startTime) / 1000;

    const result = {
      session: session.id,
      topic: selectedTopic?.title,
      videoType,
      phases: costs,
      totalCost,
      totalDuration,
      assets: storage.getAssets().map(a => ({
        type: a.type,
        filename: a.filename,
        size: a.size,
      })),
      completedAt: new Date().toISOString(),
    };

    // Save final result
    storage.saveResult(result);
    storage.completeSession();

    console.log(`\n🎬 주제: ${selectedTopic?.title}`);
    console.log(`📁 세션: ${session.id}`);
    console.log(`📂 저장 위치: ${storage.getSessionDir()}`);
    console.log('\n💰 비용 내역:');
    costs.forEach(c => {
      console.log(`   ${c.phase}: $${c.cost.toFixed(4)}`);
    });
    console.log(`   ────────────────`);
    console.log(`   합계: $${totalCost.toFixed(4)}`);
    console.log(`\n⏱️  총 소요 시간: ${totalDuration.toFixed(1)}초`);

    console.log('\n📦 생성된 에셋:');
    storage.getAssets().forEach(a => {
      console.log(`   ${a.type}: ${a.filename} (${(a.size / 1024).toFixed(1)} KB)`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ 파이프라인 완료!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);

    // Save error state
    storage.saveMetadata({
      error: (error as Error).message,
      phase: context.phase,
      timestamp: new Date().toISOString(),
    }, 'error.json');

    process.exit(1);
  }
}

main();
