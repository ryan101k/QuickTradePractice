/* =========================================================================
 *  QuickTrade Life — 배경음악
 *  (다중 악기 · 다중 섹션 칩튠 신스 + Tone.js 공간계 + SAM 보컬라이즈)
 *
 *  외부 음원 없이 WebAudio 로 여러 "악기"를 직접 합성한다.
 *  각 악기는 파형이 아니라 음색이다 — ADSR 엔벨로프 + 신스 방식이 다르다:
 *
 *    pulse   : 8비트 펄스 리드 (살짝 디튠)
 *    saw     : 두꺼운 톱니 리드/베이스
 *    tri     : 부드러운 삼각파
 *    sine    : 맑은 사인
 *    pluck   : 빠르게 감쇠하는 마림바/피치카토
 *    bell    : FM 합성 종·오르골
 *    organ   : 배음을 더한 가산합성 오르간
 *    pad     : 3보이스 디튠 톱니 + 로우패스, 느린 어택 (지속 화음)
 *    brass   : 로우패스 톱니, 어택이 살짝 있는 관악
 *
 *  ── 반복감을 줄이기 위해 트랙마다 여러 "섹션"(A/B/C 멜로디)을 두고
 *     arrangement 순서대로 이어 연주한다. 리듬·베이스·화음은 공유하고
 *     주로 멜로디(lead)·아르페지오(arp)가 섹션마다 달라진다.
 *
 *  레이어: lead(멜로디) · arp(아르페지오) · bass · chords(패드 화음) · drum
 *  드럼: k킥 s스네어 h닫힌하이햇 H열린하이햇 c크래시 t톰 p박수 -쉼
 *
 *  Tone.js와 SAM(Software Automatic Mouth)이 로드되면 음절을 정확한 반음 비율로
 *  이조하고, A/E/I/O/U 포먼트와 자음 노이즈를 겹쳐 명확한 기계 보컬을 만든다.
 *  캐릭터마다 발음 간격·파형·공명·글라이드·속삭임·화음이 다른 프리셋을 쓴다.
 *  두 라이브러리가 없거나 초기화에 실패하면 기존 WebAudio 엔진만 그대로 재생된다.
 *
 *  공개 API:
 *    BGM.setEnabled(bool) / setVolume(0~1) / getVolume() / isEnabled()
 *    BGM.play(name[, force]) / playCharacter(name[, baseTrack, force])
 *    stop() / current() / engine() / tracks / characterVoices
 *  트랙: title · market_normal · market_bull · market_bear · news
 *        · bankrupt · jackpot · dreamy   (별칭 market/closed/date 도 허용)
 * ========================================================================= */
(function (root) {
  'use strict';

  /* ----------------------------------------------------------- 음이름 → 주파수
   * 샤프(#)와 플랫(b) 모두 지원. (예: C4, F#3, Bb2) */
  const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;
  const BASE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };   // A4 기준 반음
  const freqCache = {};
  function freq(note) {
    if (!note || note === '-') return 0;
    if (freqCache[note] != null) return freqCache[note];
    const m = NOTE_RE.exec(note);
    if (!m) return (freqCache[note] = 0);
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const semi = BASE[m[1]] + acc + (parseInt(m[3], 10) - 4) * 12;
    return (freqCache[note] = 440 * Math.pow(2, semi / 12));
  }

  /* --------------------------------------------------------------- 악기 프리셋 */
  const INSTR = {
    pulse:  { type: 'square',   a: 0.005, d: 0.05, s: 0.45, r: 0.07, voices: 2, detune: 7 },
    square: { type: 'square',   a: 0.006, d: 0.06, s: 0.55, r: 0.08 },
    saw:    { type: 'sawtooth', a: 0.008, d: 0.08, s: 0.6,  r: 0.10, lp: 3200 },
    tri:    { type: 'triangle', a: 0.006, d: 0.10, s: 0.7,  r: 0.12 },
    sine:   { type: 'sine',     a: 0.02,  d: 0.16, s: 0.8,  r: 0.22 },
    pluck:  { type: 'triangle', a: 0.002, d: 0.14, s: 0.0,  r: 0.09 },
    bell:   { type: 'sine',     a: 0.001, d: 0.5,  s: 0.0,  r: 0.5, fm: { ratio: 2.0, amt: 7, decay: 0.32 } },
    organ:  { type: 'organ',    a: 0.02,  d: 0.04, s: 0.9,  r: 0.10 },
    pad:    { type: 'sawtooth', a: 0.18,  d: 0.3,  s: 0.75, r: 0.5, voices: 3, detune: 11, lp: 1900 },
    brass:  { type: 'sawtooth', a: 0.03,  d: 0.10, s: 0.7,  r: 0.14, lp: 2600 },
  };

  // 32칸 화음 패턴. entries: [[step, 'C4+E4+G4'], ...]
  function chord32(entries) {
    const a = new Array(32).fill('-');
    entries.forEach(([i, c]) => { a[i] = c; });
    return a;
  }
  const R = n => new Array(n).fill('-');   // 쉼표 n칸

  /* ------------------------------------------------------------------ 트랙 정의
   * 한 칸 = 16분음표.
   *   sections   : [{ lead, arp?, bass?, chords?, drum? }, ...]  섹션마다 멜로디 등을 교체
   *   arrangement: 섹션 재생 순서 (예: [0,1,0,2]) — 끝나면 처음부터 반복
   *   그 외 bass/chords/drum/arp 는 섹션에 없으면 트랙 기본값을 쓴다(공유). */
  const TRACKS = {
    // 1. 타이틀 — 밝은 타이쿤 오프닝. 멜로디 3종을 A-B-A-C 로 전개
    title: {
      bpm: 132, swing: 0.14,
      leadInst: 'pulse', arpInst: 'pluck', bassInst: 'saw', chordInst: 'pad',
      leadVol: 0.06, arpVol: 0.035, bassVol: 0.07, chordVol: 0.03, drumVol: 0.045,
      arp: [
        'C4','E4','G4','E4','C4','E4','G4','E4','D4','F4','A4','F4','D4','F4','A4','F4',
        'E4','G4','B4','G4','E4','G4','B4','G4','C4','E4','G4','E4','G4','B4','D5','B4',
      ],
      bass: [
        'C3','-','-','-','G2','-','-','-','D3','-','-','-','A2','-','-','-',
        'E3','-','-','-','B2','-','-','-','C3','-','G2','-','C3','-','-','-',
      ],
      chords: chord32([[0, 'C4+E4+G4'], [8, 'G3+B3+D4'], [16, 'A3+C4+E4'], [24, 'F3+A3+C4']]),
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-h-k-h-s-h-k-h-s-h-k-h-s-H-k-k-sp'.split(''),
      arrangement: [0, 1, 0, 2],
      sections: [
        { lead: [
          'C5','-','E5','-','G5','-','C6','-','G5','-','E5','-','C5','-','-','-',
          'D5','-','F5','-','A5','-','D6','-','A5','-','F5','-','D5','-','-','-',
          'E5','-','G5','-','B5','-','E6','-','D6','C6','B5','-','A5','-','G5','-',
          'F5','-','E5','-','D5','-','C5','-','G4','-','C5','-','-','-','-','-'] },
        { lead: [
          'E5','-','G5','-','E5','-','C5','-','D5','-','E5','-','G5','-','-','-',
          'A5','-','G5','-','E5','-','D5','-','B4','-','D5','-','G5','-','-','-',
          'C6','-','B5','-','A5','-','G5','-','E5','-','G5','-','A5','-','-','-',
          'F5','-','E5','-','D5','-','C5','-','D5','-','E5','-','-','-','-','-'] },
        { lead: [
          'G5','-','C6','-','E6','-','G6','-','E6','-','C6','-','G5','-','-','-',
          'A5','-','D6','-','F6','-','A6','-','F6','-','D6','-','A5','-','-','-',
          'G5','-','C6','-','E6','-','C6','-','B5','-','A5','-','G5','-','F5','-',
          'E5','-','G5','-','C6','-','G5','-','E5','-','C5','-','-','-','-','-'],
          drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-h-c-h-s-h-k-h-s-h-t-t-s-p-ktkts'.split('') },
      ],
    },

    // 2. 평온한 장 — 오르골 벨 멜로디 + 오르간 화음. 멜로디 3종을 느슨히 순환
    market_normal: {
      bpm: 116, swing: 0.12,
      leadInst: 'bell', arpInst: 'pluck', bassInst: 'tri', chordInst: 'organ',
      leadVol: 0.055, arpVol: 0.03, bassVol: 0.06, chordVol: 0.028, drumVol: 0.03,
      arp: [
        'C4','E4','G4','C5','G4','E4','C4','E4','A3','C4','E4','A4','E4','C4','A3','C4',
        'F3','A3','C4','F4','C4','A3','F3','A3','G3','B3','D4','G4','D4','B3','G3','B3',
      ],
      bass: [
        'C3','-','-','-','C3','-','-','-','A2','-','-','-','A2','-','-','-',
        'F2','-','-','-','F2','-','-','-','G2','-','-','-','G2','-','B2','-',
      ],
      chords: chord32([[0, 'C4+E4+G4'], [8, 'A3+C4+E4'], [16, 'F3+A3+C4'], [24, 'G3+B3+D4']]),
      drum: 'k---h---s---h---k---h---s---h-h-'.split(''),
      arrangement: [0, 1, 2, 1],
      sections: [
        { lead: [
          'E5','-','-','-','C5','-','-','-','G4','-','C5','-','D5','-','-','-',
          'C5','-','-','-','A4','-','-','-','E4','-','G4','-','A4','-','-','-',
          'G4','-','-','-','E5','-','-','-','D5','-','C5','-','B4','-','-','-',
          'C5','-','-','-','G4','-','A4','-','G4','-','E4','-','-','-','-','-'] },
        { lead: [
          'G5','-','E5','-','C5','-','E5','-','G5','-','-','-','A5','-','-','-',
          'E5','-','C5','-','A4','-','C5','-','E5','-','-','-','G5','-','-','-',
          'F5','-','A5','-','C6','-','A5','-','G5','-','E5','-','C5','-','-','-',
          'D5','-','G5','-','B5','-','G5','-','D5','-','-','-','-','-','-','-'] },
        { lead: [
          'C6','-','-','-','B5','-','A5','-','G5','-','-','-','E5','-','-','-',
          'A5','-','-','-','G5','-','E5','-','C5','-','-','-','A4','-','-','-',
          'F5','-','-','-','G5','-','A5','-','C6','-','-','-','A5','-','-','-',
          'G5','-','-','-','D5','-','G5','-','C5','-','-','-','-','-','-','-'] },
      ],
    },

    // 3. 떡상 — 빠른 톱니 리드, 몰아치는 비트. 상승 모티프 3종
    market_bull: {
      bpm: 158,
      leadInst: 'saw', arpInst: 'square', bassInst: 'saw',
      leadVol: 0.06, arpVol: 0.03, bassVol: 0.08, drumVol: 0.05,
      arp: [
        'C4','G4','C5','G4','C4','G4','C5','G4','D4','A4','D5','A4','D4','A4','D5','A4',
        'E4','B4','E5','B4','E4','B4','E5','B4','F4','C5','F5','C5','G4','D5','G5','D5',
      ],
      bass: [
        'C3','C3','C2','-','C3','-','C3','C3','D3','D3','D2','-','D3','-','D3','D3',
        'E3','E3','E2','-','E3','-','E3','E3','F3','F3','F2','-','G3','-','G2','-',
      ],
      drum: 'k-h-k-h-s-h-k-h-k-h-k-h-s-hkh-k-h-k-h-s-hkh-k-h-k-h-s-hkhs'.split(''),
      arrangement: [0, 1, 0, 2, 1, 2],
      sections: [
        { lead: [
          'C5','E5','G5','C6','G5','E5','C5','E5','D5','F5','A5','D6','A5','F5','D5','F5',
          'E5','G5','B5','E6','B5','G5','E5','G5','G5','B5','D6','G6','F6','E6','D6','C6'] },
        { lead: [
          'G5','C6','E6','G6','E6','C6','G5','C6','A5','D6','F6','A6','F6','D6','A5','D6',
          'B5','E6','G6','B6','G6','E6','B5','E6','C6','G5','E5','G5','C6','E6','G6','C6'] },
        { lead: [
          'E6','D6','C6','B5','C6','D6','E6','G6','C6','B5','A5','G5','A5','B5','C6','E6',
          'D6','C6','B5','A5','B5','C6','D6','F6','E6','D6','C6','B5','A5','G5','F5','E5'] },
      ],
    },

    // 4. 떡락 — 애처로운 사인 + 어두운 패드. 마이너 멜로디 2종
    market_bear: {
      bpm: 88,
      leadInst: 'sine', bassInst: 'tri', chordInst: 'pad',
      leadVol: 0.055, bassVol: 0.07, chordVol: 0.032, drumVol: 0.038,
      bass: [
        'A2','-','-','-','-','-','-','-','F2','-','-','-','-','-','-','-',
        'D2','-','-','-','-','-','-','-','E2','-','-','-','E2','-','-','-',
      ],
      chords: chord32([[0, 'A3+C4+E4'], [8, 'F3+A3+C4'], [16, 'D3+F3+A3'], [24, 'E3+G#3+B3']]),
      drum: 'k-------s-------k---k---s-------'.split(''),
      arrangement: [0, 1, 0, 1],
      sections: [
        { lead: [
          'A4','-','-','-','C5','-','B4','-','A4','-','-','-','G4','-','-','-',
          'F4','-','-','-','A4','-','G4','-','E4','-','-','-','-','-','-','-',
          'A4','-','-','-','E5','-','D5','-','C5','-','B4','-','A4','-','-','-',
          'G#4','-','-','-','B4','-','-','-','A4','-','-','-','-','-','-','-'] },
        { lead: [
          'E5','-','-','-','D5','-','C5','-','B4','-','A4','-','B4','-','-','-',
          'C5','-','-','-','A4','-','F4','-','D4','-','F4','-','A4','-','-','-',
          'D5','-','-','-','C5','-','B4','-','A4','-','G4','-','F4','-','-','-',
          'E4','-','-','-','G#4','-','B4','-','A4','-','-','-','-','-','-','-'] },
      ],
    },

    // 5. 뉴스/찌라시 — 통통 튀는 마림바 + 펄스. 짧은 프레이즈 3종
    news: {
      bpm: 112, swing: 0.16,
      leadInst: 'pluck', arpInst: 'pulse', bassInst: 'square',
      leadVol: 0.055, arpVol: 0.028, bassVol: 0.06, drumVol: 0.032,
      arp: [
        'C4','E4','C4','E4','F4','A4','F4','A4','G4','B4','G4','B4','C5','G4','E4','C4',
      ],
      bass: [
        'C3','-','C3','-','F2','-','F2','-','G2','-','G2','-','C3','-','-','-',
      ],
      drum: 'k--hs--kk--hs-h-'.split(''),
      arrangement: [0, 1, 0, 2],
      sections: [
        { lead: [
          'C5','-','G4','-','A4','-','C5','-','G4','-','E4','-','G4','-','-','-',
          'A4','-','F4','-','G4','-','A4','-','F4','D4','B3','-','G3','-','-','-'] },
        { lead: [
          'E5','-','C5','-','D5','-','E5','-','G5','-','E5','-','C5','-','-','-',
          'F5','-','D5','-','C5','-','A4','-','G4','-','B4','-','C5','-','-','-'] },
        { lead: [
          'G4','-','C5','-','E5','-','G5','-','E5','-','C5','-','G4','-','-','-',
          'A4','-','C5','-','F5','-','A5','-','G5','E5','C5','-','G4','-','-','-'] },
      ],
    },

    // 6. 파산/상장폐지 — 반음씩 흘러내리는 사인, 드럼 없음. 하강 라인 2종
    bankrupt: {
      bpm: 72,
      leadInst: 'sine', bassInst: 'saw', chordInst: 'pad',
      leadVol: 0.06, bassVol: 0.07, chordVol: 0.03, drumVol: 0,
      bass: [
        'C3','-','-','-','Bb2','-','-','-','Ab2','-','-','-','Gb2','-','-','-',
        'F2','-','-','-','Eb2','-','-','-','D2','-','-','-','-','-','-','-',
      ],
      chords: chord32([[0, 'C4+Eb4+G4'], [8, 'Ab3+C4+Eb4'], [16, 'F3+Ab3+C4'], [24, 'D3+F3+A3']]),
      drum: [],
      arrangement: [0, 1],
      sections: [
        { lead: [
          'C5','-','B4','-','Bb4','-','A4','-','Ab4','-','G4','-','Gb4','-','F4','-',
          'E4','-','-','-','Eb4','-','-','-','D4','-','-','-','-','-','-','-'] },
        { lead: [
          'G5','-','Gb5','-','F5','-','E5','-','Eb5','-','D5','-','Db5','-','C5','-',
          'B4','-','-','-','Bb4','-','-','-','A4','-','-','-','Ab4','-','-','-'] },
      ],
    },

    // 7. 대박/상한가 — 톱니 리드 + FM 벨 아르페지오 + 브라스 화음, 큰 락 드럼. 훅 3종
    jackpot: {
      bpm: 162,
      leadInst: 'saw', arpInst: 'bell', bassInst: 'square', chordInst: 'brass',
      leadVol: 0.06, arpVol: 0.03, bassVol: 0.08, chordVol: 0.03, drumVol: 0.06,
      arp: [
        'C5','E5','G5','C6','C5','E5','G5','C6','A4','C5','E5','A5','A4','C5','E5','A5',
        'F4','A4','C5','F5','F4','A4','C5','F5','G4','B4','D5','G5','G4','B4','D5','G5',
      ],
      bass: [
        'C3','-','C2','-','C3','-','C3','-','A2','-','A2','-','A2','-','A2','-',
        'F2','-','F2','-','F2','-','F2','-','G2','-','G2','-','G2','-','G2','-',
      ],
      chords: chord32([[0, 'C4+E4+G4'], [8, 'A3+C4+E4'], [16, 'F3+A4+C5'], [24, 'G3+B3+D4']]),
      drum: 'c-h-s-h-k-k-s-h-c-h-s-h-k-t-tttc-h-s-h-k-k-s-h-c-h-sph-ktkts'.split(''),
      arrangement: [0, 1, 2, 0, 2, 1],
      sections: [
        { lead: [
          'C5','C5','D5','E5','G5','-','C6','-','G5','-','E5','-','C5','-','G4','-',
          'A4','A4','C5','E5','A5','-','C6','-','A5','-','E5','-','C5','-','A4','-',
          'F4','F4','A4','C5','F5','-','A5','-','C6','-','A5','-','G5','-','E5','-',
          'G4','G4','B4','D5','G5','-','B5','-','D6','-','G6','-','G5','F5','E5','D5'] },
        { lead: [
          'G5','-','G5','C6','E6','-','G6','-','E6','C6','G5','-','E5','-','C5','-',
          'E5','-','E5','A5','C6','-','E6','-','C6','A5','E5','-','C5','-','A4','-',
          'A5','-','A5','C6','F6','-','A6','-','F6','C6','A5','-','G5','-','E5','-',
          'D6','-','B5','G5','D6','-','G6','-','B6','-','G6','D6','B5','G5','D5','G5'] },
        { lead: [
          'E6','G6','E6','C6','G5','E5','C5','E5','G5','C6','E6','G6','E6','C6','G5','E5',
          'A5','C6','A5','E5','C5','A4','E4','A4','C5','E5','A5','C6','A5','E5','C5','A4',
          'F5','A5','C6','F6','C6','A5','F5','A5','G5','B5','D6','G6','D6','B5','G5','B5',
          'C6','G5','E5','C5','E5','G5','C6','E6','G6','E6','C6','G5','C6','E6','G6','C6'] },
      ],
    },

    // 8. 튜토리얼/엔딩 — 오르골 벨 + 넓은 패드 + 사인 베이스, 몽환적. 테마 3종
    dreamy: {
      bpm: 92, swing: 0.1,
      leadInst: 'bell', bassInst: 'sine', chordInst: 'pad', arpInst: 'pluck',
      leadVol: 0.06, arpVol: 0.025, bassVol: 0.055, chordVol: 0.035, drumVol: 0.02,
      arp: [
        'C4','G4','C5','G4','E4','G4','C5','G4','F4','A4','C5','A4','F4','A4','C5','A4',
        'C4','G4','C5','G4','E4','G4','C5','G4','G3','D4','G4','D4','G3','D4','G4','B4',
      ],
      bass: [
        'C3','-','-','-','-','-','-','-','F2','-','-','-','-','-','-','-',
        'A2','-','-','-','-','-','-','-','G2','-','-','-','-','-','-','-',
      ],
      chords: chord32([[0, 'C4+E4+G4+B4'], [8, 'F3+A3+C4+E4'], [16, 'A3+C4+E4+G4'], [24, 'G3+B3+D4+F4']]),
      drum: 'k-------h-------s-------h-----h-'.split(''),
      arrangement: [0, 1, 2, 1],
      sections: [
        { lead: [
          'C5','-','-','-','G5','-','-','-','F5','-','E5','-','D5','-','-','-',
          'E5','-','-','-','C5','-','-','-','A4','-','B4','-','C5','-','D5','-',
          'G5','-','-','-','E5','-','-','-','D5','-','C5','-','B4','-','-','-',
          'C5','-','-','-','E5','-','G5','-','C6','-','-','-','-','-','-','-'] },
        { lead: [
          'E5','-','-','-','D5','-','C5','-','E5','-','-','-','G5','-','-','-',
          'F5','-','-','-','E5','-','C5','-','A4','-','-','-','C5','-','-','-',
          'E5','-','G5','-','A5','-','G5','-','E5','-','-','-','D5','-','-','-',
          'G5','-','-','-','F5','-','E5','-','G5','-','-','-','-','-','-','-'] },
        { lead: [
          'G5','-','-','-','C6','-','-','-','B5','-','A5','-','G5','-','-','-',
          'A5','-','-','-','G5','-','E5','-','F5','-','-','-','A5','-','-','-',
          'G5','-','E5','-','C6','-','B5','-','A5','-','G5','-','E5','-','-','-',
          'D5','-','E5','-','G5','-','C6','-','G5','-','-','-','-','-','-','-'] },
      ],
    },
  };

  // 예전 장면 이름 → 새 트랙 (다른 화면·저장 데이터의 호출이 남아도 음악이 꺼지지 않게)
  const ALIASES = { market: 'market_normal', closed: 'news', date: 'dreamy' };

  /* ----------------------------------------------------- Tone.js + SAM 보컬
   * 기존 스케줄러의 AudioContext 시간과 Tone 시간을 매 틱 환산한다.
   * 보컬은 SAM이 만든 짧은 PCM 음절을 Tone.Player로 음정 변환해 재생한다. */
  const sung = (text, note, step, beats, vowel, onset) => ({
    text, note, step, beats, vowel, onset,
  });

  // 1칸은 해당 트랙의 16분음표다. SAM 발음 조각 + 지속 모음 포먼트를
  // 같은 음정에 배치해 "말 샘플을 멜로디로 연주하는" 기계 보컬을 만든다.
  // 각 장면 보컬은 절(verse)·후렴(chorus)·브리지를 sections 로 나눠 편곡을 따라 바뀐다.
  // sectionStyles 로 절마다 목소리(음색)까지 바꿔 한 곡 안에서 변화를 크게 준다.
  // sections 가 없으면 score 하나를 계속 반복(구버전 호환).
  const VOCAL_TRACKS = {
    title: {
      profile: 'bright', style: 'arcade', gain: 0.22, duet: true,
      sectionStyles: ['arcade', 'neon', 'opera'],
      sections: [
        [ // 후렴 — "빠른 매매, 매일 우리는 이긴다"
          sung('QUICK', 'C5', 0, 3, 'I', 'K'), sung('TRADE', 'E5', 4, 4, 'A', 'T'),
          sung('RISE', 'G5', 10, 4, 'I', 'R'), sung('TO', 'A5', 16, 2, 'U', 'T'),
          sung('DAY', 'C6', 18, 6, 'A', 'D'), sung('WE', 'A5', 26, 2, 'E', 'W'),
          sung('WIN', 'G5', 28, 3, 'I', 'W'),
        ],
        [ // 절 — "싸게 사서 비싸게, 크게 꿈꿔"
          sung('BUY', 'C5', 0, 3, 'I', 'B'), sung('LOW', 'E5', 4, 3, 'O', 'L'),
          sung('SELL', 'G5', 8, 3, 'E', 'S'), sung('HIGH', 'C6', 12, 4, 'I', 'H'),
          sung('DREAM', 'E6', 18, 4, 'E', 'D'), sung('SO', 'C6', 24, 2, 'O', 'S'),
          sung('BIG', 'G5', 27, 4, 'I', 'B'),
        ],
        [ // 브리지 — "우리는 오늘도 살아있다"
          sung('WE', 'E5', 0, 3, 'E', 'W'), sung('ARE', 'G5', 4, 3, 'A', ''),
          sung('STILL', 'A5', 8, 3, 'I', 'S'), sung('A', 'G5', 12, 2, 'A', ''),
          sung('LIVE', 'C6', 14, 5, 'I', 'L'), sung('TO', 'A5', 22, 2, 'U', 'T'),
          sung('DAY', 'E5', 25, 6, 'A', 'D'),
        ],
      ],
    },
    market_normal: {
      profile: 'warm', style: 'ticker', gain: 0.15,
      sectionStyles: ['ticker', 'choir', 'crystal'],
      sections: [
        [
          sung('STEAD', 'E5', 0, 5, 'E', 'S'), sung('Y', 'C5', 6, 3, 'E', ''),
          sung('FLOW', 'A4', 12, 4, 'O', 'F'), sung('OF', 'G4', 18, 2, 'O', ''),
          sung('GAINS', 'C5', 22, 7, 'A', 'G'),
        ],
        [
          sung('SLOW', 'G4', 0, 4, 'O', 'S'), sung('AND', 'E4', 6, 2, 'A', ''),
          sung('SURE', 'A4', 10, 4, 'U', 'S'), sung('HOLD', 'C5', 16, 4, 'O', 'H'),
          sung('THE', 'G4', 22, 2, 'E', 'D'), sung('LINE', 'E5', 25, 6, 'I', 'L'),
        ],
        [
          sung('CALM', 'C5', 0, 4, 'A', 'K'), sung('WA', 'A4', 6, 2, 'A', 'W'),
          sung('TERS', 'G4', 8, 3, 'E', 'T'), sung('DRIFT', 'E5', 14, 4, 'I', 'D'),
          sung('A', 'G4', 20, 2, 'A', ''), sung('WAY', 'A4', 23, 7, 'A', 'W'),
        ],
      ],
    },
    market_bull: {
      profile: 'bright', style: 'turbo', gain: 0.2, duet: true,
      sectionStyles: ['turbo', 'grit', 'stadium'],
      sections: [
        [
          sung('RISE', 'C5', 0, 3, 'I', 'R'), sung('UP', 'E5', 4, 3, 'U', ''),
          sung('RISE', 'G5', 8, 3, 'I', 'R'), sung('HIGH', 'C6', 12, 5, 'I', 'H'),
          sung('GO', 'G5', 20, 3, 'O', 'G'), sung('GO', 'C6', 24, 3, 'O', 'G'),
          sung('GO', 'E6', 28, 3, 'O', 'G'),
        ],
        [
          sung('TO', 'E5', 0, 3, 'U', 'T'), sung('THE', 'G5', 4, 2, 'E', 'D'),
          sung('MOON', 'C6', 8, 5, 'U', 'M'), sung('WE', 'E6', 16, 3, 'E', 'W'),
          sung('FLY', 'G6', 20, 4, 'I', 'F'), sung('NOW', 'E6', 26, 5, 'O', 'N'),
        ],
        [
          sung('GREEN', 'C6', 0, 4, 'E', 'G'), sung('ALL', 'E6', 6, 3, 'A', ''),
          sung('GREEN', 'G6', 10, 4, 'E', 'G'), sung('NEV', 'C6', 18, 2, 'E', 'N'),
          sung('ER', 'A5', 20, 2, 'E', ''), sung('STOP', 'G5', 24, 7, 'O', 'S'),
        ],
      ],
    },
    market_bear: {
      profile: 'hollow', style: 'hollow', gain: 0.15,
      sectionStyles: ['hollow', 'choir'],
      sections: [
        [
          sung('FALL', 'A4', 0, 6, 'A', 'F'), sung('ING', 'E4', 8, 5, 'I', ''),
          sung('DOWN', 'F4', 16, 7, 'O', 'D'), sung('LOW', 'E4', 24, 7, 'O', 'L'),
        ],
        [
          sung('RED', 'A4', 0, 4, 'E', 'R'), sung('SKY', 'F4', 6, 4, 'I', 'S'),
          sung('COLD', 'E4', 14, 5, 'O', 'K'), sung('LONG', 'D4', 22, 8, 'O', 'L'),
        ],
      ],
    },
    news: {
      profile: 'bright', style: 'broadcast', gain: 0.13,
      sectionStyles: ['broadcast', 'grit', 'neon'],
      sections: [
        [
          sung('BREAK', 'C5', 0, 4, 'A', 'B'), sung('ING', 'E5', 5, 3, 'I', ''),
          sung('NEWS', 'G5', 10, 6, 'U', 'N'), sung('NOW', 'C6', 20, 7, 'O', 'N'),
        ],
        [
          sung('HEAD', 'C5', 0, 3, 'E', 'H'), sung('LINE', 'E5', 5, 4, 'I', 'L'),
          sung('HOT', 'G5', 12, 3, 'O', 'H'), sung('OFF', 'A5', 16, 3, 'O', ''),
          sung('THE', 'G5', 20, 2, 'E', 'D'), sung('WIRE', 'E5', 24, 6, 'I', 'W'),
        ],
        [
          sung('RED', 'C5', 0, 3, 'E', 'R'), sung('A', 'E5', 4, 2, 'A', ''),
          sung('LERT', 'G5', 6, 4, 'E', 'L'), sung('EV', 'C6', 12, 2, 'E', ''),
          sung('RY', 'A5', 14, 2, 'E', ''), sung('ONE', 'G5', 16, 4, 'U', 'W'),
          sung('LOOK', 'C6', 22, 7, 'U', 'L'),
        ],
      ],
    },
    bankrupt: {
      profile: 'hollow', style: 'broken', gain: 0.14,
      sectionStyles: ['broken', 'robotix'],
      sections: [
        [
          sung('NO', 'C4', 0, 7, 'O', 'N'), sung('MORE', 'Ab3', 8, 7, 'O', 'M'),
          sung('CASH', 'F3', 16, 10, 'A', 'K'),
        ],
        [
          sung('ALL', 'C4', 0, 5, 'A', ''), sung('GONE', 'Ab3', 8, 6, 'O', 'G'),
          sung('NOW', 'F3', 16, 4, 'O', 'N'), sung('DARK', 'Eb3', 22, 8, 'A', 'D'),
        ],
      ],
    },
    jackpot: {
      profile: 'bright', style: 'stadium', gain: 0.24, duet: true,
      sectionStyles: ['stadium', 'opera', 'grit'],
      sections: [
        [
          sung('WE', 'C5', 0, 3, 'E', 'W'), sung('WON', 'E5', 4, 4, 'O', 'W'),
          sung('BIG', 'G5', 9, 5, 'I', 'B'), sung('JACK', 'C6', 16, 4, 'A', 'J'),
          sung('POT', 'E6', 21, 8, 'O', 'P'),
        ],
        [
          sung('RICH', 'C5', 0, 3, 'I', 'R'), sung('TO', 'E5', 4, 2, 'U', 'T'),
          sung('DAY', 'G5', 8, 4, 'A', 'D'), sung('DREAMS', 'C6', 14, 4, 'E', 'D'),
          sung('COME', 'G5', 20, 3, 'U', 'K'), sung('TRUE', 'C6', 24, 7, 'U', 'T'),
        ],
        [
          sung('SKY', 'E5', 0, 3, 'I', 'S'), sung('HIGH', 'G5', 4, 4, 'I', 'H'),
          sung('NO', 'C6', 10, 3, 'O', 'N'), sung('LIM', 'E6', 14, 2, 'I', 'L'),
          sung('IT', 'C6', 16, 2, 'I', ''), sung('WIN', 'G6', 20, 7, 'I', 'W'),
        ],
      ],
    },
    dreamy: {
      profile: 'soft', style: 'dream', gain: 0.17, duet: true,
      sectionStyles: ['dream', 'crystal', 'choir'],
      sections: [
        [
          sung('STAY', 'C5', 0, 7, 'A', 'S'), sung('WITH', 'G4', 8, 5, 'I', 'W'),
          sung('ME', 'A4', 16, 7, 'E', 'M'), sung('TO', 'E5', 24, 2, 'U', 'T'),
          sung('NIGHT', 'G5', 26, 6, 'I', 'N'),
        ],
        [
          sung('HOLD', 'E5', 0, 6, 'O', 'H'), sung('MY', 'C5', 8, 4, 'I', 'M'),
          sung('HAND', 'G4', 14, 5, 'A', 'H'), sung('SLOW', 'A4', 22, 8, 'O', 'S'),
        ],
        [
          sung('JUST', 'G4', 0, 4, 'U', 'J'), sung('YOU', 'A4', 6, 4, 'U', 'Y'),
          sung('AND', 'C5', 12, 3, 'A', ''), sung('ME', 'E5', 16, 4, 'E', 'M'),
          sung('HERE', 'G5', 22, 8, 'E', 'H'),
        ],
      ],
    },
  };

  // 일반 장중·뉴스까지 계속 노래하면 정보음과 멜로디가 서로 싸우고 모바일 노드 수도
  // 지나치게 늘어난다. 자동 보컬은 타이틀 훅에만 쓰고, 나머지는 캐릭터 장면에서
  // playCharacter()가 명시적으로 요청할 때만 켠다.
  const AUTO_VOCAL_TRACKS = new Set(['title']);
  function vocalFor(trackName) {
    return advanced.voiceOverride ||
      (AUTO_VOCAL_TRACKS.has(trackName) ? VOCAL_TRACKS[trackName] : null);
  }

  // 캐릭터 전용 보컬 모티프. 반주는 기존 장면 트랙을 재사용하고 보컬만 교체한다.
  const CHARACTER_VOCALS = {
    narae: {
      base: 'title', profile: 'warm', style: 'guide', gain: 0.16, duet: true,
      score: [
        sung('COME', 'C5', 0, 5, 'U', 'K'),
        sung('THIS', 'E5', 6, 4, 'I', 'D'),
        sung('WAY', 'G5', 12, 7, 'A', 'W'),
        sung('BREATHE', 'E5', 22, 8, 'E', 'B'),
      ],
    },
    yujin: {
      base: 'news', profile: 'firm', style: 'guardian', gain: 0.18,
      score: [
        sung('STAY', 'C4', 0, 6, 'A', 'S'),
        sung('BE', 'G4', 8, 4, 'E', 'B'),
        sung('HIND', 'Eb4', 14, 6, 'I', 'H'),
        sung('ME', 'C4', 24, 8, 'E', 'M'),
      ],
    },
    chaerin: {
      base: 'dreamy', profile: 'velvet', style: 'velvetKnife', gain: 0.17, duet: true,
      score: [
        sung('KNEEL', 'E5', 0, 7, 'E', 'K'),
        sung('THEN', 'C5', 10, 5, 'E', 'D'),
        sung('SPEAK', 'G5', 18, 10, 'E', 'S'),
      ],
    },
    sera: {
      base: 'bankrupt', profile: 'hollow', style: 'stalker', gain: 0.18, duet: true,
      score: [
        sung('FOUND', 'A4', 0, 7, 'O', 'F'),
        sung('YOU', 'E5', 8, 6, 'U', 'Y'),
        sung('A', 'C5', 17, 3, 'A', ''),
        sung('GAIN', 'A4', 22, 10, 'A', 'G'),
      ],
    },
  };

  const VOWEL_FORMANTS = {
    A: { f1:800, f2:1150, f3:2900 },
    E: { f1:500, f2:1700, f3:2500 },
    I: { f1:300, f2:2200, f3:3000 },
    O: { f1:500, f2:900,  f3:2600 },
    U: { f1:350, f2:700,  f3:2400 },
  };

  const SAM_PROFILES = {
    bright: { speed: 82, pitch: 48, mouth: 150, throat: 115 },
    warm:   { speed: 76, pitch: 58, mouth: 128, throat: 118 },
    soft:   { speed: 88, pitch: 44, mouth: 138, throat: 105 },
    hollow: { speed: 92, pitch: 70, mouth: 108, throat: 142 },
    firm:   { speed: 72, pitch: 64, mouth: 118, throat: 150 },
    velvet: { speed: 80, pitch: 42, mouth: 152, throat: 92 },
    crystal:{ speed: 70, pitch: 40, mouth: 160, throat: 100 },   // 맑고 높은 합창톤
    diva:   { speed: 74, pitch: 38, mouth: 158, throat: 96 },    // 오페라풍 여성 기계 가수
    android:{ speed: 90, pitch: 74, mouth: 96,  throat: 158 },   // 낮고 딱딱한 안드로이드
  };

  // 같은 악보라도 이 값들의 조합으로 전혀 다른 기계 보컬이 된다.
  const VOICE_STYLES = {
    arcade:      { wave:'square',   sample:0.95, formant:0.62, consonant:0.8,  vibrato:0.025, vibratoRate:6.0, glide:0,     formantScale:1.05 },
    ticker:      { wave:'sawtooth', sample:0.62, formant:0.50, consonant:0.62, vibrato:0.012, vibratoRate:5.0, glide:0.02,  formantScale:0.96 },
    turbo:       { wave:'square',   sample:0.88, formant:0.72, consonant:1.15, vibrato:0.018, vibratoRate:7.4, glide:0.06,  formantScale:1.12 },
    hollow:      { wave:'triangle', sample:0.46, formant:0.68, consonant:0.42, vibrato:0.07,  vibratoRate:4.1, glide:-0.08, formantScale:0.82 },
    broadcast:   { wave:'sawtooth', sample:0.92, formant:0.42, consonant:1.25, vibrato:0,     vibratoRate:5.0, glide:0,     formantScale:1.08 },
    broken:      { wave:'sawtooth', sample:0.38, formant:0.58, consonant:0.75, vibrato:0.11,  vibratoRate:3.0, glide:-0.18, formantScale:0.72, glitch:true },
    stadium:     { wave:'square',   sample:1.0,  formant:0.74, consonant:1.2,  vibrato:0.045, vibratoRate:6.5, glide:0.08,  formantScale:1.15 },
    dream:       { wave:'triangle', sample:0.45, formant:0.66, consonant:0.38, vibrato:0.09,  vibratoRate:4.7, glide:0.04,  formantScale:0.92, whisper:0.2 },
    guide:       { wave:'triangle', sample:0.58, formant:0.60, consonant:0.55, vibrato:0.055, vibratoRate:5.3, glide:0.03,  formantScale:1.0 },
    guardian:    { wave:'sawtooth', sample:0.76, formant:0.55, consonant:1.05, vibrato:0.018, vibratoRate:4.2, glide:-0.03, formantScale:0.84 },
    velvetKnife: { wave:'triangle', sample:0.50, formant:0.72, consonant:0.82, vibrato:0.075, vibratoRate:5.8, glide:0.08,  formantScale:1.18, whisper:0.15 },
    stalker:     { wave:'sawtooth', sample:0.32, formant:0.64, consonant:0.48, vibrato:0.12,  vibratoRate:3.6, glide:-0.12, formantScale:0.88, whisper:0.55, glitch:true },
    // 추가 음색 — 절/후렴에서 목소리를 바꿔 변화를 준다
    crystal:     { wave:'sine',     sample:0.42, formant:0.78, consonant:0.5,  vibrato:0.05,  vibratoRate:5.6, glide:0.02,  formantScale:1.12, whisper:0.1 },   // 맑은 벨/합창
    opera:       { wave:'triangle', sample:0.4,  formant:0.82, consonant:0.55, vibrato:0.13,  vibratoRate:5.2, glide:0.06,  formantScale:1.22 },                 // 포탈2 터렛 오페라풍 비브라토
    grit:        { wave:'sawtooth', sample:0.9,  formant:0.6,  consonant:1.35, vibrato:0.02,  vibratoRate:6.9, glide:0.05,  formantScale:1.02 },                 // 거친 록 보컬
    neon:        { wave:'square',   sample:0.72, formant:0.68, consonant:0.95, vibrato:0.035, vibratoRate:6.3, glide:0.05,  formantScale:1.08 },                 // 신스팝
    choir:       { wave:'triangle', sample:0.55, formant:0.7,  consonant:0.4,  vibrato:0.06,  vibratoRate:4.9, glide:0.03,  formantScale:1.05, whisper:0.28 },   // 공허한 합창
    robotix:     { wave:'square',   sample:0.5,  formant:0.5,  consonant:1.1,  vibrato:0.005, vibratoRate:8.0, glide:0,     formantScale:0.9,  glitch:true },     // 딱딱한 로봇
  };

  function noteMidi(note) {
    const m = NOTE_RE.exec(note || '');
    if (!m) return 60;
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return 69 + BASE[m[1]] + acc + (parseInt(m[3], 10) - 4) * 12;
  }
  function semitoneRate(semitone) {
    return Math.pow(2, semitone / 12);
  }

  const advanced = {
    ready: false,
    failed: false,
    starting: null,
    name: null,
    generation: 0,
    cache: new Map(),
    players: new Set(),
    voices: new Set(),
    nodes: null,
    voiceOverride: null,

    supported() {
      return !!(root.Tone && root.SamJs);
    },

    async init() {
      if (this.ready) return true;
      if (this.failed || !this.supported()) return false;
      if (this.starting) return this.starting;
      this.starting = (async () => {
        try {
          const T = root.Tone;
          await T.start();
          const destination = T.getDestination ? T.getDestination() : T.Destination;
          const limiter = new T.Limiter(-8).connect(destination);
          const mix = new T.Gain(Math.max(0.001, volume * 0.38)).connect(limiter);
          const reverb = new T.Reverb({ decay: 1.8, preDelay: 0.025, wet: 0.18 }).connect(mix);
          const chorus = new T.Chorus({
            frequency: 1.2, delayTime: 3.2, depth: 0.18, spread: 120, wet: 0.12,
          }).start().connect(reverb);
          const vocalFilter = new T.Filter({ type: 'highpass', frequency: 105, rolloff: -12 }).connect(chorus);
          const pad = new T.PolySynth(T.AMSynth, {
            harmonicity: 1.5,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.18, decay: 0.35, sustain: 0.34, release: 1.8 },
            modulation: { type: 'triangle' },
            modulationEnvelope: { attack: 0.2, decay: 0.2, sustain: 0.2, release: 1.2 },
            volume: -22,
          }).connect(reverb);
          const accent = new T.FMSynth({
            harmonicity: 2.1, modulationIndex: 3,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.12, sustain: 0.08, release: 0.4 },
            modulation: { type: 'triangle' },
            modulationEnvelope: { attack: 0.01, decay: 0.16, sustain: 0, release: 0.2 },
            volume: -25,
          }).connect(chorus);
          const breath = new T.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.01, decay: 0.07, sustain: 0, release: 0.05 },
            volume: -34,
          }).connect(vocalFilter);
          const sibilantFilter = new T.Filter({
            type: 'highpass', frequency: 4300, rolloff: -24,
          }).connect(vocalFilter);
          const sibilant = new T.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.025 },
            volume: -29,
          }).connect(sibilantFilter);
          const plosiveFilter = new T.Filter({
            type: 'bandpass', frequency: 1900, Q: 2.4,
          }).connect(vocalFilter);
          const plosive = new T.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.018 },
            volume: -26,
          }).connect(plosiveFilter);
          const nasal = new T.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.008, decay: 0.08, sustain: 0.18, release: 0.12 },
            volume: -25,
          }).connect(vocalFilter);
          this.nodes = {
            limiter, mix, reverb, chorus, vocalFilter, pad, accent, breath,
            sibilantFilter, sibilant, plosiveFilter, plosive, nasal,
          };
          this.ready = true;
          this.setVolume(volume);
          return true;
        } catch (err) {
          this.failed = true;
          console.warn('[QuickTrade BGM] Tone.js/SAM 보컬 레이어 초기화 실패, WebAudio로 재생합니다.', err);
          return false;
        } finally {
          this.starting = null;
        }
      })();
      return this.starting;
    },

    setVolume(v) {
      if (this.nodes && this.nodes.mix) {
        const target = Math.max(0.0001, v * 0.38);
        const gain = this.nodes.mix.gain;
        if (gain && typeof gain.rampTo === 'function') gain.rampTo(target, 0.08);
        else if (gain) gain.value = target;
      }
    },

    rawContext() {
      const T = root.Tone;
      const toneCtx = T && (T.getContext ? T.getContext() : T.context);
      return toneCtx && (toneCtx.rawContext || toneCtx._context || toneCtx);
    },

    sample(profileName, syllable) {
      const key = `${profileName}:${syllable}`;
      if (this.cache.has(key)) return this.cache.get(key);
      try {
        const p = SAM_PROFILES[profileName] || SAM_PROFILES.warm;
        const sam = new root.SamJs({
          speed: p.speed, pitch: p.pitch, mouth: p.mouth, throat: p.throat, singmode: true,
        });
        const pcm = sam.buf32(syllable);
        const raw = this.rawContext();
        if (!raw || !pcm || !pcm.length) return null;
        const buffer = raw.createBuffer(1, pcm.length, 22050);
        if (buffer.copyToChannel) buffer.copyToChannel(pcm, 0);
        else buffer.getChannelData(0).set(pcm);
        this.cache.set(key, buffer);
        return buffer;
      } catch (err) {
        console.warn('[QuickTrade BGM] SAM 음절 생성 실패:', syllable, err);
        return null;
      }
    },

    async start(name) {
      const generation = ++this.generation;
      this.name = name;
      const ok = await this.init();
      if (!ok || generation !== this.generation) return;
      this.name = name;
    },

    stop() {
      this.generation++;
      this.name = null;
      this.players.forEach(player => {
        try { player.stop(); player.dispose(); } catch (e) {}
      });
      this.players.clear();
      this.voices.forEach(voice => {
        try { voice.stop(); } catch (e) {}
        try { voice.dispose(); } catch (e) {}
      });
      this.voices.clear();
      if (this.nodes) {
        try { this.nodes.pad.releaseAll(); } catch (e) {}
      }
    },

    toneTime(audioTime) {
      if (!root.Tone || !ctx) return 0;
      return root.Tone.now() + Math.max(0.015, audioTime - ctx.currentTime);
    },

    playSample(buffer, midi, at, gain, pan, maxDuration) {
      if (!buffer || !this.ready || !this.nodes) return;
      const T = root.Tone;
      let player;
      try {
        // 짧은 시간에 음절이 몰려도 오래된 샘플을 정리해 모바일 오디오 노드 폭증을 막는다.
        while (this.players.size >= 12) {
          const oldest = this.players.values().next().value;
          this.players.delete(oldest);
          try { oldest.stop(); oldest.dispose(); } catch (e) {}
        }
        const channel = new T.Channel({ volume: -4, pan: pan || 0 }).connect(this.nodes.vocalFilter);
        player = new T.Player(buffer).connect(channel);
        // C4(60)를 SAM 원음 기준으로 삼는다. 반음 n개의 비율은 정확히 2^(n/12).
        player.playbackRate = Math.max(0.42, Math.min(3.2, semitoneRate(midi - 60)));
        player.volume.value = T.gainToDb
          ? T.gainToDb(Math.max(0.001, gain))
          : -16;
        const naturalDuration = buffer.duration / player.playbackRate;
        const playDuration = Math.max(0.04, Math.min(naturalDuration, maxDuration || naturalDuration));
        player.fadeOut = Math.min(0.08, Math.max(0.015, playDuration * 0.16));
        player.start(at, 0, playDuration);
        this.players.add(player);
        const life = Math.max(450, (playDuration + 0.35) * 1000);
        setTimeout(() => {
          this.players.delete(player);
          try { player.dispose(); channel.dispose(); } catch (e) {}
        }, life);
      } catch (err) {
        if (player) this.players.delete(player);
      }
    },

    consonantAttack(onset, note, at, gain, style) {
      if (!onset || !this.nodes) return;
      const c = String(onset).toUpperCase();
      const strength = gain * (style.consonant == null ? 1 : style.consonant);
      try {
        if (/^(S|SH|CH|F|Z)$/.test(c)) {
          this.nodes.sibilant.triggerAttackRelease(
            c === 'SH' || c === 'CH' ? 0.11 : 0.075, at, Math.min(1, strength * 2.8)
          );
        } else if (/^(K|T|P|B|D|G|Q|J)$/.test(c)) {
          this.nodes.plosive.triggerAttackRelease(0.045, at, Math.min(1, strength * 3.1));
        } else if (/^(M|N|NG)$/.test(c)) {
          this.nodes.nasal.triggerAttackRelease(note, 0.14, at, Math.min(1, strength * 2.2));
        } else if (c === 'H') {
          this.nodes.breath.triggerAttackRelease(0.085, at, Math.min(1, strength * 2.4));
        }
      } catch (e) {}
    },

    whisper(at, duration, gain) {
      if (!this.nodes || gain <= 0) return;
      try {
        this.nodes.breath.triggerAttackRelease(
          Math.max(0.05, Math.min(0.28, duration * 0.7)), at, Math.min(1, gain * 3)
        );
      } catch (e) {}
    },

    sustainVowel(midi, vowel, at, duration, gain, pan, style) {
      if (!this.ready || !this.nodes || duration <= 0.035) return;
      const T = root.Tone;
      const formant = VOWEL_FORMANTS[vowel] || VOWEL_FORMANTS.A;
      const end = at + duration;
      const voice = { stopped: false, parts: [] };
      try {
        while (this.voices.size >= 8) {
          const oldest = this.voices.values().next().value;
          this.voices.delete(oldest);
          try { oldest.stop(); oldest.dispose(); } catch (e) {}
        }
        const panner = new T.Panner(pan || 0).connect(this.nodes.vocalFilter);
        const vibrato = new T.Vibrato({
          frequency: style.vibratoRate || 5,
          depth: Math.max(0, style.vibrato || 0),
          wet: style.vibrato ? 0.55 : 0,
        }).start().connect(panner);
        const amp = new T.Gain(0.0001).connect(vibrato);
        const hz = 440 * semitoneRate(midi - 69);
        const startHz = hz * semitoneRate((style.glide || 0) * 12);
        const oscillator = new T.Oscillator({
          frequency: startHz,
          type: style.wave || 'sawtooth',
          volume: -18,
        });
        const weights = [0.92, 0.58];
        [formant.f1, formant.f2].forEach((center, index) => {
          const filter = new T.Filter({
            type: 'bandpass',
            frequency: center * (style.formantScale || 1),
            Q: index === 0 ? 7 : 10,
          });
          const weight = new T.Gain(weights[index]);
          oscillator.connect(filter);
          filter.connect(weight);
          weight.connect(amp);
          voice.parts.push(filter, weight);
        });
        const target = Math.max(0.0008, gain * (style.formant == null ? 0.6 : style.formant));
        amp.gain.setValueAtTime(0.0001, at);
        amp.gain.exponentialRampToValueAtTime(target, at + Math.min(0.045, duration * 0.22));
        amp.gain.setValueAtTime(target * 0.9, Math.max(at + 0.05, end - 0.08));
        amp.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
        oscillator.frequency.setValueAtTime(startHz, at);
        oscillator.frequency.exponentialRampToValueAtTime(hz, at + Math.min(0.12, duration * 0.4));
        if (style.glitch && duration > 0.18) {
          oscillator.frequency.setValueAtTime(hz * semitoneRate(-0.45), at + duration * 0.48);
          oscillator.frequency.exponentialRampToValueAtTime(hz, at + duration * 0.58);
        }
        oscillator.start(at);
        oscillator.stop(end + 0.1);
        voice.parts.push(oscillator, amp, vibrato, panner);
        voice.stop = () => {
          if (voice.stopped) return;
          voice.stopped = true;
          try { oscillator.stop(); } catch (e) {}
        };
        voice.dispose = () => {
          voice.parts.forEach(part => { try { part.dispose(); } catch (e) {} });
        };
        this.voices.add(voice);
        const delay = Math.max(150, (end - T.now() + 0.22) * 1000);
        setTimeout(() => {
          this.voices.delete(voice);
          voice.dispose();
        }, delay);
      } catch (e) {
        try { voice.dispose(); } catch (err) {}
      }
    },

    schedule(trackName, track, sec, step, audioTime, spb, arrIdx) {
      if (!this.ready || this.name !== trackName || !this.nodes) return;
      const vocal = this.voiceOverride || VOCAL_TRACKS[trackName];
      if (!vocal) return;
      const local = step % 32;
      const time = this.toneTime(audioTime);

      // 편곡 위치(arrIdx)에 따라 절/후렴 보컬을 바꾼다. sections 가 없으면 기존 score.
      const idx = arrIdx || 0;
      const banks = (vocal.sections && vocal.sections.length) ? vocal.sections : null;
      const score = banks ? (banks[idx % banks.length] || vocal.score || []) : (vocal.score || []);
      const styleName = (banks && vocal.sectionStyles && vocal.sectionStyles[idx % banks.length]) || vocal.style;
      const phraseIndex = score.findIndex(item => item.step === local);
      if (phraseIndex < 0) return;

      const phrase = score[phraseIndex];
      const style = VOICE_STYLES[styleName] || VOICE_STYLES.arcade;
      const midi = noteMidi(phrase.note);
      const duration = Math.max(0.08, phrase.beats * spb);
      const buffer = this.sample(vocal.profile, phrase.text);
      this.consonantAttack(phrase.onset, phrase.note, time, vocal.gain, style);
      this.whisper(time + 0.015, duration, vocal.gain * (style.whisper || 0));
      this.playSample(buffer, midi, time,
        vocal.gain * style.sample, phraseIndex % 2 ? 0.12 : -0.12, duration * 0.72);
      this.sustainVowel(midi, phrase.vowel, time + Math.min(0.045, duration * 0.15),
        Math.max(0.05, duration - 0.045), vocal.gain,
        phraseIndex % 2 ? 0.1 : -0.1, style);

      // 완벽히 같은 복제 대신 미세한 시간·음정 차를 둔 더블 트래킹.
      if (vocal.duet && phraseIndex % 4 === 0 && this.voices.size < 4) {
        const harmony = phraseIndex % 4 === 0 ? 7 : -5;
        const harmonyTime = time + 0.024;
        this.playSample(buffer, midi + harmony, harmonyTime,
          vocal.gain * style.sample * 0.38,
          phraseIndex % 4 === 0 ? 0.34 : -0.34, duration * 0.66);
        this.sustainVowel(midi + harmony, phrase.vowel, harmonyTime + 0.035,
          Math.max(0.05, duration - 0.06), vocal.gain * 0.38,
          phraseIndex % 4 === 0 ? 0.32 : -0.32, style);
      }
      try {
        if (phraseIndex === 0) this.nodes.breath.triggerAttackRelease(0.07, time, 0.12);
      } catch (e) {}
    },
  };

  // 트랙을 최초 재생 시 한 번 정규화: 섹션이 없으면 통째로 한 섹션으로 감싼다
  function normalize(t) {
    if (t._norm) return t;
    if (!t.sections) t.sections = [{ lead: t.lead, arp: t.arp }];
    if (!t.arrangement || !t.arrangement.length) t.arrangement = t.sections.map((_, i) => i);
    t._norm = true;
    return t;
  }
  // 섹션의 특정 레이어 — 섹션에 없으면 트랙 기본값
  function layerOf(track, sec, name) {
    return (sec && sec[name] != null) ? sec[name] : track[name];
  }
  // 섹션 길이 = 그 섹션에서 실제로 쓰는 레이어들의 최대 길이(16의 배수로 올림)
  function sectionLen(track, sec) {
    let m = 16;
    ['lead', 'arp', 'bass', 'chords', 'drum'].forEach(nm => {
      const L = layerOf(track, sec, nm);
      if (L && L.length > m) m = L.length;
    });
    return Math.ceil(m / 16) * 16;
  }

  let ctx = null, master = null, comp = null, timer = null;
  let cur = null, nextTime = 0;
  let arrIdx = 0, secStep = 0, curSecLen = 16;   // 편곡 진행 상태
  let enabled = false, volume = 0.5, wanted = null;
  let unlockPromise = null;
  let recoveryPromise = null;

  const LOOKAHEAD = 0.14;
  const TICK_MS = 30;

  function ensureCtx() {
    if (ctx) return ctx;
    // Tone.js가 있으면 별도 AudioContext를 만들지 않는다. 모바일 브라우저는
    // 동시에 여러 컨텍스트를 정지시키는 경우가 있어 반주와 보컬이 하나를 공유한다.
    const toneCtx = root.Tone && (root.Tone.getContext ? root.Tone.getContext() : root.Tone.context);
    const toneRaw = toneCtx && (toneCtx.rawContext || toneCtx._context || toneCtx);
    if (toneRaw && typeof toneRaw.createGain === 'function') {
      ctx = toneRaw;
    } else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    master = ctx.createGain();
    master.gain.value = volume;
    // 화음·패드가 겹쳐도 클리핑되지 않게 가벼운 리미팅
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    master.connect(comp); comp.connect(ctx.destination);
    if (typeof ctx.addEventListener === 'function') {
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running' && cur && timer) nextTime = ctx.currentTime + 0.06;
      });
    }
    return ctx;
  }

  /* 악기 한 음 — ADSR + 파형/FM/가산합성/유니즌 */
  function voice(instName, f, at, dur, vol) {
    if (!f || !ctx) return;
    const ins = INSTR[instName] || INSTR.square;
    const g = ctx.createGain();
    if (ins.lp) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(ins.lp, at);
      g.connect(lp); lp.connect(master);
    } else {
      g.connect(master);
    }

    const hold = Math.max(dur, ins.a + ins.d + 0.01);
    const relEnd = at + hold + ins.r;
    const susV = Math.max(0.0004, vol * ins.s);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, vol), at + ins.a);
    g.gain.exponentialRampToValueAtTime(susV, at + ins.a + ins.d);
    g.gain.setValueAtTime(susV, at + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, relEnd);
    const stopAt = relEnd + 0.03;

    if (ins.type === 'organ') {
      [[1, 1], [2, 0.5], [3, 0.28], [4, 0.14]].forEach(([mult, amp]) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f * mult, at);
        const og = ctx.createGain(); og.gain.value = amp;
        o.connect(og); og.connect(g); o.start(at); o.stop(stopAt);
      });
    } else if (ins.fm) {
      const carrier = ctx.createOscillator(); carrier.type = 'sine';
      carrier.frequency.setValueAtTime(f, at);
      const mod = ctx.createOscillator(); mod.type = 'sine';
      mod.frequency.setValueAtTime(f * ins.fm.ratio, at);
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(f * ins.fm.amt, at);
      modGain.gain.exponentialRampToValueAtTime(0.001, at + ins.fm.decay);
      mod.connect(modGain); modGain.connect(carrier.frequency);
      carrier.connect(g);
      mod.start(at); mod.stop(stopAt); carrier.start(at); carrier.stop(stopAt);
    } else {
      const n = ins.voices || 1;
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator(); o.type = ins.type;
        o.frequency.setValueAtTime(f, at);
        if (n > 1) o.detune.setValueAtTime((i - (n - 1) / 2) * (ins.detune || 8), at);
        const og = ctx.createGain(); og.gain.value = 1 / n;
        o.connect(og); og.connect(g); o.start(at); o.stop(stopAt);
      }
    }
  }

  // 화음(패드) — 'C4+E4+G4' 를 동시에 울린다
  function chordVoice(instName, spec, at, dur, vol) {
    if (!spec || spec === '-') return;
    const notes = spec.split('+');
    notes.forEach(nm => voice(instName, freq(nm), at, dur, vol / Math.sqrt(notes.length)));
  }

  /* ------------------------------------------------ webaudio 보컬(음절 조음)
   * SAM 없이도 "가사를 부르는 느낌"이 나도록 자음+모음을 조음한다. 사람처럼
   * 또렷하진 않지만(순수 WebAudio의 한계) 음절이 하나씩 발음돼 노랫말처럼 들린다.
   *   · 삼각파 성대음 + 낮은 Q 포먼트(부드럽게, 깨짐 방지)
   *   · 포먼트가 시작 위치→목표 모음으로 미끄러지는 전이 = 음절 조음
   *   · 자음: 마찰음(S/F)·파열음(K/T/B/D)·비음 머머(M/N)·숨(H)·글라이드(W/Y/L/R) */
  const FEMALE_FORMANT = 1.14;   // 살짝만 여성쪽으로(과하면 얇고 날카로워짐)

  function nasalMurmur(f, at, dur, vol) {   // 비음(ㅁ·ㄴ) 머머 — 모음 앞에 살짝
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, at);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(450, at);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(Math.max(0.0006, vol), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(at); o.stop(at + dur + 0.02);
  }

  function singVowel(f, vowel, onset, at, dur, vol) {
    if (!f || !ctx) return;
    const F = VOWEL_FORMANTS[vowel] || VOWEL_FORMANTS.A;
    const c = String(onset || '').toUpperCase();

    // 엔벨로프 — 부드러운 선형 어택 + 여운(딸깍 방지)
    const out = ctx.createGain();
    const g = out.gain;
    const a = Math.min(0.06, dur * 0.3);
    const r = Math.min(0.24, dur * 0.5);
    const tail = r * 0.4;
    const peak = Math.max(0.0006, vol);
    g.setValueAtTime(0.0001, at);
    g.linearRampToValueAtTime(peak, at + a);
    g.setValueAtTime(peak, at + Math.max(a, dur - r));
    g.exponentialRampToValueAtTime(0.0001, at + dur + tail);
    out.connect(master);
    const stop = at + dur + tail + 0.05;

    // 고역을 부드럽게 굴려 깨짐 방지(자음 노이즈는 이 필터를 안 거친다)
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.setValueAtTime(2700, at); warm.Q.value = 0.5;
    warm.connect(out);

    // 성대 소스 — 삼각파(둥근 음), 시작 스쿱 + 느린 비브라토
    const src = ctx.createOscillator();
    src.type = 'triangle';
    src.frequency.setValueAtTime(f * 0.99, at);
    src.frequency.linearRampToValueAtTime(f, at + 0.05);
    const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.setValueAtTime(5.0, at);
    const vibAmt = ctx.createGain();
    vibAmt.gain.setValueAtTime(0.0001, at);
    vibAmt.gain.linearRampToValueAtTime(Math.max(0.3, f * 0.011), at + Math.min(0.25, dur * 0.6));
    vib.connect(vibAmt); vibAmt.connect(src.frequency);

    // 포먼트 전이 — 시작 위치(자음/글라이드에 따라 다름)에서 목표 모음으로 미끄러진다.
    // 이 움직임이 "입이 모양을 잡는" 조음감을 만들어 음절이 또렷해진다.
    const glide = /^(W|Y|L|R)$/.test(c);
    const sweepDur = Math.min(dur * 0.5, glide ? 0.1 : 0.06);
    // 포먼트는 2개만(F1·F2) — 노드 수를 줄여 오디오 과부하(끊김)를 막는다
    [[F.f1, 0.95], [F.f2, 0.55]].forEach(([fq, amp], i) => {
      const target = fq * FEMALE_FORMANT;
      let start = target * 0.78;
      if (c === 'W' && i === 1) start = target * 0.5;        // W: 입술 둥글게 → F2 낮게
      else if (c === 'Y' && i === 1) start = target * 1.5;   // Y: 혀 높게 → F2 높게
      else if (glide) start = target * 0.62;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 4.5;
      bp.frequency.setValueAtTime(Math.max(120, start), at);
      bp.frequency.linearRampToValueAtTime(target, at + sweepDur);
      const bg = ctx.createGain(); bg.gain.value = amp;
      src.connect(bp); bp.connect(bg); bg.connect(warm);
    });
    // 기본 톤으로 몸통을 준다
    const body = ctx.createGain(); body.gain.value = 0.4;
    src.connect(body); body.connect(warm);

    src.start(at); src.stop(stop);
    vib.start(at); vib.stop(stop);

    // 자음 조음 — 종류별로 다르게(알아듣기보단 '자음이 있다'는 인상)
    if (/^(S|SH|CH|Z)$/.test(c)) noise(at, 0.06, vol * 0.2, 'highpass', 5200);
    else if (c === 'F') noise(at, 0.05, vol * 0.15, 'highpass', 3600);
    else if (/^(K|T|P|Q)$/.test(c)) noise(at, 0.018, vol * 0.22, 'highpass', 2400);   // 무성 파열음
    else if (/^(B|D|G|J)$/.test(c)) noise(at, 0.016, vol * 0.16, 'highpass', 1500);   // 유성 파열음
    else if (c === 'H') noise(at, 0.05, vol * 0.12, 'highpass', 3000);
    else if (/^(M|N)$/.test(c)) nasalMurmur(f, at, Math.min(0.06, dur * 0.3), vol * 0.55);
  }

  // 현재 트랙(또는 캐릭터 보컬)의 이번 스텝 음절을 포먼트 보컬로 부른다.
  function singVocalStep(vocal, step, at, spb, arrIdxLocal, level) {
    if (!vocal) return;
    const local = step % 32;
    const banks = (vocal.sections && vocal.sections.length) ? vocal.sections : null;
    const score = banks ? (banks[arrIdxLocal % banks.length] || vocal.score || []) : (vocal.score || []);
    const idx = score.findIndex(p => p.step === local);
    if (idx < 0) return;
    const phrase = score[idx];
    const f = freq(phrase.note);
    if (!f) return;
    const dur = Math.max(0.12, phrase.beats * spb);
    const vg = Math.min(0.26, (vocal.gain || 0.18) * 1.15) * (level == null ? 1 : level);
    singVowel(f, phrase.vowel, phrase.onset, at, dur, vg);
    // 듀엣 하모니는 노드 수를 2배로 늘려 끊김을 유발하므로 뺐다(단성으로 부른다).
  }

  /* ------------------------------------------------------------------ 퍼커션 */
  function kick(at, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.09);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.17);
  }
  // 노이즈 버퍼는 한 번만 만들어 재사용한다(매번 새로 만들면 할당·GC로 오디오가 끊긴다).
  let _noiseBuf = null;
  function noiseBuffer() {
    if (_noiseBuf && _noiseBuf.sampleRate === ctx.sampleRate) return _noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    _noiseBuf = b; return b;
  }
  function noise(at, dur, vol, type, cutoff) {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.00001, vol), at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.00001, vol * 0.02), at + dur);   // 감쇠로 원래 페이드 대체
    src.connect(f); f.connect(g); g.connect(master);
    src.start(at, Math.random() * 0.4); src.stop(at + dur + 0.02);
  }
  function snare(at, vol) {
    noise(at, 0.09, vol, 'highpass', 1400);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, at);
    g.gain.setValueAtTime(vol * 0.7, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.1);
  }
  function clap(at, vol) {
    [0, 0.012, 0.024].forEach(off => noise(at + off, 0.04, vol * 0.8, 'bandpass', 1600));
  }
  function tom(at, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, at);
    o.frequency.exponentialRampToValueAtTime(90, at + 0.12);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.18);
  }
  function drumHit(sym, at, vol) {
    switch (sym) {
      case 'k': kick(at, vol * 2.4); break;
      case 's': snare(at, vol * 1.2); break;
      case 'h': noise(at, 0.025, vol * 0.5, 'highpass', 8000); break;
      case 'H': noise(at, 0.12, vol * 0.5, 'highpass', 7000); break;
      case 'c': noise(at, 0.4, vol * 1.6, 'highpass', 4000); break;
      case 't': tom(at, vol * 1.6); break;
      case 'p': clap(at, vol * 1.3); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------------ 스케줄러 */
  function layerNote(inst, pattern, i, at, dur, vol) {
    if (!pattern || !pattern.length) return;
    voice(inst, freq(pattern[i % pattern.length]), at, dur, vol);
  }

  // 보컬이 있는 트랙에선 반주를 뒤로 물린다(덕킹). 악기 리드는 보컬 멜로디와
  // 음역이 겹쳐 부딪히므로 거의 지우고, 딸깍대는 아르페지오·드럼도 줄인다.
  // 대신 베이스·패드(화음)를 살려 보컬을 받쳐 주는 반주로 만든다.
  const VOCAL_MIX = { lead: 0.22, arp: 0.42, bass: 1.05, chords: 1.15, drum: 0.5 };
  const FLAT_MIX  = { lead: 1, arp: 1, bass: 1, chords: 1, drum: 1 };

  function scheduler() {
    if (!cur || !ctx) return;
    // 백그라운드나 모바일 정책으로 잠긴 동안에는 예약만 멈춘다.
    // setInterval에서 resume()를 반복하면 복구 Promise가 폭증하므로 사용자 동작·pageshow에서만 재개한다.
    if (ctx.state !== 'running') return;
    const spb = 60 / cur.bpm / 4;           // 16분음표 한 칸(초)
    const swing = cur.swing || 0;
    const vocal = vocalFor(wanted);
    const mix = vocal ? VOCAL_MIX : FLAT_MIX;
    // 스케줄러가 크게 밀렸으면(탭 백그라운드·렌더링·느린 기기) 밀린 만큼 따라잡지 말고
    // 현재 시각으로 스냅한다. 안 그러면 while 루프가 수십 스텝을 한꺼번에 예약해
    // 노드가 폭증 → "드드드득" 끊김 → 컨텍스트 정지로 이어진다.
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.03;
    let guard = 0;
    while (nextTime < ctx.currentTime + LOOKAHEAD && guard++ < 32) {
      const sec = cur.sections[cur.arrangement[arrIdx % cur.arrangement.length]] || cur.sections[0];
      const i = secStep;
      const at = nextTime + ((i % 2) ? swing * spb : 0);   // 홀수 칸을 살짝 밀어 스윙감

      try {   // 한 음이 실패해도 재생 루프는 절대 멈추지 않게
        layerNote(cur.leadInst || 'square', layerOf(cur, sec, 'lead'), i, at, spb * 1.7, (cur.leadVol || 0.05) * mix.lead);
        layerNote(cur.bassInst || 'tri', layerOf(cur, sec, 'bass'), i, at, spb * 2.6, (cur.bassVol || 0.06) * mix.bass);
        const arp = layerOf(cur, sec, 'arp');
        if (arp) layerNote(cur.arpInst || 'pluck', arp, i, at, spb * 0.9,
          (cur.arpVol != null ? cur.arpVol : (cur.leadVol || 0.05) * 0.55) * mix.arp);
        const chords = layerOf(cur, sec, 'chords');
        if (chords) chordVoice(cur.chordInst || 'pad', chords[i % chords.length], at, spb * 7, (cur.chordVol || 0.03) * mix.chords);
        const drum = layerOf(cur, sec, 'drum');
        if (drum && drum.length && cur.drumVol) {
          const d = drum[i % drum.length];
          if (d && d !== '-') {
            const soft = vocal && (d === 'h' || d === 'H') ? 0.5 : 1;
            drumHit(d, at, cur.drumVol * mix.drum * soft * (0.9 + Math.random() * 0.18));
          }
        }
        advanced.schedule(wanted, cur, sec, i, at, spb, arrIdx);
        // 보컬은 둘 중 하나만 — SAM 고급 엔진이 켜졌으면 그쪽, 아니면 webaudio 포먼트 보컬
        if (!advanced.ready) singVocalStep(vocal, i, at, spb, arrIdx, 1);
      } catch (e) { /* noop — 다음 스텝 계속 */ }

      nextTime += spb;
      secStep++;
      if (secStep >= curSecLen) {          // 섹션 끝 → 다음 편곡 순서로
        secStep = 0;
        arrIdx = (arrIdx + 1) % cur.arrangement.length;
        const nextSec = cur.sections[cur.arrangement[arrIdx]] || cur.sections[0];
        curSecLen = sectionLen(cur, nextSec);
      }
    }
  }

  /* ------------------------------------------------------------------ 공개 API */
  const BGM = {
    tracks: Object.keys(TRACKS),
    characterVoices: Object.keys(CHARACTER_VOCALS),
    isEnabled() { return enabled; },
    current() { return wanted; },
    engine() {
      return advanced.ready ? 'sam+tone' : 'webaudio';
    },
    state() {
      return ctx ? ctx.state : 'uninitialized';
    },

    /* 삼성 인터넷·iOS Safari처럼 사용자 동작 안에서 resume 완료를 요구하는
     * 브라우저를 위한 명시적 잠금 해제. 클릭/터치 핸들러가 직접 await한다. */
    async unlock() {
      const audio = ensureCtx();
      if (!audio) return false;
      if (audio.state === 'running') {
        if (root.Tone && typeof root.Tone.start === 'function') {
          try { await root.Tone.start(); } catch (e) {}
        }
        return audio.state === 'running';
      }
      if (unlockPromise) return unlockPromise;
      try {
        // 두 호출을 await보다 먼저 실행해 사용자 활성화 토큰 안에서 resume를 요청한다.
        const toneStart = root.Tone && typeof root.Tone.start === 'function'
          ? root.Tone.start().catch(() => false) : Promise.resolve(true);
        const nativeResume = typeof audio.resume === 'function'
          ? audio.resume().catch(() => false) : Promise.resolve(true);
        unlockPromise = Promise.all([toneStart, nativeResume]).then(() => audio.state === 'running');
        return await unlockPromise;
      } finally {
        unlockPromise = null;
      }
    },

    setEnabled(on) {
      enabled = !!on;
      if (!enabled) this._halt();
      else if (wanted) this.play(wanted, true, advanced.voiceOverride);
      return enabled;
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
      advanced.setVolume(volume);
      return volume;
    },
    getVolume() { return volume; },

    play(name, force, vocalOverride) {
      name = ALIASES[name] || name;
      const t = TRACKS[name];
      if (!t) return false;
      advanced.voiceOverride = vocalOverride || null;
      wanted = name;
      if (!enabled) return false;
      if (!ensureCtx()) return false;
      if (ctx.state !== 'running') {
        // 잠금 해제 요청은 하나만 유지하고, 성공 시점의 최신 wanted 트랙을 시작한다.
        recoverPlayback();
        return true;
      }
      if (!force && cur === t && timer) {
        if (vocalFor(name)) {
          if (advanced.name !== name) advanced.start(name);
        } else if (advanced.name) {
          advanced.stop();
        }
        return true;
      }
      return this._start(name);
    },

    // 기존 반주 위에 캐릭터별 발음·포먼트·리듬 프리셋을 얹는다.
    // 예: QT_BGM.playCharacter('sera'), QT_BGM.playCharacter('narae', 'dreamy')
    playCharacter(characterName, baseTrack, force) {
      const vocal = CHARACTER_VOCALS[characterName];
      if (!vocal) return false;
      const name = ALIASES[baseTrack] || baseTrack || vocal.base;
      if (!TRACKS[name]) return false;
      return this.play(name, !!force, vocal);
    },

    clearCharacterVoice() {
      advanced.voiceOverride = null;
      if (wanted && vocalFor(wanted)) advanced.start(wanted);
      else if (advanced.name) advanced.stop();
      return true;
    },

    stop() {
      wanted = null;
      advanced.voiceOverride = null;
      this._halt();
    },

    _start(name) {
      const t = TRACKS[name];
      if (!t || !enabled || !ctx || ctx.state !== 'running') return false;
      this._halt();
      cur = normalize(t);
      arrIdx = 0; secStep = 0;
      curSecLen = sectionLen(cur, cur.sections[cur.arrangement[0]] || cur.sections[0]);
      nextTime = ctx.currentTime + 0.06;
      timer = setInterval(scheduler, TICK_MS);
      if (vocalFor(name)) advanced.start(name);
      return true;
    },

    _halt() {
      if (timer) { clearInterval(timer); timer = null; }
      advanced.stop();
      cur = null;
    },
  };

  function recoverPlayback() {
    if (!enabled || !wanted) return Promise.resolve(false);
    if (root.document && root.document.visibilityState === 'hidden') return Promise.resolve(false);
    if (recoveryPromise) return recoveryPromise;
    recoveryPromise = BGM.unlock().then(ok => {
      if (!ok || !enabled || !wanted || !ctx || ctx.state !== 'running') return false;
      // 타이머가 살아 있으면 편곡 진행 위치를 유지하고 예약 시각만 현재로 맞춘다.
      if (cur && timer) {
        nextTime = ctx.currentTime + 0.06;
        if (vocalFor(wanted)) {
          if (advanced.name !== wanted) advanced.start(wanted);
        } else if (advanced.name) {
          advanced.stop();
        }
        return true;
      }
      return BGM._start(wanted);
    }).catch(() => false).finally(() => {
      recoveryPromise = null;
    });
    return recoveryPromise;
  }

  // 백그라운드 탭에서 돌아왔거나 다음 사용자 동작이 들어왔을 때만 복구한다.
  // 삼성 인터넷처럼 사용자 활성화 토큰이 필요한 브라우저에서도 무음 상태로 굳지 않는다.
  if (root.document && typeof root.document.addEventListener === 'function') {
    const recover = () => {
      if (!enabled || !wanted || root.document.visibilityState === 'hidden') return;
      recoverPlayback();
    };
    root.document.addEventListener('visibilitychange', recover);
    root.document.addEventListener('pointerdown', recover);
    root.document.addEventListener('touchend', recover);
    root.document.addEventListener('keydown', recover);
    root.addEventListener('pageshow', recover);
  }

  root.QT_BGM = BGM;
})(window);
