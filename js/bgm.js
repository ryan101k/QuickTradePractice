/* =========================================================================
 *  QuickTrade Life — 배경음악 (칩튠 시퀀서 v2.0)
 *
 *  [추가된 점]
 *  - 하이햇(h) 드럼 사운드 추가
 *  - 풍성한 화음을 위한 톱니파(Sawtooth) 아르페지오(arp) 트랙 지원
 *  - 상한가(bull), 하한가(bear), 속보(news) 신규 트랙 추가
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

  /* 트랙 정의 — step 은 16분음표 한 칸.
   *   lead : 멜로디 (square)
   *   arp  : 화음/분산화음 보조 (sawtooth) - 90년대 특유의 빽빽한 사운드 담당
   *   bass : 베이스 (triangle)
   *   drum : 'k' 킥 · 's' 스네어 · 'h' 하이햇 · '-' 쉼 */
  const TRACKS = {
    // 1. 장중 (Market): 가볍게 굴러가는 8비트
    market: {
      bpm: 124, leadVol: 0.055, arpVol: 0.02, bassVol: 0.075, drumVol: 0.05,
      lead: [
        'E5','-','B4','-','C5','-','D5','-','E5','D5','C5','-','B4','-','-','-',
        'C5','-','E5','-','A5','-','G5','-','A5','-','G5','E5','-','-','-','-',
        'D5','-','B4','-','C5','-','D5','-','E5','-','C5','-','A4','-','-','-',
        'A4','-','C5','-','E5','-','D5','-','C5','B4','-','-','-','-','-','-',
      ],
      arp: ['A3','C4','E4','C4', 'G3','B3','D4','B3', 'F3','A3','C4','A3', 'E3','G3','B3','G3'], // 백그라운드에서 빠르게 돌아가는 화음
      bass: [
        'A2','-','-','-','E2','-','-','-','A2','-','-','-','G2','-','-','-',
        'F2','-','-','-','C3','-','-','-','G2','-','-','-','-','-','E2','-',
      ],
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-h-'.split(''), // 하이햇 추가로 찰진 리듬감
    },

    // 2. 상한가/떡상 (Bull Market): 빠르고 희망찬 아케이드 스타일
    bull: {
      bpm: 150, leadVol: 0.06, arpVol: 0.03, bassVol: 0.08, drumVol: 0.06,
      lead: [
        'C5','-','E5','-','G5','-','C6','-','G5','-','E5','-','G5','-','-','-',
        'D5','-','F5','-','A5','-','D6','-','A5','-','F5','-','A5','-','-','-',
        'E5','-','G5','-','B5','-','E6','-','B5','-','G5','-','B5','-','-','-',
        'F5','E5','F5','G5','A5','-','B5','-','C6','-','-','-','-','-','-','-',
      ],
      arp: ['C4','E4','G4','E4', 'D4','F4','A4','F4', 'E4','G4','B4','G4', 'F4','A4','C5','A4'],
      bass: ['C3','-','C3','C3', 'D3','-','D3','D3', 'E3','-','E3','E3', 'F3','-','G3','-'],
      drum: 'k-h-s-h-k-h-s-h-'.split(''),
    },

    // 3. 하한가/파산 (Bear Market): 느리고 우울한 단조
    bear: {
      bpm: 75, leadVol: 0.05, arpVol: 0.02, bassVol: 0.07, drumVol: 0.03,
      lead: [
        'E5','-','-','-','D#5','-','-','-','D5','-','-','-','C#5','-','-','-',
        'C5','-','-','-','B4','-','-','-','A#4','-','-','-','A4','-','-','-',
      ],
      arp: ['A3','C4','E4','-'],
      bass: [
        'A2','-','-','-','-','-','-','-','G#2','-','-','-','-','-','-','-',
        'G2','-','-','-','-','-','-','-','F#2','-','-','-','-','-','-','-',
      ],
      drum: 'k-------s-------'.split(''),
    },

    // 4. 긴급 뉴스 (News Flash): 타자기/티커 느낌의 긴박한 리듬
    news: {
      bpm: 135, leadVol: 0.05, arpVol: 0.03, bassVol: 0.07, drumVol: 0.05,
      lead: [
        'A5','A5','-','A5','-','-','A5','A5','-','A5','-','-','A5','-','-','-',
        'B5','B5','-','B5','-','-','B5','B5','-','B5','-','-','B5','-','-','-',
      ],
      arp: ['A3','-','A3','-','E3','-','E3','-'],
      bass: ['A2','-','A2','-','A2','-','A2','-'],
      drum: 'h-h-h-h-h-h-h-h-'.split(''), // 티커 머신처럼 하이햇만 연속으로
    },

    // 5. 장 마감·리포트 (Closed): 기존의 잔잔한 왈츠
    closed: {
      bpm: 84, leadVol: 0.05, arpVol: 0, bassVol: 0.06, drumVol: 0,
      lead: [
        'A4','-','-','-','C5','-','-','-','E5','-','-','-','D5','-','-','-',
        'C5','-','-','-','B4','-','-','-','A4','-','-','-','-','-','-','-',
        'G4','-','-','-','B4','-','-','-','D5','-','-','-','C5','-','-','-',
        'B4','-','-','-','A4','-','-','-','G4','-','-','-','-','-','-','-',
      ],
      bass: [
        'A2','-','-','-','-','-','-','-','F2','-','-','-','-','-','-','-',
        'C3','-','-','-','-','-','-','-','G2','-','-','-','-','-','-','-',
        'G2','-','-','-','-','-','-','-','E2','-','-','-','-','-','-','-',
        'F2','-','-','-','-','-','-','-','E2','-','-','-','-','-','-','-',
      ],
      drum: [],
    },

    // 6. 데이트 (Date): 톡톡 튀는 로맨틱 칩튠
    date: {
      bpm: 100, leadVol: 0.05, arpVol: 0.02, bassVol: 0.06, drumVol: 0.03,
      lead: [
        'C5','-','E5','-','G5','-','E5','-','F5','-','E5','-','D5','-','-','-',
        'D5','-','F5','-','A5','-','F5','-','G5','-','F5','-','E5','-','-','-',
      ],
      arp: ['C4','-','G4','-'],
      bass: [
        'C3','-','G2','-','C3','-','G2','-','F2','-','C3','-','G2','-','-','-',
        'D3','-','A2','-','D3','-','A2','-','G2','-','D3','-','G2','-','-','-',
      ],
      drum: 'k-h-s-h-k-h-s-h-'.split(''),
    },
  };

  let ctx = null, master = null, timer = null;
  let cur = null, step = 0, nextTime = 0;
  let enabled = false, volume = 0.5, wanted = null;

  const LOOKAHEAD = 0.12;
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

  function tone(type, f, at, dur, vol) {
    if (!f) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master);
    o.start(at); o.stop(at + dur + 0.02);
  }

  function noise(at, dur, vol, freqVal, type = 'lowpass') {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freqVal;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(at); src.stop(at + dur);
  }

  function scheduler() {
    if (!cur || !ctx) return;
    const spb = 60 / cur.bpm / 4; 
    
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const i = step; // 무한 반복을 위해 각 배열의 length로 나눈 나머지 사용
      
      // 메인 멜로디 (Square)
      if (cur.lead && cur.lead.length) {
        tone('square', freq(cur.lead[i % cur.lead.length]), nextTime, spb * 1.5, cur.leadVol || 0.05);
      }
      
      // 화음/아르페지오 (Sawtooth - 짧고 경쾌하게 끊어침)
      if (cur.arp && cur.arp.length) {
        tone('sawtooth', freq(cur.arp[i % cur.arp.length]), nextTime, spb * 0.8, cur.arpVol || 0.02);
      }
      
      // 베이스 (Triangle)
      if (cur.bass && cur.bass.length) {
        tone('triangle', freq(cur.bass[i % cur.bass.length]), nextTime, spb * 2.2, cur.bassVol || 0.06);
      }
      
      // 드럼 (Noise)
      if (cur.drum && cur.drum.length && cur.drumVol) {
        const d = cur.drum[i % cur.drum.length];
        if (d === 'k') noise(nextTime, 0.09, cur.drumVol * 2.5, 200, 'lowpass');     // 묵직한 킥
        else if (d === 's') noise(nextTime, 0.05, cur.drumVol * 1.5, 4000, 'lowpass'); // 타격감 있는 스네어
        else if (d === 'h') noise(nextTime, 0.02, cur.drumVol * 0.7, 8000, 'highpass'); // 촥촥 감기는 하이햇
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
      const t = TRACKS[name];
      if (!t) return false;
      if (!force && wanted === name && timer) return true;
      wanted = name;
      if (!enabled) return false;
      if (!ensureCtx()) return false;
      if (ctx.state === 'suspended') ctx.resume();
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