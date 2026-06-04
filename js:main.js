function navTo(s){
haptic("light");
document.querySelectorAll(".scr").forEach(function(x){ x.classList.remove("act"); });
document.querySelectorAll(".nb").forEach(function(x){ x.classList.remove("on"); });
var scr = el("s-"+s);
if(scr) scr.classList.add("act");
var btn = document.querySelector(".nb[data-s='"+s+"']");
if(btn) btn.classList.add("on");
CS = s;
if(RENDERS[s]) RENDERS[s]();
updateFAB(s);
}

document.querySelectorAll(".nb").forEach(function(b){
b.addEventListener("click", function(){ navTo(this.getAttribute("data-s")); });
});

// Modal helpers
function mo(id){ var e=el(id); if(e) e.classList.add("open"); }
function mc(id){ var e=el(id); if(e) e.classList.remove("open"); }
document.querySelectorAll(".mov").forEach(function(o){
o.addEventListener("click", function(e){ if(e.target===o) o.classList.remove("open"); });
});

// Event delegation
function dlg(sid, attr, fn){
var c = el("s-"+sid);
if(!c) return;
c.addEventListener("click", function(e){
var t = e.target.closest("["+attr+"]");
if(t){ e.stopPropagation(); fn(t.getAttribute(attr)); }
});
}

// ============================================================
// STANDARD LEISTUNGEN
// ============================================================
var LEI = [
{id:"L1",name:"Spachteln",z:0.25,m:2.50},
{id:"L2",name:"Schleifen",z:0.15,m:0.80},
{id:"L3",name:"Streichen",z:0.20,m:3.20},
{id:"L4",name:"Malervlies",z:0.18,m:4.50},
{id:"L5",name:"Grundierung",z:0.12,m:1.80},
{id:"L6",name:"Trockenbau GK",z:0.55,m:12.00},
{id:"L7",name:"Daemmung",z:0.35,m:8.00},
{id:"L8",name:"Tapezieren",z:0.30,m:5.50}
];
var STD = 45;
function lp(l,m2){ return { ges: m2*l.z*STD + m2*l.m }; }

// Temporaere Zustaende fuer Modals
var tmpLA = {}, tmpLR = {}, tmpKatA = {};

function calcNetto(state){
var n = 0;
LEI.forEach(function(l){ var s=state[l.id]; if(s&&s.on) n+=lp(l,s.m2||0).ges; });
Object.keys(tmpKatA).forEach(function(k){ var e=tmpKatA[k]; n+=(e.item.preis||0)*(e.menge||1); });
return n;
}

function updateSums(nid, mid, mwlid, bid, state, rtyp, abp){
var n = calcNetto(state);
// Fuer Rechnungen nur Standard-LEI, kein tmpKatA
if(nid === "rNt"){
n = 0;
LEI.forEach(function(l){ var s=state[l.id]; if(s&&s.on) n+=lp(l,s.m2||0).ges; });
}
var ku = isKU();
var mw = ku ? 0 : n*0.19;
var brutto = n+mw;
var en=el(nid), em=el(mid), ewl=el(mwlid), eb=el(bid);
if(en) en.textContent = eur(n);
if(em) em.textContent = ku ? "0,00 EUR" : eur(mw);
if(ewl) ewl.textContent = ku ? "MwSt. (Par.19)" : "MwSt. 19%";
// Abschlag
if(rtyp && rtyp !== "schluss" && rtyp !== "teil"){
var abv = brutto*(abp||0.3);
var abRow=el("rAbRow"), abVal=el("rAbVal"), abLbl=el("rAbLbl");
if(abRow) abRow.style.display="flex";
if(abVal) abVal.textContent = eur(abv);
if(abLbl) abLbl.textContent = Math.round((abp||0.3)*100)+"% Abschlag";
brutto = abv;
} else {
var abRow2=el("rAbRow"); if(abRow2) abRow2.style.display="none";
}
if(eb) eb.textContent = eur(brutto);
return {n:n, mw:mw, brutto:brutto};
}

// ============================================================
// LEISTUNGEN BUILDER
// ============================================================
function buildLeistungen(cid, state, nid, mid, mwlid, bid){
var pid = nid==="aNt" ? gv("aPrj") : gv("rPrj");
var p = pid ? DB.projekte().find(function(x){ return x.id===pid; }) : null;
var dm2 = p ? (p.raeume||[]).reduce(function(s,r){ return s+r.m2; },0) : 0;
var flBox = el(nid==="aNt" ? "aFlBox" : "rFlBox");
var flV   = el(nid==="aNt" ? "aFlV" : "rFlV");
if(p && dm2>0 && flBox && flV){ flV.textContent=dm2.toFixed(2); flBox.style.display="block"; }
else if(flBox){ flBox.style.display="none"; }
LEI.forEach(function(l){ if(!state[l.id]) state[l.id]={on:false,m2:dm2}; });
var h = "";
LEI.forEach(function(l){
var s=state[l.id]; var on=s.on; var m2=s.m2||0;
h += "<div class='cr' data-lei='"+l.id+"'>" +
"<div class='cb"+(on?" on":"")+"'>"+(on?icoChk():"")+"</div>" +
"<div class='cri'><div class='crn'>"+esc(l.name)+"</div>" +
"<div class='crs'>"+l.z+"h/m2 · Mat. "+eur(l.m)+"/m2</div></div>" +
(on ?
"<div style='display:flex;align-items:center;gap:5px;flex-shrink:0'>" +
"<input type='number' class='lei-m2' data-lid='"+l.id+"' value='"+m2+"' min='0' step='0.5' " +
"style='width:65px;padding:5px 7px;font-size:13px;text-align:right;border-radius:8px'>" +
"<span style='font-size:11px;color:var(--acc)'>"+eur(lp(l,m2).ges)+"</span>" +
"</div>"
: "<span style='font-size:12px;color:var(--mut)'>"+eur(lp(l,dm2).ges)+"</span>") +
"</div>";
});
var c = el(cid);
if(c){
c.innerHTML = h;
c.querySelectorAll(".lei-m2").forEach(function(inp){
// stopPropagation: verhindert dass .cr click-listener den Input-Klick abfaengt
inp.addEventListener("click", function(e){ e.stopPropagation(); });
inp.addEventListener("touchstart", function(e){ e.stopPropagation(); });
inp.addEventListener("focus", function(e){ e.stopPropagation(); });
inp.addEventListener("input", function(){
var lid = this.getAttribute("data-lid");
state[lid].m2 = parseFloat(this.value)||0;
var sp = this.nextElementSibling;
var l = LEI.find(function(x){ return x.id===lid; });
if(sp && l) sp.textContent = eur(lp(l,state[lid].m2).ges);
var rt = gv("rTyp"), ap = parseFloat(gv("rAbP")||30)/100;
updateSums(nid,mid,mwlid,bid,state,rt,ap);
});
});
}
var rt = gv("rTyp"), ap = parseFloat(gv("rAbP")||30)/100;
updateSums(nid,mid,mwlid,bid,state,rt,ap);
}

// Toggle LEI
function toggleLEI(lid, state, nid, mid, mwlid, bid){
if(!state[lid]) state[lid]={on:false,m2:0};
state[lid].on = !state[lid].on;
buildLeistungen(nid==="aNt"?"aLL":"rLL", state, nid, mid, mwlid, bid);
if(nid==="aNt") rebuildKatI();
}

// Katalog Items im Angebot
function rebuildKatI(){
var keys = Object.keys(tmpKatA);
var c = el("aKatI");
if(!c) return;
if(!keys.length){ c.innerHTML=""; return; }
var h = "<div class='sec' style='margin-top:4px'>Aus Katalog</div>";
keys.forEach(function(kid){
var e=tmpKatA[kid]; var item=e.item; var mn=e.menge||1;
h += "<div class='cr' style='cursor:default'>" +
"<div class='cb on'>"+icoChk()+"</div>" +
"<div class='cri'><div class='crn'>"+esc(item.name)+"</div>" +
"<div class='crs'>"+esc(item.einh)+" · EP "+eur(item.preis)+"</div></div>" +
"<div style='display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0'>" +
"<div style='display:flex;align-items:center;gap:4px'>" +
"<input type='number' class='kat-mng' data-kid='"+kid+"' value='"+mn+"' min='0.01' step='0.5' " +
"style='width:60px;padding:5px 7px;font-size:13px;text-align:right;border-radius:8px'>" +
"<span style='font-size:11px;color:var(--mut)'>"+esc(item.einh)+"</span>" +
"</div>" +
"<span style='font-size:11px;color:var(--acc)'>"+eur(item.preis*mn)+"</span>" +
"<button class='kat-rm' data-kid='"+kid+"' style='background:rgba(239,68,68,0.15);border:none;color:var(--red);font-size:10px;border-radius:6px;padding:2px 6px;cursor:pointer;font-family:inherit'>x</button>" +
"</div>" +
"</div>";
});
c.innerHTML = h;
c.querySelectorAll(".kat-mng").forEach(function(inp){
inp.addEventListener("input", function(){
var kid=this.getAttribute("data-kid");
if(tmpKatA[kid]){
tmpKatA[kid].menge = parseFloat(this.value)||1;
var sp=this.parentElement.parentElement.querySelector("span");
if(sp) sp.textContent = eur(tmpKatA[kid].item.preis*tmpKatA[kid].menge);
updateSums("aNt","aMw","aMwLbl","aBr",tmpLA);
}
});
});
c.querySelectorAll(".kat-rm").forEach(function(btn){
btn.addEventListener("click", function(){
delete tmpKatA[this.getAttribute("data-kid")];
rebuildKatI();
updateSums("aNt","aMw","aMwLbl","aBr",tmpLA);
});
});
}

// ============================================================
// DASHBOARD
// ============================================================

// ============================================================
// KUNDEN
