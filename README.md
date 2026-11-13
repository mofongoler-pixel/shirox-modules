# Shirox modules

Personal, unofficial Re:ANIME and Anidap adapters for Shirox. This repository contains module code and manifests only; it does not host anime or media files and is not affiliated with the providers or Shirox.

## Install

In **Shirox → Settings → Modules**, add the manifest URL for your preferred source:

| Source | Manifest |
| --- | --- |
| Re:ANIME SUB | https://mofongoler-pixel.github.io/shirox-modules/reanime-sub.json |
| Re:ANIME DUB | https://mofongoler-pixel.github.io/shirox-modules/reanime-dub.json |
| Anidap SUB | https://mofongoler-pixel.github.io/shirox-modules/anidap-sub.json |
| Anidap DUB | https://mofongoler-pixel.github.io/shirox-modules/anidap-dub.json |

## 0.1.3 — domain migration repair

November12,2026: Re:ANIME moved to https://reanime.cz/. The old .to domain redirects API paths to its homepage, producing the misleading catalogue-format error. Both modules now use .cz and accept existing .to title/episode links. Live search/details/episode/stream checks pass for SUB and DUB; playback on the phone with this release remains unverified. Update the existing modules in Shirox; the module URLs are unchanged.
