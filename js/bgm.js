/* =========================================================================
 *  QuickTrade Life — 배경음악 (칩튠 시퀀서)
 *
 *  외부 음원 파일 없이 WebAudio 오실레이터로 직접 연주한다.
 *  (98.css 레트로 톤과 맞고, 오프라인·모바일에서도 로딩이 없다)
 *
 *  브라우저 자동재생 정책 때문에 반드시 사용자 조작(클릭/터치) 이후에
 *  start() 가 호출되어야 소리가 난다 — app.js 의 armAudio() 참고.
 *
 *  사용법:
 *    BGM.setEnabled(true); BGM.setVolume(0.5);
 *    BGM.play('market');   // 장중
 *    BGM.play('closed');   // 마감/리포트
 *    BGM.play('date');     // 데이트
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

  /* 트랙 정의 — step 은 16분음표 한 칸.
   *   lead  : 멜로디 (square)
   *   bass  : 베이스 (triangle)
   *   drum  : 'k' 킥 · 's' 스네어/하이햇 · '-' 쉼 */
  const TRACKS = {
    // 장중: 가볍게 굴러가는 8비트 — 계속 들어도 지치지 않게 단순하게
    market: {
      bpm: 124, leadVol: 0.055, bassVol: 0.075, drumVol: 0.05,
      lead: [
        'E5','-','B4','-','C5','-','D5','-','E5','D5','C5','-','B4','-','-','-',
        'C5','-','E5','-','A5','-','G5','-','A5','-','G5','E5','-','-','-','-',
        'D5','-','B4','-','C5','-','D5','-','E5','-','C5','-','A4','-','-','-',
        'A4','-','C5','-','E5','-','D5','-','C5','B4','-','-','-','-','-','-',
      ],
      bass: [
        'A2','-','A2','-','E2','-','E2','-','A2','-','A2','-','G2','-','G2','-',
        'F2','-','F2','-','C3','-','C3','-','G2','-','G2','-','G2','-','-','-',
        'A2','-','A2','-','E2','-','E2','-','A2','-','A2','-','G2','-','G2','-',
        'F2','-','F2','-','C3','-','C3','-','E2','-','E2','-','-','-','-','-',
      ],
      drum: 'k-s-k--sk-s-k-s-k-s-k--sk-s-k-s-k-s-k--sk-s-k-s-k-s-k--sk-s-kss'.split(''),
    },
    // 장 마감·리포트: 하루를 정리하는 잔잔한 왈츠풍
    closed: {
      bpm: 84, leadVol: 0.05, bassVol: 0.06, drumVol: 0,
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
    // 데이트: 살짝 들뜬 로맨틱 칩튠
    date: {
      bpm: 100, leadVol: 0.05, bassVol: 0.06, drumVol: 0.03,
      lead: [
        'C5','-','E5','-','G5','-','E5','-','F5','-','E5','-','D5','-','-','-',
        'D5','-','F5','-','A5','-','F5','-','G5','-','F5','-','E5','-','-','-',
        'E5','-','G5','-','C6','-','B5','-','A5','-','G5','-','F5','-','-','-',
        'D5','-','E5','-','F5','-','E5','-','C5','-','-','-','-','-','-','-',
      ],
      bass: [
        'C3','-','G2','-','C3','-','G2','-','F2','-','C3','-','G2','-','-','-',
        'D3','-','A2','-','D3','-','A2','-','G2','-','D3','-','G2','-','-','-',
        'C3','-','G2','-','C3','-','E3','-','F2','-','C3','-','F2','-','-','-',
        'G2','-','D3','-','G2','-','B2','-','C3','-','-','-','-','-','-','-',
      ],
      drum: '--s---s---s---s---s---s---s---s---s---s---s---s---s---s---s---s-'.split(''),
    },
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

  // 한 음 — 짧은 어택/릴리스를 줘야 '틱' 소리가 안 난다
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

  // 드럼은 짧은 노이즈 버스트로 흉내
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

  function scheduler() {
    if (!cur || !ctx) return;
    const spb = 60 / cur.bpm / 4;            // 16분음표 1칸 길이(초)
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const n = cur.lead.length;
      const i = step % n;
      tone('square', freq(cur.lead[i]), nextTime, spb * 1.7, cur.leadVol || 0.05);
      if (cur.bass && cur.bass.length) {
        tone('triangle', freq(cur.bass[i % cur.bass.length]), nextTime, spb * 2.4, cur.bassVol || 0.06);
      }
      if (cur.drum && cur.drum.length && cur.drumVol) {
        const d = cur.drum[i % cur.drum.length];
        if (d === 'k') noise(nextTime, 0.09, cur.drumVol * 2.2, 220);
        else if (d === 's') noise(nextTime, 0.05, cur.drumVol, 6000);
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

    /* 트랙 재생. 같은 트랙이면 다시 시작하지 않는다(장면 전환 때 뚝 끊기지 않게). */
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
