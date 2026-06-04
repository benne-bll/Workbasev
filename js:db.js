
// ============================================================
// SUPABASE CONFIG
// ============================================================
var SUPA_URL = "https://ygmtszrmchpdphhfvedz.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbXRzenJtY2hwZHBoaGZ2ZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjUyNTksImV4cCI6MjA5MjIwMTI1OX0.iT8T-4nU685Ns4NttQRz2wz4Y86Su7hIVEdH6Q7BUPo";
var SUPA_USER_ID = "benne_workbase_v1";
var _supaClient = null;
var _syncQueue = {};
var _syncTimer = null;
var _supaReady = false;

function getSupaClient(){
if(!_supaClient && window.supabase){
_supaClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
}
return _supaClient;
}

function showSyncStatus(state, msg){
var el2 = document.getElementById("sync-indicator");
if(!el2) return;
el2.textContent = msg;
el2.className = "show " + state;
clearTimeout(el2._t);
if(state === "ok"){
el2._t = setTimeout(function(){ el2.classList.remove("show"); }, 2000);
}
}

// Supabase: alle Keys laden
function supaLoadAll(cb){
var sb = getSupaClient();
if(!sb){ cb(false); return; }
sb.from("app_data").select("key,value").eq("user_id", SUPA_USER_ID)
.then(function(res){
if(res.error){ cb(false); return; }
var rows = res.data || [];
rows.forEach(function(row){
try{ localStorage.setItem(row.key, row.value); }catch(e){}
MEM[row.key] = row.value;
});
cb(true);
});
}

// Supabase: einen Key speichern (mit Debounce)
function supaSave(key, value){
_syncQueue[key] = value;
clearTimeout(_syncTimer);
_syncTimer = setTimeout(function(){
var sb = getSupaClient();
if(!sb) return;
var entries = Object.keys(_syncQueue).map(function(k){
return { user_id: SUPA_USER_ID, key: k, value: _syncQueue[k] };
});
_syncQueue = {};
showSyncStatus("syncing", "Syncing…");
sb.from("app_data").upsert(entries, { onConflict: "user_id,key" })
.then(function(res){
if(res.error){ showSyncStatus("err", "Sync Fehler"); }
else { showSyncStatus("ok", "Gespeichert"); }
});
}, 800);
}

// ============================================================
// PIN LOGIC
// ============================================================
var DEFAULT_PIN = "1234";
var _pinInput = "";

function pinGetStored(){
try{ return localStorage.getItem("wb_pin") || DEFAULT_PIN; }catch(e){ return DEFAULT_PIN; }
}

function pinUpdateDots(){
for(var i=0; i<4; i++){
var d = document.getElementById("pd"+i);
if(d) d.className = "pin-dot" + (_pinInput.length > i ? " filled" : "");
}
}

function pinSubmit(){
var stored = pinGetStored();
if(_pinInput === stored){
document.getElementById("pin-screen").classList.add("hidden");
renderDash();
setTimeout(function(){
if(getSupaClient()){
showSyncStatus("syncing", "Sync…");
supaLoadAll(function(ok){
if(ok){ showSyncStatus("ok", "Synchronisiert"); renderDash(); }
else { showSyncStatus("err", "Offline"); }
});
}
}, 600);
} else {
_pinInput = "";
pinUpdateDots();
var err = document.getElementById("pin-err");
if(err){ err.textContent = "Falsche PIN"; setTimeout(function(){ err.textContent=""; },2000); }
}
}

(function(){
document.querySelectorAll("[data-pk]").forEach(function(btn){
btn.addEventListener("click", function(){
if(_pinInput.length >= 4) return;
_pinInput += this.getAttribute("data-pk");
pinUpdateDots();
if(_pinInput.length === 4) setTimeout(pinSubmit, 120);
});
});
var delBtn = document.getElementById("pin-del");
if(delBtn) delBtn.addEventListener("click", function(){
_pinInput = _pinInput.slice(0,-1);
pinUpdateDots();
});

// Supabase verbinden (im Hintergrund)
var syncMsg = document.getElementById("pin-sync-msg");
function trySupaConnect(){
var sb = getSupaClient();
if(!sb){
if(syncMsg) syncMsg.textContent = "Offline Modus";
_supaReady = false;
return;
}
// Teste Verbindung: pruefen ob Tabelle existiert
sb.from("app_data").select("key").eq("user_id", SUPA_USER_ID).limit(1)
.then(function(res){
if(res.error && res.error.code === "42P01"){
// Tabelle existiert nicht -> erstellen
if(syncMsg) syncMsg.textContent = "Erstelle Datenbank…";
// Tabelle kann nur via SQL erstellt werden - Info anzeigen
_supaReady = false;
if(syncMsg) syncMsg.textContent = "Bitte Tabelle erstellen (siehe Anleitung)";
} else if(res.error){
_supaReady = false;
if(syncMsg) syncMsg.textContent = "Offline Modus";
} else {
_supaReady = true;
if(syncMsg) syncMsg.textContent = "Cloud verbunden";
}
});
}
// Supabase mit Timeout - blockiert App nicht
setTimeout(function(){
if(window.supabase){ trySupaConnect(); }
else if(syncMsg){ syncMsg.textContent = "Offline Modus"; }
}, 100);
})();

// ============================================================
// STORAGE - sicherer Wrapper mit Supabase + In-Memory Fallback
// ============================================================
var MEM = {};
var USE_LS = (function(){
try{ localStorage.setItem("_x","1"); localStorage.removeItem("_x"); return true; }
catch(e){ return false; }
})();
function lsGet(k){
if(USE_LS){ try{ return localStorage.getItem(k); }catch(e){} }
return MEM[k]||null;
}
function lsSet(k,v){
if(USE_LS){ try{ localStorage.setItem(k,v); }catch(e){} }
MEM[k]=v;
// Supabase sync
if(_supaReady){ supaSave(k, v); }
}

// ============================================================
// DB
// ============================================================
var DB = {
g: function(k){ try{ return JSON.parse(lsGet(k)||"[]"); }catch(e){ return []; } },
s: function(k,v){ lsSet(k, JSON.stringify(v)); },
kunden:     function(){ return this.g("mp_k"); },
projekte:   function(){ return this.g("mp_p"); },
angebote:   function(){ return this.g("mp_a"); },
rechnungen: function(){ return this.g("mp_r"); },
notizen:    function(){ return this.g("mp_n"); },
katalog:    function(){ return this.g("mp_kat"); },
settings:   function(){ try{ return JSON.parse(lsGet("mp_set")||"{}"); }catch(e){ return {}; } },
sK:   function(v){ this.s("mp_k",v); },
sP:   function(v){ this.s("mp_p",v); },
sA:   function(v){ this.s("mp_a",v); },
sR:   function(v){ this.s("mp_r",v); },
sN:   function(v){ this.s("mp_n",v); },
sKat: function(v){ this.s("mp_kat",v); },
aufmass: function(){ return this.g("mp_am"); },
sAM:  function(v){ this.s("mp_am",v); },
ang2:     function(){ return this.g("mp_ang2"); },
zeiten:   function(){ return this.g("mp_zeiten"); },
sZeiten:  function(v){ this.s("mp_zeiten",v); },
material: function(){ return this.g("mp_mat"); },
sMaterial:function(v){ this.s("mp_mat",v); },
geraete:  function(){ return this.g("mp_geraete"); },
sGeraete: function(v){ this.s("mp_geraete",v); },
sig:      function(){ return this.g("mp_sig"); },
sSig:     function(v){ this.s("mp_sig",v); },
texte:    function(){ return this.g("mp_texte"); },
sTexte:   function(v){ this.s("mp_texte",v); },
sAng2:    function(v){ this.s("mp_ang2",v); },
rech2:    function(){ return this.g("mp_rech2"); },
sRech2:   function(v){ this.s("mp_rech2",v); },
vorlagen: function(){ return this.g("mp_vorl"); },
sVorlagen:function(v){ this.s("mp_vorl",v); },
sSet: function(v){ lsSet("mp_set", JSON.stringify(v)); }
};

// ============================================================
// UTILS
// ============================================================
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function eur(v){ return (parseFloat(v)||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" EUR"; }
function fdat(d){ return d ? new Date(d).toLocaleDateString("de-DE") : "-"; }
function esc(s){ return String(s||"").replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">"); }
function el(id){ return document.getElementById(id); }
function gv(id){ var e=el(id); return e ? e.value.trim() : ""; }
function sv(id,v){ var e=el(id); if(e) e.value = v||""; }
function isKU(){ try{ return !!DB.settings().ku; }catch(e){ return false; } }

var _tt = null;
function toast(msg, err){
if(_tt) clearTimeout(_tt);
var t = el("toast");
t.textContent = msg;
t.className = err ? "err" : "";
void t.offsetWidth;
t.classList.add("show");
_tt = setTimeout(function(){ t.classList.remove("show"); }, 2600);
}

function resizeImg(file, cb){
var rd = new FileReader();
rd.onload = function(e){
var img = new Image();
img.onload = function(){
var sc = Math.min(1, 800/img.width);
var w = Math.round(img.width*sc), h = Math.round(img.height*sc);
var cv = document.createElement("canvas");
cv.width=w; cv.height=h;
cv.getContext("2d").drawImage(img,0,0,w,h);
cb(cv.toDataURL("image/jpeg",0.75));
};
img.src = e.target.result;
};
rd.readAsDataURL(file);
}

// SVG icons inline
function icoChk(){ return "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#0f172a' stroke-width='3.5'><polyline points='20 6 9 17 4 12'/></svg>"; }
function icoTrash(){ return "<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg>"; }
function icoChev(){ return "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='var(--bdr)' stroke-width='2'><polyline points='9 18 15 12 9 6'/></svg>"; }

// ============================================================
// NAV
// ============================================================
var CS = "d";
var RENDERS = {
d: renderDash, k: renderKunden, p: renderProjekte,
a: renderAngebote, r: renderRechnungen,
kat: renderKatalog, am: renderAufmass, n: renderNotizen, set: renderSettings,
"ang-edit": renderAngEditor,
"rech-edit": renderRechEditor,
"zeit": renderZeiterfassung,
"mat":  renderMaterial,
"ger":  renderGeraete,
"txt":  renderTextbausteine,
"mehr": renderMehr
};

