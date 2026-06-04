function initKatalog(){
var k=DB.katalog();
if(!k.length) DB.sKat(KDEF);
}

function renderKatalog(){
initKatalog();
var KAT=DB.katalog();

// Unterkategorie-Mapping je ID-Praefix
var SUBKAT = {
maler: {
"Vorbereitung":  ["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],
"Innenanstrich": ["M13","M14","M15","M16","M17","M18","M19","M20","M21","M22"],
"Tapezieren":    ["M23","M24","M25","M26","M27","M28","M29","M30"],
"Holz & Boeden": ["M31","M32","M33","M34","M35","M36","M37","M38"],
"Metall":        ["M39","M40","M41","M42"],
"Lasieren":      ["M43","M44","M45","M46","M47","M48","M49","M50"],
"Fassade":       ["M51","M52","M53","M54","M55","M56","M57","M58"],
"Spezial":       ["M59","M60","M61","M62","M63","M64","M65","M66"]
},
trockenbau: {
"Staenderwand":  ["T01","T02","T03","T04","T05","T06","T07","T08","T09","T10","T11","T12","T13","T14"],
"Decken":        ["T15","T16","T17","T18","T19","T20","T21","T22","T23","T24"],
"Vorsatzschale": ["T25","T26","T27","T28","T29"],
"Spachtelarbeiten Q1-Q4": ["T30","T31","T32","T33","T34","T35"],
"Sonderausfuehrungen":    ["T36","T37","T38","T39","T40","T41","T42","T43","T44"]
},
putz: {
"Innenputz":     ["P01","P02","P03","P04","P05"],
"Fassadenputz":  ["P06","P07","P08","P12","P13","P23","P24","P25"],
"Edelputz & Stuck": ["P09","P10","P17","P20","P21","P22"],
"Ausbesserung":  ["P11","P14","P15","P16","P18","P19"]
},
sonst: {
"Abdichtung":    ["S01","S02"],
"Montage":       ["S03","S04","S05"],
"Abrechnung":    ["S06","S07","S08","S09","S10"]
}
};

var labs={alle:"Alle",maler:"Maler & Lack",trockenbau:"Trockenbau",putz:"Putz & Stuck",sonst:"Sonstiges"};
var cnt={alle:KAT.length,maler:0,trockenbau:0,putz:0,sonst:0};
KAT.forEach(function(k){ if(cnt[k.kat]!==undefined) cnt[k.kat]++; });

var tabs=Object.keys(labs).map(function(key){
return "<button class='"+(katFilter===key?"on":"")+"' data-kf='"+key+"'>"+labs[key]+" ("+cnt[key]+")</button>";
}).join("");

// Filtern
var filt = katFilter==="alle" ? KAT : KAT.filter(function(k){ return k.kat===katFilter; });
if(katSrch) filt=filt.filter(function(k){
return (k.name+k.text).toLowerCase().includes(katSrch.toLowerCase());
});

// Einzelne Item-Karte
function kiCard(item){
var kn={maler:"Maler",trockenbau:"TB",putz:"Putz",sonst:"Sonst."}[item.kat]||item.kat;
return "<div class='ki'>" +
"<div class='ki-h'>" +
"<div><div class='ki-n'>"+esc(item.name)+"</div><div class='ki-e'>"+kn+" \u00B7 je "+esc(item.einh)+"</div></div>" +
"<div style='text-align:right'><div class='ki-p'>"+eur(item.preis)+"</div><div style='font-size:10px;color:var(--mut)'>/"+esc(item.einh)+"</div></div>" +
"</div>" +
"<div class='ki-t'>"+esc(item.text)+"</div>" +
"<div class='ki-b'>" +
"<button class='btn bo bsm' data-kai='"+item.id+"' style='font-size:12px'>In Angebot</button>" +
"<button class='btn bg2 bsm' data-eki='"+item.id+"' style='font-size:12px'>Bearbeiten</button>" +
"<button class='bdg' data-dki='"+item.id+"'>Loeschen</button>" +
"</div>" +
"</div>";
}

var kh = "";
if(filt.length===0){
kh = "<div class='empty'><svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2'><path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/><path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/></svg><p>Keine Eintraege</p></div>";
} else if(katSrch || katFilter==="alle"){
// Bei Suche oder "Alle": flache Liste ohne Gruppen
kh = filt.map(kiCard).join("");
} else {
// Gruppiert nach Unterkategorie
var gruppen = SUBKAT[katFilter] || {};
var gruppenKeys = Object.keys(gruppen);
// Alle IDs in Gruppen sammeln
var inGruppe = {};
gruppenKeys.forEach(function(gname){
gruppen[gname].forEach(function(id){ inGruppe[id]=gname; });
});
// Items ohne Gruppe als "Weitere"
var restItems = filt.filter(function(item){ return !inGruppe[item.id]; });

gruppenKeys.forEach(function(gname){
var gItems = filt.filter(function(item){ return inGruppe[item.id]===gname; });
if(!gItems.length) return;
kh += "<div style='margin:16px 0 6px;display:flex;align-items:center;gap:8px'>" +
"<div style='font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:0.7px'>"+esc(gname)+"</div>" +
"<div style='flex:1;height:1px;background:var(--bdr)'></div>" +
"<div style='font-size:10px;color:var(--bdr)'>"+gItems.length+"</div>" +
"</div>";
kh += gItems.map(kiCard).join("");
});
if(restItems.length){
kh += "<div style='margin:16px 0 6px;display:flex;align-items:center;gap:8px'>" +
"<div style='font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:0.7px'>Weitere</div>" +
"<div style='flex:1;height:1px;background:var(--bdr)'></div>" +
"</div>";
kh += restItems.map(kiCard).join("");
}

}

var newKat = katFilter==="alle" ? "maler" : katFilter;
el("s-kat").innerHTML =
"<div class='ph'><h1>Leistungskatalog</h1><p>"+KAT.length+" Leistungen</p></div>" +
"<div class='sb'>" +
"<div class='row' style='margin-bottom:10px'>" +
"<button class='btn bp' id='kiAddBtn'>+ Neue Leistung</button>" +
"<button class='btn bg2 bsm' id='kiAddKat' style='flex:none;white-space:nowrap'>+ In "+labs[newKat]+"</button>" +
"</div>" +
"<div class='srch-w' style='margin-bottom:10px'>" +
"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>" +
"<input id='katSrchInp' type='text' placeholder='Leistungen suchen...' value='"+esc(katSrch)+"'>" +
"</div>" +
"<div class='ktab'>"+tabs+"</div>" +
kh+
"</div>";

var b1=el("kiAddBtn"); if(b1) b1.onclick=function(){ oKatItem(); };
var b2=el("kiAddKat"); if(b2) b2.onclick=function(){ oKatItem(null,newKat); };
var si=el("katSrchInp");
if(si){
si.oninput=function(){ katSrch=this.value; renderKatalog(); };
// Fokus erhalten beim Re-render waehrend Tippen
if(katSrch){ si.focus(); si.setSelectionRange(si.value.length,si.value.length); }
}
el("s-kat").querySelectorAll(".ktab button[data-kf]").forEach(function(b){
b.addEventListener("click",function(){ katFilter=this.getAttribute("data-kf"); renderKatalog(); });
});
}

function oKatItem(id, preKat){
sv("kiId",id||""); sv("kiNm",""); sv("kiTx",""); sv("kiPr","");
var t=el("m-ki-t"); if(t) t.textContent=id?"Leistung bearbeiten":"Neue Leistung";
var kk=el("kiKat"); if(kk) kk.value=preKat||"maler";
var ke=el("kiEi"); if(ke) ke.value="m2";
if(id){
var item=DB.katalog().find(function(x){ return x.id===id; });
if(item){sv("kiId",id);sv("kiNm",item.name);sv("kiTx",item.text||"");
sv("kiPr",item.preis); if(kk) kk.value=item.kat||"maler"; if(ke) ke.value=item.einh||"m2";}
}
mo("m-ki");
setTimeout(function(){ var f=el("kiNm"); if(f) f.focus(); },300);
}
el("kiCan").onclick=function(){ mc("m-ki"); };
el("kiSav").onclick=function(){
var nm=gv("kiNm"); if(!nm){ toast("Bezeichnung erforderlich",true); return; }
var id=gv("kiId")||uid();
var KAT=DB.katalog(); var idx=KAT.findIndex(function(x){ return x.id===id; });
var item={id:id,kat:(el("kiKat")||{}).value||"maler",name:nm,text:gv("kiTx"),
einh:(el("kiEi")||{}).value||"m2",preis:parseFloat(gv("kiPr"))||0};
if(idx>=0) KAT[idx]=item; else KAT.push(item);
DB.sKat(KAT); mc("m-ki"); toast("Leistung gespeichert");
if(CS==="kat") renderKatalog();
};

function katToAngebot(kid){
var item=DB.katalog().find(function(x){ return x.id===kid; });
if(!item){ toast("Nicht gefunden",true); return; }
tmpKatA[kid]={item:item,menge:1};
oAngebot(); rebuildKatI();
updateSums("aNt","aMw","aMwLbl","aBr",tmpLA);
navTo("a"); toast(item.name+" im Angebot vorgemerkt");
}

// ============================================================
// AUFMASS
// ============================================================
var FORMELN = {
rechteck: {
label:"Rechteck",
felder:["Breite (m)","Hoehe (m)"],
calc:function(v){return v[0]*v[1];}
},
dreieck: {
label:"Dreieck",
felder:["Basis (m)","Hoehe (m)"],
calc:function(v){return v[0]*v[1]/2;}
},
trapez: {
label:"Trapez",
felder:["Seite A (m)","Seite B (m)","Hoehe (m)"],
calc:function(v){return (v[0]+v[1])/2*v[2];}
},
giebel: {
label:"Giebel/Satteldach",
felder:["Breite (m)","Giebelhoehe (m)","Schraege (m)"],
calc:function(v){return v[0]*v[1]+v[0]*v[2];}
},
kreis: {
label:"Kreis",
felder:["Radius (m)"],
calc:function(v){return v[0]*v[0]*3.14159265;}
},
manuell: {
label:"Manuell",
felder:["Flaeche m2 brutto"],
calc:function(v){return v[0];}
}
};

var curAmProjId = "";

