// ============================================================
function renderKunden(){
var K=DB.kunden(), q=gv("kSrch")||"";
var filt = q ? K.filter(function(k){ return k.name.toLowerCase().includes(q.toLowerCase())||((k.tel||"").includes(q)); }) : K;
var h = filt.length===0 ?
emptyState(
"<svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#38bdf8' stroke-width='1.5'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/></svg>",
"Noch keine Kunden",
"Lege deinen ersten Kunden an und erstelle direkt ein Angebot.",
"kAddBtnEmpty", "+ Ersten Kunden anlegen"
) :
filt.map(function(k){
var sub = [k.str, k.plz&&k.ort?k.plz+" "+k.ort:"",k.tel,k.mail].filter(Boolean).join(" \u00B7 ")||"-";
return "<div class='li' data-ek='"+k.id+"'>" +
avHTML(k.name, 42)+
"<div class='inf'><div class='ttl'>"+esc(k.name)+"</div><div class='sub'>"+esc(sub)+"</div></div>" +
"<div class='rgt'><button class='dbt' data-dk='"+k.id+"'>"+icoTrash()+"</button>"+icoChev()+"</div>" +
"</div>";
}).join("");
el("s-k").innerHTML =
"<div class='ph'><h1>Kunden</h1><p>"+K.length+" Eintraege</p></div>" +
"<div class='sb'>" +
"<button class='btn bp' id='kAddBtn' style='margin-bottom:10px'>+ Neuer Kunde</button>" +
"<div class='srch-w'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>" +
"<input id='kSrch' type='text' placeholder='Suchen...' value='"+esc(q)+"'></div>" +
h+"</div>";
var b=el("kAddBtn"); if(b) b.onclick=function(){ oKunde(); };
var be=el("kAddBtnEmpty"); if(be) be.onclick=function(){ oKunde(); };
var s=el("kSrch"); if(s) s.oninput=function(){ renderKunden(); };
}

function oKunde(id){
sv("kId",id||""); sv("kVN",""); sv("kNN",""); sv("kStr","");
sv("kPLZ",""); sv("kOrt",""); sv("kTel",""); sv("kMail",""); sv("kNote","");
var t=el("m-k-t"); if(t) t.textContent=id?"Kunde bearbeiten":"Neuer Kunde";
if(id){
var k=DB.kunden().find(function(x){ return x.id===id; });
if(k){ sv("kId",id); sv("kVN",k.vn); sv("kNN",k.nn); sv("kStr",k.str||"");
sv("kPLZ",k.plz||""); sv("kOrt",k.ort||""); sv("kTel",k.tel||""); sv("kMail",k.mail||""); sv("kNote",k.note||""); }
}
mo("m-k");
setTimeout(function(){ var f=el("kVN"); if(f) f.focus(); }, 300);
}
el("kCan").onclick = function(){ mc("m-k"); };
el("kSav").onclick = function(){
var vn=gv("kVN"), nn=gv("kNN");
if(!vn||!nn){ toast("Vor- und Nachname erforderlich", true); return; }
var id=gv("kId")||uid();
var K=DB.kunden(); var idx=K.findIndex(function(x){ return x.id===id; });
var k={id:id,vn:vn,nn:nn,name:vn+" "+nn,str:gv("kStr"),plz:gv("kPLZ"),ort:gv("kOrt"),tel:gv("kTel"),mail:gv("kMail"),note:gv("kNote")};
if(idx>=0) K[idx]=k; else K.push(k);
DB.sK(K); mc("m-k"); toast("Kunde gespeichert");
if(CS==="k") renderKunden(); if(CS==="d") renderDash();
};

// ============================================================
// PROJEKTE
