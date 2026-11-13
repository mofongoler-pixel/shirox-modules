# Re:ANIME modules

Unofficial adapters for Shirox 1.0.6 with direct player resolution and playlistKey support. No video files or session keys are hosted here. Playback resolves entirely on the user's phone. A Mac or external proxy server is not needed.

- https://mofongoler-pixel.github.io/shirox-modules/reanime-sub.json
- https://mofongoler-pixel.github.io/shirox-modules/reanime-dub.json

The adapter retrieves public metadata, episodes and the anonymous player bootstrap directly. It decodes the player's changing numeric key routine with a bounded interpreter and passes a validated playlist and its session key to Shirox's existing native playlist interface. Browser capture is not required. CryptoJS 4.2.0 is bundled under the MIT license (CRYPTOJS-LICENSE.txt). No fixed session key, account credentials or remotely evaluated script is embedded.

Subtitles: exposes text ASS/SRT/VTT/SSA tracks; excludes image-only SUP tracks. SUB prefers full-dialogue English; forced/signs-only and machine dub transcripts are ranked lower. Rendering depends on the player. Audio is selected in Shirox's player: if DUB opens Japanese audio, choose English in the audio-track menu. The module format has no per-source automatic audio-selection field.

Providers can change. Unsupported key-payload formats or unvalidated playlists fail explicitly instead of returning a broken link. At most three servers and two playlist candidates per server are tried; no continuous polling. Detail cache is bounded to 20 entries / 3 minutes. No module caches media links across playback sessions.

Version 0.1.2 video playback was confirmed on an iPhone running Shirox 1.0.6 on November 8, 2026. Live SUB/DUB stream resolution checks passed; subtitle rendering and English DUB audio selection on the phone remain unverified. This personal integration is not affiliated with Re:ANIME, Shirox or the video providers.

## 0.1.3 — domain migration repair

November12,2026: Re:ANIME moved to https://reanime.cz/. The old .to domain redirects API paths to its homepage, producing the misleading catalogue-format error. Both modules now use .cz and accept existing .to title/episode links. Live search/details/episode/stream checks pass for SUB and DUB; playback on the phone with this release remains unverified. Update the existing modules in Shirox; the module URLs are unchanged.
