/* =========================================================================
 *  QuickTrade Life — 캐릭터 음성(TTS)
 *
 *  Web Speech API 로 대사를 소리내어 읽는다. 한국어 음성이 보통 1~2개뿐이라
 *  목소리 자체를 바꾸긴 어렵지만, 인물마다 pitch(음높이)·rate(속도)를 다르게 주면
 *  "다른 사람이 말하는" 느낌이 난다.
 *    · 성별   : 남성 낮게 / 여성 높게
 *    · 성격   : 무심=낮고 느리게, 텐션(자유)=빠르게, 집착=높고 조금 빠르게 …
 *    · 특수인물: 재벌가=차분히 낮게, 집착형=높게
 *    · 이름   : 이름 해시로 ±지터 → 같은 성별·성격도 미묘하게 다르게
 *
 *  QT_VOICE.speakAs(person, text)  — 인물 목소리로 읽기
 *  QT_VOICE.speak(text, opts)      — 저수준(시스템 안내 등)
 *  QT_VOICE.setEnabledGetter(fn)   — on/off 를 앱 상태(S.ttsOn)에 연결
 * ========================================================================= */
(function (root) {
  'use strict';

  const HAS_TTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let voices = [], koVoices = [];
  let enabledGetter = () => false;

  function refresh() {
    if (!HAS_TTS) return;
    voices = window.speechSynthesis.getVoices() || [];
    koVoices = voices.filter(v => /ko(-|_|$)|korean/i.test(v.lang) || /korean|한국/i.test(v.name));
  }
  if (HAS_TTS) {
    refresh();
    // 음성 목록은 비동기로 채워지는 경우가 많다
    window.speechSynthesis.onvoiceschanged = refresh;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(s) { let h = 0; s = s || ''; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  // 성격별 음색 보정 (pitch, rate 가감)
  const PERS = {
    cold:      { p: -0.18, r: -0.08 },
    caring:    { p: +0.06, r: -0.02 },
    homebody:  { p: +0.02, r: -0.06 },
    ambitious: { p:  0.00, r: +0.10 },
    free:      { p: +0.05, r: +0.14 },
    lavish:    { p: +0.03, r: +0.06 },
    frugal:    { p:  0.00, r:  0.00 },
    obsessive: { p: +0.12, r: +0.04 },
  };
  // 특수 인물 보정
  const SPEC = {
    police:    { p: -0.04, r:  0.00 },
    heiress:   { p: -0.09, r: -0.08 },
    obsessive: { p: +0.14, r: +0.06 },
  };

  // 인물 → 음성 프로필 {pitch, rate, voice}
  function profileFor(person) {
    person = person || {};
    const g = person.gender;
    let pitch = g === 'm' ? 0.82 : g === 'f' ? 1.28 : 1.05;
    let rate = 1.0;
    const pm = PERS[person.personality]; if (pm) { pitch += pm.p; rate += pm.r; }
    const sm = SPEC[person.special];     if (sm) { pitch += sm.p; rate += sm.r; }
    // 이름별 고유 지터 — 같은 조건도 조금씩 다르게
    const h = hash(person.name || person.id);
    pitch += ((h % 25) - 12) / 100;          // ±0.12
    rate  += (((h >> 5) % 17) - 8) / 100;    // ±0.08
    pitch = clamp(pitch, 0.5, 1.9);
    rate  = clamp(rate, 0.7, 1.45);
    // 한국어 음성이 여러 개면 이름 해시로 배정(더 다양하게)
    const voice = koVoices.length ? koVoices[h % koVoices.length] : (voices[0] || null);
    return { pitch, rate, voice };
  }

  // 읽기 전에 따옴표·괄호·이모지·화자표시(이름:) 정리
  function strip(text) {
    return String(text || '')
      .replace(/[\u{1F000}-\u{1FAFF}☀-➿←-⇿️]/gu, '')     // 이모지 먼저 제거
      .replace(/^[^:：]{1,8}[:：]\s*/, '')                 // "서연: " 같은 화자 표시 제거
      .replace(/\s*\([^)]*\)\s*$/, '')                    // 끝의 (…반응) 제거
      .replace(/[“”"'『』「」()（）]/g, '')                  // 남은 따옴표·괄호 문자 제거
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speak(text, opts) {
    if (!enabledGetter() || !HAS_TTS) return false;
    const clean = strip(text);
    if (!clean) return false;
    try {
      opts = opts || {};
      if (opts.interrupt) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'ko-KR';
      if (opts.voice) u.voice = opts.voice;
      u.pitch = opts.pitch != null ? clamp(opts.pitch, 0, 2) : 1;
      u.rate = opts.rate != null ? clamp(opts.rate, 0.1, 10) : 1;
      u.volume = opts.volume != null ? opts.volume : 1;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  // 인물 목소리로 읽기 (기본적으로 이전 발화를 끊고 새로 말한다)
  function speakAs(person, text, opts) {
    return speak(text, Object.assign({ interrupt: true }, profileFor(person), opts));
  }

  function cancel() { try { if (HAS_TTS) window.speechSynthesis.cancel(); } catch (e) {} }
  function setEnabledGetter(fn) { if (typeof fn === 'function') enabledGetter = fn; }
  function isSupported() { return HAS_TTS; }
  function available() { return { supported: HAS_TTS, total: voices.length, ko: koVoices.length, koNames: koVoices.map(v => v.name) }; }

  root.QT_VOICE = { profileFor, speak, speakAs, cancel, refresh, setEnabledGetter, isSupported, available, strip };
})(window);
