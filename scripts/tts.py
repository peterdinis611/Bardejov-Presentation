# -*- coding: utf-8 -*-
"""Speak Bardejov dusk-walk copy.

Default engine is macOS `say` (Laura / Zuzana / Daniel / Zosia / …).
Optional neural voices:  pip install edge-tts

  python3 scripts/tts.py
  python3 scripts/tts.py --lang sk --what tour
  python3 scripts/tts.py --section gate
  python3 scripts/tts.py --text "Vstúpite do Bardejova."
  python3 scripts/tts.py --list
  python3 scripts/tts.py --engine edge --out public/audio/sk-top.mp3 --section top
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANG_JS = ROOT / "src" / "lang.js"

LANGS = ("sk", "cs", "en", "pl", "hu", "uk")
VOICE_KEYS = ("top", "gate", "pathways", "lessons", "suburb", "walk", "eternity")

SAY_PREF = {
    "sk": ["laura", "zuzana"],
    "cs": ["iveta", "zuzana"],
    "en": ["daniel", "serena", "martha", "samantha"],
    "pl": ["zosia"],
    "hu": ["tünde", "tunde", "mariska"],
    "uk": ["lesya", "lesja"],
}
SAY_LOCALE = {
    "sk": "sk_",
    "cs": "cs_",
    "en": "en_gb",
    "pl": "pl_",
    "hu": "hu_",
    "uk": "uk_",
}
EDGE_VOICE = {
    "sk": "sk-SK-ViktoriaNeural",
    "cs": "cs-CZ-VlastaNeural",
    "en": "en-GB-SoniaNeural",
    "pl": "pl-PL-ZofiaNeural",
    "hu": "hu-HU-NoemiNeural",
    "uk": "uk-UA-PolinaNeural",
}
SKIP_SAY = re.compile(
    r"zarvox|whisper|bells|cellos|boing|bad news|good news|deranged|"
    r"trinoids|organ|wobble|jester|princess|junior|albert|bahh|bubbles|"
    r"superstar|kathy|fred",
    re.I,
)


def prepare_speech(text: str) -> str:
    line = str(text or "")
    line = re.sub(r"UNESCO|ЮНЕСКО", "Unesco", line)
    line = re.sub(r"[·•]", ", ", line)
    line = re.sub(r"[—–]", ", ", line)
    return re.sub(r"\s+", " ", line).strip()


def load_i18n() -> dict:
    if not LANG_JS.exists():
        sys.exit("missing src/lang.js — run: npm run i18n")
    raw = LANG_JS.read_text(encoding="utf-8")
    marker = "export const I18N = "
    start = raw.find(marker)
    if start < 0:
        sys.exit("could not parse src/lang.js")
    payload = raw[start + len(marker) :].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def mac_voices() -> list[tuple[str, str]]:
    if not shutil.which("say"):
        return []
    out = subprocess.check_output(["say", "-v", "?"], text=True, errors="replace")
    rows = []
    for line in out.splitlines():
        m = re.match(r"^(\S+(?:\s+\S+)*?)\s+([a-z]{2}[_-][A-Za-z0-9]+)\s+#", line)
        if not m:
            continue
        name, loc = m.group(1).strip(), m.group(2).replace("-", "_").lower()
        if SKIP_SAY.search(name):
            continue
        rows.append((name, loc))
    return rows


def pick_say_voice(lang: str, override: str | None) -> str | None:
    if override:
        return override
    pref = SAY_PREF.get(lang, [])
    loc = SAY_LOCALE.get(lang, f"{lang}_")
    voices = mac_voices()
    scored: list[tuple[int, str]] = []
    for name, code in voices:
        s = -1
        if code.startswith(loc) or code == loc.rstrip("_"):
            s = 90
        elif lang == "en" and code.startswith("en_"):
            s = 40
        else:
            continue
        low = name.lower()
        if any(p in low for p in pref):
            s += 36
        scored.append((s, name))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1]


def speak_say(text: str, voice: str | None, rate: int, out: Path | None) -> None:
    cmd = ["say", "-r", str(rate)]
    if voice:
        cmd += ["-v", voice]
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        cmd += ["-o", str(out)]
        if out.suffix.lower() in {".wav", ".wave"}:
            cmd += ["--data-format=LEF32@22050"]
    cmd.append(text)
    subprocess.run(cmd, check=True)


async def speak_edge(text: str, voice: str, rate: str, out: Path | None) -> None:
    try:
        import edge_tts
    except ImportError:
        sys.exit("edge-tts is not installed. Run:  pip3 install edge-tts")
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        await communicate.save(str(out))
        return
    player = shutil.which("afplay") or shutil.which("ffplay")
    if not player:
        sys.exit("edge-tts needs --out FILE, or afplay/ffplay on PATH to play")
    tmp = Path("/tmp/bardejov-tts.mp3")
    await communicate.save(str(tmp))
    subprocess.run([player, str(tmp)], check=True)


def lines_for(pack: dict, what: str, section: str | None) -> list[str]:
    rows: list[str] = []
    if what in {"voice", "all"}:
        voice = pack.get("voice") or {}
        keys = [section] if section else list(VOICE_KEYS)
        for key in keys:
            if key not in voice:
                sys.exit(f"unknown section {key!r}. try: {', '.join(VOICE_KEYS)}")
            rows.append(voice[key])
    if what in {"tour", "all"}:
        if section and what == "tour":
            sys.exit("--section is for voice chapters, not tour")
        for step in pack.get("tour") or []:
            title = (step.get("title") or "").strip()
            k = (step.get("k") or "").strip()
            rows.append(f"{title}. {k}".strip() if k else title)
    return [prepare_speech(x) for x in rows if prepare_speech(x)]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Text-to-speech for Bardejov dusk-walk copy.")
    p.add_argument("--lang", choices=LANGS, default="sk")
    p.add_argument("--what", choices=("voice", "tour", "all"), default="voice")
    p.add_argument("--section", choices=VOICE_KEYS, help="one voice chapter (default: all chapters)")
    p.add_argument("--text", help="speak this string instead of i18n copy")
    p.add_argument("--engine", choices=("say", "edge", "auto"), default="auto")
    p.add_argument("--voice", help="override voice name (say) or Edge short name")
    p.add_argument("--rate", type=int, default=165, help="say words-per-minute (default 165)")
    p.add_argument("--out", type=Path, help="write audio instead of playing")
    p.add_argument("--list", action="store_true", help="list macOS voices and exit")
    return p.parse_args()


def resolve_engine(name: str) -> str:
    if name != "auto":
        return name
    if shutil.which("say"):
        return "say"
    return "edge"


def main() -> None:
    args = parse_args()
    if args.list:
        voices = mac_voices()
        if not voices:
            sys.exit("macOS say is not available")
        for name, loc in voices:
            mark = ""
            for lid, prefix in SAY_LOCALE.items():
                if loc.startswith(prefix) or (lid == "en" and loc.startswith("en_")):
                    mark = f"  [{lid}]"
                    break
            print(f"{name:20} {loc}{mark}")
        return

    engine = resolve_engine(args.engine)
    if args.text:
        chunks = [prepare_speech(args.text)]
    else:
        packs = load_i18n()
        pack = packs.get(args.lang)
        if not pack:
            sys.exit(f"no i18n pack for {args.lang}")
        chunks = lines_for(pack, args.what, args.section)
    if not chunks:
        sys.exit("nothing to speak")

    if engine == "say":
        voice = pick_say_voice(args.lang, args.voice)
        if not voice:
            sys.exit(f"no macOS voice for {args.lang}. try --engine edge or --list")
        print(f"say · {args.lang} · {voice}", file=sys.stderr)
        if args.out and len(chunks) > 1:
            sys.exit("--out with say can write one file; pass --section or --text")
        for i, line in enumerate(chunks):
            print(line)
            speak_say(line, voice, args.rate, args.out if i == 0 else None)
        return

    voice = args.voice or EDGE_VOICE[args.lang]
    rate = f"{max(-50, min(50, args.rate - 175))}%"
    print(f"edge · {args.lang} · {voice}", file=sys.stderr)
    if args.out and len(chunks) > 1:
        sys.exit("--out with edge can write one file; pass --section or --text")
    joined = " ".join(chunks) if args.out else None
    if joined is not None:
        print(joined)
        asyncio.run(speak_edge(joined, voice, rate, args.out))
        return
    for line in chunks:
        print(line)
        asyncio.run(speak_edge(line, voice, rate, None))


if __name__ == "__main__":
    main()
