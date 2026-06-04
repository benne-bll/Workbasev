// ============================================================
var tmpRaeume = [];
function renderRaumListe(){
var tot=tmpRaeume.reduce(function(s,r){ return s+r.m2; },0);
var b=el("rTotBox"); var v=el("rTotV");
if(b) b.style.display=tmpRaeume.length?"block":"none";
if(v) v.textContent=tot.toFixed(2);
var c=el("raumL"); if(!c) return;
c.innerHTML = tmpRaeume.map(function(r,i){
return "<div class='ri'>" +
"<div><div style='font-size:14px;font-weight:600'>"+esc(r.nm)+"</div>" +
"<div style='font-size:11px;color:var(--mut)'>"+r.b+"m x "+r.h+"m</div></div>" +
"<div style='display:flex;align-items:center;gap:8px'>" +
"<span style='font-size:12px;color:var(--acc);font-weight:600'>"+r.m2.toFixed(2)+" m2</span>" +
"<button class='dbt' data-rr='"+i+"' style='width:28px;height:28px;border-radius:7px;font-size:14px;line-height:1'>x</button>" +
"</div>" +
"</div>";
}).join("");
c.querySelectorAll("[data-rr]").forEach(function(btn){
btn.onclick=function(){ tmpRaeume.splice(parseInt(this.getAttribute("data-rr")),1); renderRaumListe(); };
});
}
el("rAdd").onclick = function(){
var nm=gv("rNm")||"Raum";
var b=parseFloat((el("rBr")||{}).value)||0;
var h=parseFloat((el("rHo")||{}).value)||0;
if(!b||!h){ toast("Breite und Hoehe eingeben",true); return; }
tmpRaeume.push({nm:nm,b:b,h:h,m2:parseFloat((b*h).toFixed(3))});
sv("rNm",""); sv("rBr",""); sv("rHo",""); renderRaumListe();
};

function renderProjekte(){
var P=DB.projekte(), K=DB.kunden();
var h = P.length===0 ?
emptyState(
"<svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#38bdf8' stroke-width='1.5'><path d='M2 20h20M5 20V8l7-5 7 5v12M9 20v-5h6v5'/></svg>",
"Noch keine Projekte",
"Erstelle ein Projekt und verknuepfe es mit einem Kunden.",
"pAddBtnEmpty", "+ Erstes Projekt anlegen"
) :
P.map(function(p){
var k=K.find(function(x){ return x.id===p.kid; })||{name:"Kein Kunde"};
var m2=(p.raeume||[]).reduce(function(s,r){ return s+r.m2; },0);
return "<div class='li' data-ep='"+p.id+"'>" +
avHTML(p.name, 42)+
"<div class='inf'><div class='ttl'>"+esc(p.name)+"</div><div class='sub'>"+esc(k.name)+" \u00B7 "+m2.toFixed(1)+" m2</div></div>" +
"<div class='rgt'><button class='dbt' data-dp='"+p.id+"'>"+icoTrash()+"</button>"+icoChev()+"</div>" +
"</div>";
}).join("");
el("s-p").innerHTML =
"<div class='ph'><h1>Projekte</h1><p>"+P.length+" Eintraege</p></div>" +
"<div class='sb'>" +
"<button class='btn bp' id='pAddBtn' style='margin-bottom:10px'>+ Neues Projekt</button>" + h+"</div>";
var b=el("pAddBtn"); if(b) b.onclick=function(){ oProjekt(); };
}

function oProjekt(id){
tmpRaeume=[]; sv("pId",id||""); sv("pNm",""); sv("pDesc","");
var t=el("m-p-t"); if(t) t.textContent=id?"Projekt bearbeiten":"Neues Projekt";
var sel=el("pKun"); if(sel){
sel.innerHTML="<option value=''>Kunde waehlen</option>"+
DB.kunden().map(function(k){ return "<option value='"+k.id+"'>"+esc(k.name)+"</option>"; }).join("");
}
if(id){
var p=DB.projekte().find(function(x){ return x.id===id; });
if(p){ sv("pId",id); sv("pNm",p.name); sv("pDesc",p.desc||"");
if(sel) sel.value=p.kid||"";
tmpRaeume=JSON.parse(JSON.stringify(p.raeume||[])); }
}
renderRaumListe(); mo("m-p");
setTimeout(function(){ var f=el("pNm"); if(f) f.focus(); },300);
}
el("pCan").onclick = function(){ mc("m-p"); };
el("pSav").onclick = function(){
var nm=gv("pNm"), kid=(el("pKun")||{}).value;
if(!nm){ toast("Projektname erforderlich",true); return; }
if(!kid){ toast("Kunde auswaehlen",true); return; }
var id=gv("pId")||uid();
var P=DB.projekte(); var idx=P.findIndex(function(x){ return x.id===id; });
var p={id:id,name:nm,kid:kid,desc:gv("pDesc"),raeume:tmpRaeume,datum:Date.now()};
if(idx>=0) P[idx]=p; else P.push(p);
DB.sP(P); mc("m-p"); toast("Projekt gespeichert");
if(CS==="p") renderProjekte(); if(CS==="d") renderDash();
};

// ============================================================
// ANGEBOTE
// ============================================================
