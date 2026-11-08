// Unofficial Re:ANIME adapter. Uses Shirox's own browser and playlist interfaces.
// No separate proxy service, persistent keys, accounts, or Mac dependency.
var REANIME_AUDIO = "sub";
var REANIME_BASE = "https://reanime.to";
var reanimeCache = {};
function reanimeLog(message) { console.warn("[ReAnime 0.1.1 " + REANIME_AUDIO + "] " + message); }
// Shirox's native atob/btoa bridge is UTF-8 oriented, not binary-safe.
function reanimeDecode64(input) {
    var alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",text=String(input).replace(/\s/g,""),out="",acc=0,bits=0;
    if(!/^[A-Za-z0-9+/]*={0,2}$/.test(text)||text.length%4===1)throw reanimeError("Invalid player encoding.");
    for(var i=0;i<text.length;i++){if(text[i]==='=')break;var n=alphabet.indexOf(text[i]);acc=(acc<<6)|n;bits+=6;if(bits>=8){bits-=8;out+=String.fromCharCode((acc>>bits)&255);}}
    return out;
}
function reanimeEncode64(input) {
    var alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",out="";
    for(var i=0;i<input.length;i+=3){var a=input.charCodeAt(i),hasB=i+1<input.length,hasC=i+2<input.length,b=hasB?input.charCodeAt(i+1):0,c=hasC?input.charCodeAt(i+2):0;out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b>>4)]+(hasB?alphabet[((b&15)<<2)|(c>>6)]:'=')+(hasC?alphabet[c&63]:'=');}
    return out;
}
function reanimeError(message) { return new Error("Re:ANIME: " + message); }
async function reanimeFetch(url, text) {
    var response = await fetchv2(url, { headers: { Accept: text ? "*/*" : "application/json" } });
    if (response.status && (response.status < 200 || response.status >= 300)) throw reanimeError("HTTP " + response.status);
    return text ? await response.text() : await response.json();
}
function reanimeLink(url) {
    var m = String(url).match(/^https:\/\/reanime\.to\/(?:anime|watch)\/([A-Za-z0-9_-]+)(?:[?#]|$)/);
    if (!m) throw reanimeError("Invalid title link.");
    return { slug: m[1], episode: (String(url).match(/[?&]ep=([0-9]+(?:\.[0-9]+)?)(?:&|$)/) || [])[1], anilist: (String(url).match(/[?&]al=([0-9]+)(?:&|$)/) || [])[1] };
}
function reanimePlain(value) {
    return String(value || "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").trim();
}
async function reanimeDetail(slug) {
    var cached = reanimeCache[slug];
    if (cached && Date.now() - cached.at < 180000) return cached.value;
    var item = await reanimeFetch(REANIME_BASE + "/api/v1/anime/" + encodeURIComponent(slug));
    if (!item || !item.title) throw reanimeError("Title details unavailable.");
    var keys = Object.keys(reanimeCache); if (keys.length >= 20) delete reanimeCache[keys[0]];
    reanimeCache[slug] = { at: Date.now(), value: item };
    return item;
}
async function searchResults(keyword) {
    if (!String(keyword).trim()) return "[]";
    var result = await reanimeFetch(REANIME_BASE + "/api/v1/search?q=" + encodeURIComponent(String(keyword).trim()) + "&limit=30");
    if (!result || !Array.isArray(result.results)) throw reanimeError("Catalogue format changed.");
    return JSON.stringify(result.results.filter(function(item) { return item.anime_id && item.title; }).map(function(item) {
        var image = item.cover_image || {}, title = item.title;
        return { title: title.english || title.romaji || title.native || item.anime_id, image: image.extra_large || image.large || image.medium || "", href: REANIME_BASE + "/anime/" + item.anime_id };
    }));
}
async function extractDetails(url) {
    var item = await reanimeDetail(reanimeLink(url).slug), title = item.title;
    var aliases = [title.english, title.romaji, title.native].filter(function(s,i,a){return s && a.indexOf(s)===i;});
    return JSON.stringify([{ description: reanimePlain(item.description) || "N/A", aliases: aliases.join(" / ") || "N/A", airdate: String(item.season_year || "N/A") }]);
}
async function extractEpisodes(url) {
    var slug = reanimeLink(url).slug;
    var results = await Promise.all([reanimeFetch(REANIME_BASE + "/api/v1/anime/" + slug + "/episodes?limit=2000"), reanimeDetail(slug)]);
    var list = results[0], detail = results[1];
    if (!list || !Array.isArray(list.data)) throw reanimeError("Episode list unavailable.");
    if (list.hasNextPage || list.has_next_page || (list.pagination && (list.pagination.hasNextPage || list.pagination.has_next_page))) throw reanimeError("Episode list is paginated; adapter update required.");
    var seen = {};
    return JSON.stringify(list.data.filter(function(ep){
        var n = ep.episode_number;
        if (typeof n !== "number" || !isFinite(n) || n < 0 || seen[n]) return false;
        if (REANIME_AUDIO === "dub" ? ep.dubbed === false : ep.subbed === false) return false;
        seen[n] = true; return true;
    }).map(function(ep){return {number:ep.episode_number, href:REANIME_BASE+"/watch/"+slug+"?ep="+ep.episode_number+"&al="+Number(detail.anilist_id || 0)};}).sort(function(a,b){return a.number-b.number;}));
}
// The public player bundles a tiny WebAssembly payload whose data segment contains
// two halves of its session playlist key. Read the data, without evaluating remote
// scripts or requiring WebAssembly support in iOS's standalone JavaScriptCore.
function reanimePlaylistKey(html) {
    var match = String(html || "").match(/w_payload\s*:\s*"([A-Za-z0-9+/=]+)"/);
    if (!match) return null;
    var raw = reanimeDecode64(match[1]), bytes = [], i=8;
    for (var n=0;n<raw.length;n++) bytes.push(raw.charCodeAt(n));
    if (bytes.length < 8 || bytes[0]!==0 || bytes[1]!==97 || bytes[2]!==115 || bytes[3]!==109) return null;
    function leb() { var out=0,shift=0,v;do { if(i>=bytes.length||shift>28)throw reanimeError("Unsupported player payload.");v=bytes[i++];out|=(v&127)<<shift;shift+=7;}while(v&128);return out>>>0; }
    while(i<bytes.length) {
        var id=bytes[i++], length=leb(), end=i+length;
        if(end>bytes.length) return null;
        if(id===11) {
            if(leb()!==1 || leb()!==0 || bytes[i++]!==65)return null;
            leb(); if(bytes[i++]!==11 || leb()!==64 || i+64>end)return null;
            var key="";for(var k=0;k<32;k++)key+=String.fromCharCode(bytes[i+k]^bytes[i+32+k]);
            return reanimeEncode64(key);
        }
        i=end;
    }
    return null;
}
function reanimeUnscramble(text,key) {
    if (/^\s*#EXTM3U/.test(text)) return text;
    if (!key) return null;
    try {var data=reanimeDecode64(text.trim()),k=reanimeDecode64(key),out="";for(var i=0;i<data.length;i++)out+=String.fromCharCode(data.charCodeAt(i)^k.charCodeAt(i%k.length));return /^\s*#EXTM3U/.test(out)?out:null;}catch(_){return null;}
}
function reanimeSubtitles(html) {
    var tracks=[],seen={},re=/\{\s*url:\s*"((?:\\.|[^"\\])*)"\s*,\s*language:\s*"((?:\\.|[^"\\])*)"\s*,\s*format:\s*"([^"\\]+)"/g,m;
    while((m=re.exec(String(html||"")))) {
        try {
            var url=JSON.parse('"'+m[1]+'"'),title=JSON.parse('"'+m[2]+'"');
            if (!/^https:\/\//.test(url) || !/^(srt|ass|vtt|ssa)$/i.test(m[3]) || seen[url]) continue;
            seen[url]=true;tracks.push({title:title,url:url,headers:{Referer:"https://flixcloud.cc/"}});
        }catch(_){}
    }
    function rank(t) {var s=0;if(/english|\benm\b/i.test(t.title))s+=100;if(/forced|signs|songs/i.test(t.title))s-=60;if(/dubtitle|\bAI\b/i.test(t.title))s-=80;if(/MTBB/i.test(t.title))s+=5;return s;}
    tracks.sort(function(a,b){return rank(b)-rank(a);});return tracks;
}
async function extractStreamUrl(url) {
    if(typeof networkFetch!=="function")throw reanimeError("Update Shirox: browser capture is required.");
    reanimeLog("Stream lookup started.");
    var link=reanimeLink(url);if(!link.episode)throw reanimeError("Missing episode number.");
    var detail=await reanimeDetail(link.slug),al=link.anilist || detail.anilist_id;
    var choices=[];
    if(al) {try {var flix=await reanimeFetch(REANIME_BASE+"/api/flix/"+al+"/"+link.episode);choices=flix.servers||[];}catch(_){}}
    if(!choices.length) {try {var legacy=await reanimeFetch(REANIME_BASE+"/api/watch/"+link.slug+"/"+link.episode);choices=legacy.servers||[];}catch(_){}}
    reanimeLog("Server entries: " + choices.length);
    choices=choices.filter(function(s){return s.dataType===REANIME_AUDIO && /^https:\/\/flixcloud\.cc\/e\/[A-Za-z0-9_-]+(?:\?|$)/.test(s.dataLink||"");});
    function rank(s){return s.serverName==="HD-1"?0:s.serverName==="HD-2"?1:2;}
    choices.sort(function(a,b){return rank(a)-rank(b);});
    var failure="No compatible episode server available.";
    for(var index=0;index<Math.min(choices.length,3);index++) {
        try {
            var server=choices[index],embed=server.dataLink+(server.dataLink.indexOf('?')<0?'?':'&')+'autoPlay=true';
            reanimeLog("Loading " + server.serverName + " player.");
            var captured=await networkFetch(embed,{timeoutSeconds:14,returnHTML:true,returnCookies:false,cutoff:"master.m3u8",waitForSelectors:["video"],clickSelectors:['.art-icon-play[aria-label="Play"]'],maxWaitTime:5});
            if(!captured || captured.success===false)throw reanimeError("Player could not load.");
            var key=reanimePlaylistKey(captured.html),requests=captured.requests||[];
            reanimeLog("Captured requests: " + requests.length + "; binary key: " + Boolean(key));
            var candidates=requests.map(function(x){return typeof x==='string'?x:(x.url||'');}).filter(function(s){return /^https:\/\//.test(s)&&/\.m3u8(?:[?#]|$)/i.test(s);});
            candidates.sort(function(a,b){return (/master\.m3u8/i.test(b)?1:0)-(/master\.m3u8/i.test(a)?1:0);});
            reanimeLog("Playlist candidates: " + candidates.length);
            if(!candidates.length)throw reanimeError("Player did not expose a stream.");
            for(var c=0;c<Math.min(candidates.length,2);c++) {
                var response=await fetchv2(candidates[c],{headers:{Referer:embed}});
                if(response.status && response.status!==200 && response.status!==206)continue;
                var text=await response.text(),plain=reanimeUnscramble(text,key);
                if(!plain){reanimeLog("Playlist validation failed.");continue;}
                var tracks=reanimeSubtitles(captured.html),english=tracks.filter(function(t){return /english|\benm\b/i.test(t.title)&&!/forced|signs|songs|dubtitle/i.test(t.title);})[0];
                var result={streams:[{title:"Re:ANIME · "+server.serverName,streamUrl:candidates[c],headers:{Referer:embed},playlistKey:/^\s*#EXTM3U/.test(text)?null:key,details:REANIME_AUDIO==='dub'?'Select English in the player audio menu if needed.':null}],allSubtitles:tracks};
                if(REANIME_AUDIO==='sub'&&english){result.subtitle=english.url;result.subtitleHeaders=english.headers;}
                reanimeLog("Validated playlist; subtitle tracks: " + tracks.length);
                return JSON.stringify(result);
            }
            throw reanimeError("Unsupported playlist format.");
        }catch(error){failure=String(error.message||error).replace(/https?:\/\/\S+/g,'[link]').slice(0,180);reanimeLog(failure);}
    }
    throw reanimeError(failure);
}
