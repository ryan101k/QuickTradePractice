/* =========================================================================
 *  QuickTrade Life — 배경음악 (칩튠 시퀀서 완성본)
 *
 *  외부 음원 파일 없이 WebAudio 오실레이터로 직접 연주합니다.
 *  (98.css 레트로 톤, 90년대 타이쿤 게임 감성 완벽 재현)
 *
 *  사용법:
 *    BGM.setEnabled(true); BGM.setVolume(0.5);
 *    BGM.play('title');         // 타이틀
 *    BGM.play('market_normal'); // 평온한 장
 *    BGM.play('market_bull');   // 떡상장
 *    BGM.play('market_bear');   // 떡락장
 *    BGM.play('news');          // 뉴스/찌라시
 *    BGM.play('bankrupt');      // 파산/상장폐지
 *    BGM.play('jackpot');       // 상한가/대박
 *    BGM.play('dreamy');        // 엔딩/튜토리얼
 *    BGM.stop();
 * ========================================================================= */
(function (root) {
  'use strict';

  const NOTE_RE = /^([A-G])(#?)(-?\d)$/;
  const BASE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };   // A4 기준 반음
  const freqCache = {};

  function freq(note) {
    if (!note || note === '-') return 0;
    if (freqCache[note] != null) return freqCache[note];
    const m = NOTE_RE.exec(note);
    if (!m) return (freqCache[note] = 0);
    const semi = BASE[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) - 4) * 12;
    return (freqCache[note] = 440 * Math.pow(2, semi / 12));
  }

  /* 트랙 정의 
   *  leadInst / bassInst / arpInst : 파형 지정 (square, triangle, sawtooth, sine)
   *  drum : 'k' 킥, 's' 스네어, 'h' 하이햇, 'c' 심벌, 't' 탐탐, '-' 쉼표
   */
  const TRACKS = {
    // 1. 타이틀 / 메인화면: 기대감을 주는 활기찬 90년대 타이쿤 오프닝
    title: {
      bpm: 130, leadVol: 0.06, bassVol: 0.07, drumVol: 0.04,
      lead: [
        'C5','-','E5','-','G5','-','C6','-','G5','-','E5','-','C5','-','-','-',
        'D5','-','F5','-','A5','-','D6','-','A5','-','F5','-','D5','-','-','-',
        'E5','-','G5','-','B5','-','E6','-','D6','-','C6','-','B5','-','A5','-',
        'G5','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-'
      ],
      arp: [
        'C4','E4','G4','E4','C4','E4','G4','E4','D4','F4','A4','F4','D4','F4','A4','F4',
        'E4','G4','B4','G4','E4','G4','B4','G4','C4','E4','G4','E4','C4','E4','G4','E4'
      ],
      bass: [
        'C3','-','-','-','G2','-','-','-','D3','-','-','-','A2','-','-','-',
        'E3','-','-','-','B2','-','-','-','C3','-','-','-','G2','-','-','-'
      ],
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-h-k-k-s-s'.split(''),
    },

    // 2. 평온한 장 (기존 market 개선 버전)
    market_normal: {
      bpm: 120, leadVol: 0.05, bassVol: 0.06, drumVol: 0.03,
      lead: [
        'E5','-','C5','-','G4','-','C5','-','D5','-','B4','-','G4','-','B4','-',
        'C5','-','A4','-','E4','-','A4','-','G4','-','E4','-','-','-','-','-'
      ],
      bass: [
        'C3','-','-','-','E3','-','-','-','G2','-','-','-','B2','-','-','-',
        'A2','-','-','-','C3','-','-','-','E2','-','-','-','G2','-','-','-'
      ],
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-h'.split(''),
    },

    // 3. 떡상 (상승장): 템포가 빠르고 쉴 새 없이 몰아치는 기분 좋은 비트
    market_bull: {
      bpm: 155, leadVol: 0.06, bassVol: 0.08, drumVol: 0.05,
      lead: [
        'C5','E5','G5','C6','G5','E5','C5','E5','D5','F5','A5','D6','A5','F5','D5','F5',
        'E5','G5','B5','E6','B5','G5','E5','G5','F5','A5','C6','F6','C6','A5','F5','A5'
      ],
      bass: [
        'C3','-','C3','-','C3','-','C3','-','D3','-','D3','-','D3','-','D3','-',
        'E3','-','E3','-','E3','-','E3','-','F3','-','F3','-','F3','-','F3','-'
      ],
      drum: 'k-h-k-h-s-h-k-h-k-h-k-h-s-h-k-h'.split(''),
    },

    // 4. 떡락 (하락장): 느리고 암울한 마이너 스케일
    market_bear: {
      bpm: 90, leadVol: 0.05, bassVol: 0.07, drumVol: 0.04,
      lead: [
        'A4','-','-','-','G#4','-','-','-','G4','-','-','-','F#4','-','-','-',
        'F4','-','-','-','E4','-','-','-','D#4','-','-','-','E4','-','-','-'
      ],
      arp: [
        'A3','C4','E4','C4','G#3','C4','D#4','C4','G3','A#3','D4','A#3','F#3','A3','C4','A3',
        'F3','G#3','C4','G#3','E3','G3','B3','G3','D#3','F#3','A3','F#3','E3','G#3','B3','G#3'
      ],
      bass: [
        'A2','-','-','-','-','-','-','-','G2','-','-','-','-','-','-','-',
        'F2','-','-','-','-','-','-','-','E2','-','-','-','-','-','-','-'
      ],
      drum: 'k---h---s---h---k-k-h---s---h---'.split(''),
    },

    // 5. 뉴스/찌라시 모드: 심시티나 테마병원 느낌의 통통 튀는 BGM
    news: {
      bpm: 110, leadVol: 0.05, bassVol: 0.06, drumVol: 0.03,
      lead: [
        'C5','-','G4','-','-','-','C5','-','A4','-','F4','-','-','-','A4','-',
        'G4','-','E4','-','-','-','G4','-','F4','D4','B3','G3','-','-','-','-'
      ],
      bass: [
        'C3','-','-','-','G2','-','-','-','F2','-','-','-','C3','-','-','-',
        'C3','-','-','-','G2','-','-','-','G2','-','-','-','G2','-','-','-'
      ],
      drum: 'k---s---k-k-s---'.split(''),
    },

    // 6. 파산 / 상장폐지 (단발성 이펙트에 가까움, 멈추지 않고 루프됨)
    bankrupt: {
      bpm: 70, leadVol: 0.06, bassVol: 0.08, drumVol: 0,
      lead: [
        'C5','-','B4','-','Bb4','-','A4','-','Ab4','-','G4','-','Gb4','-','F4','-',
        'E4','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-'
      ],
      bass: [
        'C3','-','G2','-','Gb2','-','F2','-','E2','-','Eb2','-','D2','-','Db2','-',
        'C2','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-'
      ],
      drum: [],
    },

    // 7. 대박 (상한가 달성): 날카로운 Sawtooth 파형과 심벌(c)을 활용한 락(Rock) 스타일
    jackpot: {
      bpm: 160,
      leadInst: 'sawtooth',
      bassInst: 'square',
      arpInst: 'triangle',
      leadVol: 0.06, bassVol: 0.08, drumVol: 0.06,
      lead: [
        'C5','C5','D5','D5','E5','E5','G5','G5','C6','-','G5','-','E5','-','C5','-',
        'A4','A4','C5','C5','E5','E5','A5','A5','C6','-','A5','-','E5','-','C5','-'
      ],
      arp: [
        'G4','C5','E5','C5','G4','C5','E5','C5','A4','C5','E5','C5','A4','C5','E5','C5',
        'F4','A4','C5','A4','F4','A4','C5','A4','G4','B4','D5','B4','G4','B4','D5','B4'
      ],
      bass: [
        'C3','-','-','-','C3','-','C3','-','A2','-','-','-','A2','-','A2','-',
        'F2','-','-','-','F2','-','F2','-','G2','-','-','-','G2','-','G2','-'
      ],
      drum: 'c-h-s-h-k-k-s-h-c-h-s-h-k-t-t-t'.split(''),
    },

    // 8. 튜토리얼 / 엔딩: 부드러운 Sine 파형을 활용한 몽환적이고 감동적인 무드
    dreamy: {
      bpm: 90,
      leadInst: 'sine',
      bassInst: 'triangle',
      arpInst: 'sine',
      leadVol: 0.08, bassVol: 0.06, drumVol: 0.02,
      lead: [
        'C5','-','-','-','G5','-','-','-','F5','-','E5','-','D5','-','-','-',
        'E5','-','-','-','C5','-','-','-','A4','-','B4','-','C5','-','D5','-'
      ],
      arp: [
        'C4','G4','C5','G4','E4','G4','C5','G4','F4','A4','C5','A4','F4','A4','C5','A4',
        'C4','G4','C5','G4','E4','G4','C5','G4','G3','D4','G4','D4','G3','D4','G4','D4'
      ],
      bass: [
        'C3','-','-','-','-','-','-','-','F2','-','-','-','-','-','-','-',
        'C3','-','-','-','-','-','-','-','G2','-','-','-','-','-','-','-'
      ],
      drum: 'k---h---s---h---'.split(''),
    }
  };

  // 예전 앱 코드가 사용하던 장면 이름도 계속 받아 준다.
  // 실제 선곡은 앱에서 더 세분화하되, 저장 데이터/다른 화면의 호출이 남아 있어도
  // 음악이 통째로 꺼지는 일이 없도록 하는 안전망이다.
  const ALIASES = {
    market: 'market_normal',
    closed: 'news',
    date: 'dreamy'
  };

  let ctx = null, master = null, timer = null;
  let cur = null, step = 0, nextTime = 0;
  let enabled = false, volume = 0.5, wanted = null;

  const LOOKAHEAD = 0.12;   // 이 시간만큼 미리 스케줄
  const TICK_MS = 30;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    return ctx;
  }

  // 한 음 — 끊어치기(isStaccato) 옵션 지원
  function tone(type, f, at, dur, vol, isStaccato) {
    if (!f) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    
    // 스타카토면 음 길이를 짧게 깎아서 통통 튀게 만듦
    const releaseTime = isStaccato ? at + (dur * 0.4) : at + dur;
    g.gain.exponentialRampToValueAtTime(0.0001, releaseTime);
    
    o.connect(g); g.connect(master);
    o.start(at); o.stop(releaseTime + 0.02);
  }

  // 드럼/퍼커션 노이즈 버스트
  function noise(at, dur, vol, lowpass) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(at); src.stop(at + dur);
  }

  // 오디오 스케줄러 - 악기(파형) 커스텀 및 다채로운 드럼 지원
  function scheduler() {
    if (!cur || !ctx) return;
    const spb = 60 / cur.bpm / 4;            // 16분음표 1칸 길이(초)
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const n = cur.lead.length;
      const i = step % n;

      // 메인 멜로디 (리드)
      tone(cur.leadInst || 'square', freq(cur.lead[i]), nextTime, spb * 1.7, cur.leadVol || 0.05, false);
      
      // 베이스
      if (cur.bass && cur.bass.length) {
        tone(cur.bassInst || 'triangle', freq(cur.bass[i % cur.bass.length]), nextTime, spb * 2.4, cur.bassVol || 0.06, false);
      }
      
      // 아르페지오 / 서브 화음 (무조건 스타카토 적용)
      if (cur.arp && cur.arp.length) {
        tone(cur.arpInst || 'square', freq(cur.arp[i % cur.arp.length]), nextTime, spb * 0.8, (cur.leadVol || 0.05) * 0.6, true);
      }

      // 확장된 드럼 세트
      if (cur.drum && cur.drum.length && cur.drumVol) {
        const d = cur.drum[i % cur.drum.length];
        if (d === 'k') noise(nextTime, 0.09, cur.drumVol * 2.2, 220);         // 킥
        else if (d === 's') noise(nextTime, 0.05, cur.drumVol, 6000);         // 스네어
        else if (d === 'h') noise(nextTime, 0.02, cur.drumVol * 0.5, 8000);   // 하이햇
        else if (d === 'c') noise(nextTime, 0.35, cur.drumVol * 2.0, 3000);   // 크래쉬 심벌
        else if (d === 't') tone('triangle', 130, nextTime, 0.1, cur.drumVol * 2, true); // 탐탐
      }
      nextTime += spb;
      step++;
    }
  }

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
      // 같은 곡을 요청해도 사용자 조작 직후에는 suspended 컨텍스트를 먼저 깨운다.
      // 이전에는 여기보다 조기 반환이 앞에 있으면 표시만 ON이고 무음일 수 있었다.
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!force && cur === t && timer) return true;
      this._halt(true);
      cur = t; step = 0; nextTime = ctx.currentTime + 0.06;
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
