# Re:ANIME modules

Unofficial adapters for Shirox1.0.6 with browser capture and playlistKey support. No video files or session keys are hosted here. Playback resolves entirely on the user's phone. A Mac or external proxy server is not needed.

- https://mofongoler-pixel.github.io/shirox-modules/reanime-sub.json
- https://mofongoler-pixel.github.io/shirox-modules/reanime-dub.json

The adapter retrieves public metadata/episodes and player choices, asks Shirox's browser to load the provider's own player, and supplies the current playlist and its public player-session key to Shirox's existing native playlist interface. No fixed session key, account credentials, remote-script eval or anti-bot bypass is embedded.

Subtitles: exposes text ASS/SRT/VTT/SSA tracks; excludes image-only SUP tracks. SUB prefers full-dialogue English; forced/signs-only and machine dub transcripts are ranked lower. Rendering depends on the player. Audio is selected in Shirox's player: if DUB opens Japanese audio, choose English in the audio-track menu. The module format has no per-source automatic audio-selection field.

Providers can change. Unsupported key-payload formats or unvalidated playlists fail explicitly instead of returning a broken link. At most three servers and two playlist candidates per server are tried; no continuous polling. Detail cache is bounded to20entries/3minutes. No module caches media links across playback sessions.

Verification status is recorded locally; successful module import is distinct from actual iPhone playback. This personal integration is not affiliated with Re:ANIME, Shirox or the video providers.
