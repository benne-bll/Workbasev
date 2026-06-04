function haptic(type){
try{
if(navigator.vibrate){
if(type==="light")  navigator.vibrate(10);
else if(type==="medium") navigator.vibrate(20);
else if(type==="error")  navigator.vibrate([30,20,30]);
else navigator.vibrate(15);
}
}catch(e){}
}

// Empty State HTML
function emptyState(icon, title, msg, btnId, btnTxt){
return "<div class='empty-state'>"+
"<div class='empty-state-icon' style='background:rgba(56,189,248,.1)'>"+icon+"</div>"+
"<h3>"+title+"</h3>"+
"<p>"+msg+"</p>"+
(btnId?"<button class='es-btn' id='"+btnId+"'>"+btnTxt+"</button>":"")+
"</div>";
}

// ============================================================
// IOS-KOMPATIBLER CONFIRM-DIALOG (kein native confirm())
// ============================================================
function iosConfirm(msg, onYes){
var ov = document.createElement("div");
ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;" +
"display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,Arial,sans-serif";
ov.innerHTML =
"<div style='background:#1e293b;border-radius:16px;padding:24px;max-width:320px;width:100%;" +
"border:1px solid #334155;text-align:center'>" +
"<div style='font-size:15px;color:#f1f5f9;line-height:1.5;margin-bottom:20px'>" + msg + "</div>" +
"<div style='display:flex;gap:10px'>" +
"<button id='_cfNo'  style='flex:1;padding:12px;background:#334155;color:#94a3b8;border:none;" +
"border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit'>Abbrechen</button>" +
"<button id='_cfYes' style='flex:1;padding:12px;background:#ef4444;color:#fff;border:none;" +
"border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit'>Loeschen</button>" +
"</div></div>";
document.body.appendChild(ov);
ov.querySelector("#_cfNo").onclick  = function(){ document.body.removeChild(ov); };
ov.querySelector("#_cfYes").onclick = function(){ document.body.removeChild(ov); onYes(); };
}

function iosConfirmNeutral(msg, yesTxt, onYes){
var ov = document.createElement("div");
ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;" +
"display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,Arial,sans-serif";
ov.innerHTML =
"<div style='background:#1e293b;border-radius:16px;padding:24px;max-width:320px;width:100%;" +
"border:1px solid #334155;text-align:center'>" +
"<div style='font-size:15px;color:#f1f5f9;line-height:1.5;margin-bottom:20px'>" + msg + "</div>" +
"<div style='display:flex;gap:10px'>" +
"<button id='_cfNo2'  style='flex:1;padding:12px;background:#334155;color:#94a3b8;border:none;" +
"border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit'>Abbrechen</button>" +
"<button id='_cfYes2' style='flex:1;padding:12px;background:#1e3a5f;color:#fff;border:none;" +
"border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit'>" + yesTxt + "</button>" +
"</div></div>";
document.body.appendChild(ov);
ov.querySelector("#_cfNo2").onclick  = function(){ document.body.removeChild(ov); };
ov.querySelector("#_cfYes2").onclick = function(){ document.body.removeChild(ov); onYes(); };
}

// ============================================================
// BACKUP & RESTORE
// ============================================================
function doBackup(){
try{
var d = {
ts: new Date().toISOString(),
v: 3,
kunden:     DB.kunden(),
projekte:   DB.projekte(),
angebote:   DB.angebote(),
ang2:       DB.ang2(),
rechnungen: DB.rechnungen(),
rech2:      DB.rech2(),
notizen:    DB.notizen(),
settings:   DB.settings(),
vorlagen:   DB.vorlagen(),
zeiten:     DB.zeiten(),
material:   DB.material(),
geraete:    DB.geraete(),
sig:        DB.sig(),
texte:      DB.texte()
};
var json = JSON.stringify(d, null, 2);
var blob = new Blob([json], {type: "application/json"});
var url  = URL.createObjectURL(blob);
var a    = document.createElement("a");
var dat  = new Date().toISOString().slice(0,10);
a.href     = url;
a.download = "Workbase-Backup-" + dat + ".json";
document.body.appendChild(a);
a.click();
setTimeout(function(){
document.body.removeChild(a);
URL.revokeObjectURL(url);
}, 500);
var st = el("backupStatus");
if(st) st.textContent = "Backup vom " + new Date().toLocaleString("de-DE") + " gespeichert.";
toast("Backup gespeichert");
} catch(e){
toast("Backup fehlgeschlagen: " + e.message, true);
}
}

function doRestore(file){
var rd = new FileReader();
rd.onload = function(e){
try{
var d = JSON.parse(e.target.result);
if(!d.ts){ toast("Ungueltige Backup-Datei", true); return; }
var dat = new Date(d.ts).toLocaleString("de-DE");
iosConfirmNeutral("Alle aktuellen Daten werden durch das Backup vom " + dat + " ersetzt. Fortfahren?", "Wiederherstellen", function(){
if(d.kunden)     DB.s("mp_kunden",   d.kunden);
if(d.projekte)   DB.s("mp_projekte", d.projekte);
if(d.angebote)   DB.s("mp_angebote", d.angebote);
if(d.ang2)       DB.s("mp_ang2",     d.ang2);
if(d.rechnungen) DB.s("mp_rechnungen", d.rechnungen);
if(d.rech2)      DB.s("mp_rech2",    d.rech2);
if(d.notizen)    DB.s("mp_notizen",  d.notizen);
if(d.settings)   DB.s("mp_settings", d.settings);
if(d.vorlagen)   DB.s("mp_vorl",     d.vorlagen);
if(d.zeiten)     DB.s("mp_zeiten",   d.zeiten);
if(d.material)   DB.s("mp_mat",      d.material);
if(d.geraete)    DB.s("mp_geraete",  d.geraete);
if(d.sig)        DB.s("mp_sig",      d.sig);
if(d.texte)      DB.s("mp_texte",    d.texte);
toast("Wiederherstellung erfolgreich - App wird neu geladen…");
setTimeout(function(){ location.reload(); }, 1500);
});
} catch(e){
toast("Fehler beim Lesen der Datei: " + e.message, true);
}
};
rd.readAsText(file);
}

// Events fuer Backup-Buttons (einmalig beim Start binden)
(function(){
var bb = el("btnBackup");
if(bb) bb.onclick = doBackup;
var rb = el("btnRestore");
if(rb) rb.onclick = function(){ el("restoreFileInput").click(); };
var fi = el("restoreFileInput");
if(fi) fi.onchange = function(){
var f = this.files[0];
if(f){ doRestore(f); this.value = ""; }
};
})();

initKatalog();
// renderDash() wird nach PIN-Login aufgerufen, nicht beim Start
// if(document.readyState==="loading"){
// document.addEventListener("DOMContentLoaded",function(){renderDash();});
// } else { renderDash(); }

dlg("kat","data-kai",function(id){ katToAngebot(id); });
dlg("n","data-en",function(id){ oNotiz(id); });
dlg("n","data-dn",function(id){
if(confirm("Notiz loeschen?")){ DB.sN(DB.notizen().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderNotizen(); }
});

// ============================================================
// START
// ============================================================
el("sigClearBtn").onclick=function(){
var cv=el("sigCanvas"); if(!cv)return;
var dpr=window.devicePixelRatio||1;
cv.getContext("2d").clearRect(0,0,cv.width/dpr,cv.height/dpr);
cv._has=false; var ph=el("sigPh"); if(ph)ph.style.display="block";
};
el("sigSaveBtn").onclick=function(){
var cv=el("sigCanvas"); if(!cv||!cv._has){toast("Bitte erst unterschreiben",true);return;}
var d=cv.toDataURL("image/png");
if(ANG.current) ANG.current.unterschrift=d;
toast("Unterschrift gespeichert"); mc("m-sig");
};
el("sigCancelBtn").onclick=function(){ mc("m-sig"); };

// ============================================================
// RENDER MEHR
// ============================================================
function renderMehr(){
var smehr = document.getElementById("s-mehr");
if(!smehr) return;
var chev = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#64748b' stroke-width='2'><polyline points='9 18 15 12 9 6'/></svg>";
var rows = [
{s:"am",  ic:"▦",   nm:"Aufmass",            sub:"Raeume erfassen und berechnen"},
{s:"kat", ic:"📚", nm:"Leistungskatalog",   sub:"Preisliste verwalten"},
{s:"zeit",ic:"⏱",   nm:"Zeiterfassung",      sub:"Stunden pro Projekt"},
{s:"mat", ic:"🧴", nm:"Material-Katalog",   sub:"Preise und Verbrauch"},
{s:"ger", ic:"🔨", nm:"Geraete und Werkzeug", sub:"Geraetepark verwalten"},
{s:"txt", ic:"📄", nm:"Textbausteine",      sub:"Vorlagen verwalten"},
{s:"n",   ic:"📝", nm:"Notizen",            sub:"Projektnotizen"}
];
smehr.innerHTML =
"<div class='ph'><h1>Mehr</h1></div>" +
"<div class='sb' style='padding-top:8px'>" +
rows.map(function(r){
return "<div class='mehr-row' data-navs='" + r.s + "'>" +
"<div class='mehr-row-icon'>" + r.ic + "</div>" +
"<div class='mehr-row-info'>" +
"<div class='mehr-row-title'>" + r.nm + "</div>" +
"<div class='mehr-row-sub'>" + r.sub + "</div>" +
"</div>" + chev + "</div>";
}).join("") +
"<div class='mehr-row' id='mSetRow'>" +
"<div class='mehr-row-icon'>⚙</div>" +
"<div class='mehr-row-info'>" +
"<div class='mehr-row-title'>Einstellungen</div>" +
"<div class='mehr-row-sub'>Firmendaten, Backup, Steuer</div>" +
"</div>" + chev + "</div>" +
"<div class='sec' style='margin-top:8px'>DATENSICHERUNG</div>" +
"<div style='display:flex;gap:10px;padding:0 14px 20px'>" +
"<button class='btn bg2' style='flex:1' id='mBkpBtn'>Backup</button>" +
"<button class='btn bo' style='flex:1' id='mResBtn'>Restore</button>" +
"</div></div>";
smehr.querySelectorAll("[data-navs]").forEach(function(b){
b.onclick = function(){ navTo(this.getAttribute("data-navs")); };
});
var sr = document.getElementById("mSetRow");
if(sr) sr.onclick = function(){ openSettings(); };
var bb = document.getElementById("mBkpBtn");
if(bb) bb.onclick = function(){ doBackup(); };
var rb = document.getElementById("mResBtn");
if(rb) rb.onclick = function(){
var inp = document.createElement("input");
inp.type = "file"; inp.accept = ".json";
inp.onchange = function(){ if(this.files[0]) doRestore(this.files[0]); };
inp.click();
};
}

initKatalog();
// renderDash() wird nach PIN-Login aufgerufen, nicht beim Start

/* === AUFMASS-PRO MODUL === */

"use strict";
/* ============================================================
AUFMASS LOGIK
Interne Einheit: mm (Integer) - Float-sicher
============================================================ */
