/**
 * Test Script: Economy Voice Generation
 *
 * 생성된 경제 스크립트로 음성을 생성합니다.
 */

import { voiceAgent } from '../src/agents/production/VoiceAgent.js';
import type { AgentContext } from '../src/agents/base/types.js';

async function main() {
  console.log('='.repeat(70));
  console.log('🎙️ YouTube 영상 음성 생성');
  console.log('='.repeat(70));

  const context: AgentContext = {
    sessionId: `economy-voice-${Date.now()}`,
    phase: 'production',
    videoType: 'medium',
    maxCost: 10.0,
  };

  // 이전 단계에서 생성된 스크립트 정보
  const scriptData = {
    fullText: `2026년, 서울에 새 아파트가 사라집니다. 통계가 가리키는 역대급 공급 절벽 시나리오, 2040 세대에게는 위기일까요 기회일까요? 안녕하세요. 오늘은 단순히 '집값이 오를 거다'라는 막연한 공포가 아닌, 국토교통부의 인허가 실적과 착공 데이터를 바탕으로 2026년 서울 부동산 시장의 냉혹한 현실을 분석해 보려 합니다. 먼저 데이터부터 보시죠. 아파트는 인허가부터 입주까지 보통 3년에서 5년이 걸립니다. 그런데 2023년 서울 아파트 인허가 물량은 전년 대비 30% 이상 급감했습니다. 이는 2026년 입주 물량이 반토막 난다는 확정된 미래를 의미합니다. 왜 이런 일이 벌어졌을까요? 첫째는 원자재 가격 폭등으로 인한 공사비 갈등입니다. 재건축 조합과 시공사 간의 마찰로 착공이 지연되는 현장이 속출하고 있습니다. 둘째는 고금리로 인한 PF 대출 경색입니다. 돈줄이 막히니 땅을 다져놓고도 건물을 올리지 못하는 거죠. 과거 2014년과 2015년의 공급 부족 시기를 기억하시나요? 당시의 공급 부족은 이후 5년 이상의 장기 우상향 랠리의 기폭제가 되었습니다. 2026년의 절벽은 그때보다 더 가파릅니다. 수요는 여전한데 공급만 마르는 상황, 경제학의 기본 원리가 작동할 수밖에 없습니다. 그렇다면 2040 세대는 무엇을 해야 할까요? 무작정 기다리는 것이 답일까요? 아닙니다. 첫째, 신축 선호 현상이 심화될 것이므로 준신축 단지의 급매물을 노려야 합니다. 둘째, 3기 신도시 등 확정된 공급 스케줄을 필터링하여 실거주 가치가 높은 지역을 선점해야 합니다. 셋째, 청약보다는 입주권이나 분양권 전매 시장에 주목하세요. 결론입니다. 2026년 공급 절벽은 위기인 동시에 준비된 자에게는 하급지에서 상급지로 갈아탈 수 있는 마지막 기차일 수 있습니다. 여러분의 생각은 어떠신가요? 댓글로 의견 남겨주시고, 더 자세한 지역별 분석은 다음 영상에서 다루겠습니다. 지금 바로 구독과 알림 설정을 하시고, 2026년 부동산 위기를 기회로 바꾸는 데이터를 선점하세요!`,
    sections: [
      {
        id: 'hook',
        content: '2026년, 서울에 새 아파트가 사라집니다. 통계가 가리키는 역대급 공급 절벽 시나리오, 2040 세대에게는 위기일까요 기회일까요?',
        duration: 5,
        audioNotes: 'Dramatic, attention-grabbing tone',
      },
      {
        id: 'intro',
        content: "안녕하세요. 오늘은 단순히 '집값이 오를 거다'라는 막연한 공포가 아닌, 국토교통부의 인허가 실적과 착공 데이터를 바탕으로 2026년 서울 부동산 시장의 냉혹한 현실을 분석해 보려 합니다.",
        duration: 15,
        audioNotes: 'Professional, calm introduction',
      },
      {
        id: 'main-1',
        content: '먼저 데이터부터 보시죠. 아파트는 인허가부터 입주까지 보통 3년에서 5년이 걸립니다. 그런데 2023년 서울 아파트 인허가 물량은 전년 대비 30% 이상 급감했습니다. 이는 2026년 입주 물량이 반토막 난다는 확정된 미래를 의미합니다.',
        duration: 60,
        audioNotes: 'Data-driven, factual tone with emphasis on percentages',
      },
      {
        id: 'main-2',
        content: '왜 이런 일이 벌어졌을까요? 첫째는 원자재 가격 폭등으로 인한 공사비 갈등입니다. 재건축 조합과 시공사 간의 마찰로 착공이 지연되는 현장이 속출하고 있습니다. 둘째는 고금리로 인한 PF 대출 경색입니다. 돈줄이 막히니 땅을 다져놓고도 건물을 올리지 못하는 거죠.',
        duration: 100,
        audioNotes: 'Explanatory tone, building concern',
      },
      {
        id: 'main-3',
        content: '과거 2014년과 2015년의 공급 부족 시기를 기억하시나요? 당시의 공급 부족은 이후 5년 이상의 장기 우상향 랠리의 기폭제가 되었습니다. 2026년의 절벽은 그때보다 더 가파릅니다. 수요는 여전한데 공급만 마르는 상황, 경제학의 기본 원리가 작동할 수밖에 없습니다.',
        duration: 100,
        audioNotes: 'Historical comparison with rising intensity',
      },
      {
        id: 'main-4',
        content: '그렇다면 2040 세대는 무엇을 해야 할까요? 무작정 기다리는 것이 답일까요? 아닙니다. 첫째, 신축 선호 현상이 심화될 것이므로 준신축 단지의 급매물을 노려야 합니다. 둘째, 3기 신도시 등 확정된 공급 스케줄을 필터링하여 실거주 가치가 높은 지역을 선점해야 합니다. 셋째, 청약보다는 입주권이나 분양권 전매 시장에 주목하세요.',
        duration: 120,
        audioNotes: 'Strategic, empowering advice with clear numbered points',
      },
      {
        id: 'outro',
        content: '결론입니다. 2026년 공급 절벽은 위기인 동시에 준비된 자에게는 하급지에서 상급지로 갈아탈 수 있는 마지막 기차일 수 있습니다. 여러분의 생각은 어떠신가요? 댓글로 의견 남겨주시고, 더 자세한 지역별 분석은 다음 영상에서 다루겠습니다.',
        duration: 60,
        audioNotes: 'Inspiring conclusion with call for engagement',
      },
      {
        id: 'cta',
        content: '지금 바로 구독과 알림 설정을 하시고, 2026년 부동산 위기를 기회로 바꾸는 데이터를 선점하세요!',
        duration: 20,
        audioNotes: 'Energetic call to action',
      },
    ],
  };

  try {
    console.log(`\n🎬 스크립트 길이: ${scriptData.fullText.length}자`);
    console.log(`📍 섹션 수: ${scriptData.sections.length}개`);
    console.log('\n🎙️ 음성 생성 중... (약 10-30초 소요)\n');

    const voiceResult = await voiceAgent.execute({
      script: scriptData,
      language: 'ko-KR',
      voicePreference: {
        gender: 'male',
        age: 'middle',
        style: 'news',
      },
      speakingRate: 1.05, // 약간 빠르게
      pitch: 0,
      outputFormat: 'mp3',
    }, context);

    if (!voiceResult.success) {
      throw new Error(`음성 생성 실패: ${voiceResult.error?.message}`);
    }

    const data = voiceResult.data!;

    console.log('✅ 음성 생성 완료!\n');
    console.log('='.repeat(70));
    console.log('🎧 음성 결과');
    console.log('='.repeat(70));

    console.log(`\n📁 오디오 URL: ${data.audioUrl}`);
    console.log(`⏱️  총 길이: ${data.duration.toFixed(1)}초 (${(data.duration / 60).toFixed(1)}분)`);

    console.log('\n' + '-'.repeat(70));
    console.log('🎤 음성 정보');
    console.log('-'.repeat(70));
    console.log(`   음성 이름: ${data.voice.name}`);
    console.log(`   언어 코드: ${data.voice.languageCode}`);
    console.log(`   성별: ${data.voice.gender}`);

    console.log('\n' + '-'.repeat(70));
    console.log('📊 오디오 메타데이터');
    console.log('-'.repeat(70));
    console.log(`   샘플레이트: ${data.metadata.sampleRate} Hz`);
    console.log(`   비트레이트: ${data.metadata.bitrate} kbps`);
    console.log(`   포맷: ${data.metadata.format}`);
    if (data.metadata.fileSize) {
      console.log(`   파일 크기: ${(data.metadata.fileSize / 1024).toFixed(1)} KB`);
    }

    console.log('\n' + '-'.repeat(70));
    console.log('📍 세그먼트 타임스탬프');
    console.log('-'.repeat(70));
    data.segments.forEach((seg, i) => {
      console.log(`   ${i + 1}. ${seg.sectionId}: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`💰 비용: $${data.cost.toFixed(4)}`);
    console.log(`⏱️  처리 시간: ${(voiceResult.metrics?.duration || 0) / 1000}초`);
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
