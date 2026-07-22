/* =========================================================================
 *  QuickTrade Life — 배경음악 (다중 악기 · 다중 섹션 칩튠 신스)
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
 *  공개 API (변경 없음):
 *    BGM.setEnabled(bool) / setVolume(0~1) / getVolume() / isEnabled()
 *    BGM.play(name[, force]) / stop() / current() / tracks
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

  const LOOKAHEAD = 0.14;
  const TICK_MS = 30;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    // 화음·패드가 겹쳐도 클리핑되지 않게 가벼운 리미팅
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    master.connect(comp); comp.connect(ctx.destination);
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
  function noise(at, dur, vol, type, cutoff) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start(at); src.stop(at + dur);
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

  function scheduler() {
    if (!cur || !ctx) return;
    const spb = 60 / cur.bpm / 4;           // 16분음표 한 칸(초)
    const swing = cur.swing || 0;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const sec = cur.sections[cur.arrangement[arrIdx % cur.arrangement.length]] || cur.sections[0];
      const i = secStep;
      const at = nextTime + ((i % 2) ? swing * spb : 0);   // 홀수 칸을 살짝 밀어 스윙감

      layerNote(cur.leadInst || 'square', layerOf(cur, sec, 'lead'), i, at, spb * 1.7, cur.leadVol || 0.05);
      layerNote(cur.bassInst || 'tri', layerOf(cur, sec, 'bass'), i, at, spb * 2.6, cur.bassVol || 0.06);
      const arp = layerOf(cur, sec, 'arp');
      if (arp) layerNote(cur.arpInst || 'pluck', arp, i, at, spb * 0.9,
        cur.arpVol != null ? cur.arpVol : (cur.leadVol || 0.05) * 0.55);
      const chords = layerOf(cur, sec, 'chords');
      if (chords) chordVoice(cur.chordInst || 'pad', chords[i % chords.length], at, spb * 7, cur.chordVol || 0.03);
      const drum = layerOf(cur, sec, 'drum');
      if (drum && drum.length && cur.drumVol) {
        const d = drum[i % drum.length];
        if (d && d !== '-') drumHit(d, at, cur.drumVol * (0.9 + Math.random() * 0.18));  // 살짝 강약 흔들기
      }

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
    isEnabled() { return enabled; },
    current() { return wanted; },

    setEnabled(on) {
      enabled = !!on;
      if (!enabled) this._halt();
      else if (wanted) this.play(wanted, true);
      return enabled;
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
      return volume;
    },
    getVolume() { return volume; },

    play(name, force) {
      name = ALIASES[name] || name;
      const t = TRACKS[name];
      if (!t) return false;
      wanted = name;
      if (!enabled) return false;
      if (!ensureCtx()) return false;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!force && cur === t && timer) return true;
      this._halt();
      cur = normalize(t);
      arrIdx = 0; secStep = 0;
      curSecLen = sectionLen(cur, cur.sections[cur.arrangement[0]] || cur.sections[0]);
      nextTime = ctx.currentTime + 0.06;
      timer = setInterval(scheduler, TICK_MS);
      return true;
    },

    stop() { wanted = null; this._halt(); },

    _halt() {
      if (timer) { clearInterval(timer); timer = null; }
      cur = null;
    },
  };

  root.QT_BGM = BGM;
})(window);
