// Shirox adapter for Anidap's publicly accessible catalogue and player endpoints.
// No account credentials, embedded ads, proxy rewrites, or access-control bypasses.
var ANIDAP_AUDIO = "sub";
var ANIDAP_SITE = "https://anidap.lol";
var ANIDAP_PLAYER = "https://chad.anidap.lol/rest/api";

async function anidapJSON(url, body) {
    var options = { headers: { "Accept": "application/json" } };
    if (body) { options.method = "POST"; options.headers["Content-Type"] = "application/json"; options.body = JSON.stringify(body); }
    var response = await fetchv2(url, options);
    if (response.status && (response.status < 200 || response.status >= 300)) {
        throw new Error("Anidap returned HTTP " + response.status + ". Open the site to check availability.");
    }
    var data = await response.json();
    if (data.errors && data.errors.length) throw new Error("Anidap: " + data.errors[0].message);
    return data;
}
function anidapID(url) {
    var match = String(url).match(/^https:\/\/anidap\.lol\/(?:anime|watch)\/([A-Za-z0-9_-]+)(?:[?#]|$)/);
    if (!match) throw new Error("Invalid Anidap title URL.");
    return match[1];
}
async function searchResults(keyword) {
    var filter = { isAdult: false };
    if (String(keyword).trim()) filter.query = String(keyword).trim();
    var data = await anidapJSON("https://graphql.anidap.lol/graphql", {
        query: "query CatalogAnime($filter: AnimeCatalogFilterInput, $limit: Int) { catalogAnime(filter: $filter, limit: $limit) { items { id titleRomaji titleEnglish coverImage } } }",
        variables: { filter: filter, limit: 30 }
    });
    var items = data.data && data.data.catalogAnime && data.data.catalogAnime.items;
    if (!Array.isArray(items)) throw new Error("Anidap catalogue format changed.");
    return JSON.stringify(items.filter(function (item) { return item.id && (item.titleEnglish || item.titleRomaji); }).map(function (item) {
        var cover = item.coverImage || {};
        return { title: item.titleEnglish || item.titleRomaji, image: cover.extraLarge || cover.large || cover.medium || "", href: ANIDAP_SITE + "/anime/" + encodeURIComponent(item.id) };
    }));
}
async function extractEpisodes(url) {
    var id = anidapID(url);
    var result = await anidapJSON(ANIDAP_PLAYER + "/episodes?id=" + encodeURIComponent(id));
    var episodes = Array.isArray(result) ? result : result.data;
    if (!Array.isArray(episodes)) throw new Error("Anidap episode format changed.");
    return JSON.stringify(episodes.filter(function (ep) {
        return typeof ep.number === "number" && isFinite(ep.number) && (ANIDAP_AUDIO === "dub" ? ep.hasDub !== false : ep.hasSub !== false);
    }).map(function (ep) {
        return { number: ep.number, href: ANIDAP_SITE + "/watch/" + encodeURIComponent(id) + "?ep=" + encodeURIComponent(ep.number) + "&type=" + ANIDAP_AUDIO };
    }).sort(function (a,b) { return a.number - b.number; }));
}
async function extractStreamUrl(url) {
    var id = anidapID(url);
    var match = String(url).match(/[?&]ep=([0-9]+(?:\.[0-9]+)?)(?:&|$)/);
    if (!match) throw new Error("Missing Anidap episode number.");
    var ep = match[1];
    var servers = await anidapJSON(ANIDAP_PLAYER + "/servers?id=" + encodeURIComponent(id) + "&epNum=" + ep);
    var providers = servers[ANIDAP_AUDIO === "dub" ? "dubProviders" : "subProviders"] || [];
    providers = providers.slice().sort(function(a,b) { return (b.default ? 1 : 0) - (a.default ? 1 : 0); });
    var lastError = "No providers available for " + ANIDAP_AUDIO + ".";
    for (var i=0; i < Math.min(providers.length, 4); i++) {
        var provider = typeof providers[i] === "string" ? providers[i] : providers[i].id;
        if (!provider) continue;
        try {
            var response = await anidapJSON(ANIDAP_PLAYER + "/sources?id=" + encodeURIComponent(id) + "&epNum=" + ep + "&type=" + ANIDAP_AUDIO + "&providerId=" + encodeURIComponent(provider));
            var data = response.data || response;
            var sources = Array.isArray(data.sources) ? data.sources : [];
            var headers = data.headers || {};
            var streams = sources.filter(function(s) {
                return typeof s.url === "string" && /^https:\/\//.test(s.url) && (/mpegurl|video\//i.test(s.type || "") || /\.(m3u8|mp4|m4v)(?:[?#]|$)/i.test(s.url));
            }).map(function(s) {
                return { title: "Anidap " + ANIDAP_AUDIO.toUpperCase() + " · " + provider + " · " + (s.quality || "Auto"), streamUrl: s.url, headers: headers };
            });
            if (!streams.length) throw new Error("Provider has no direct playable stream.");
            var tracks = data.tracks || data.subtitles || [];
            var subtitles = tracks.filter(function(t) { return t.kind !== "thumbnails" && String(t.label || t.lang).toLowerCase() !== "thumbnails" && /^https:\/\//.test(t.url || t.file || ""); }).map(function(t) {
                return { title: t.label || t.lang || "Subtitles", url: t.url || t.file, headers: headers };
            });
            return JSON.stringify({ streams: streams, allSubtitles: subtitles });
        } catch (error) { lastError = String(error.message || error); }
    }
    throw new Error("Anidap playback unavailable: " + lastError);
}
