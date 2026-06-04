var ANG = { current:null, katSrch:"", katFilter:"alle", vorschauOffen:false };

function genAngNr(){
var alle=DB.ang2(), jahr=new Date().getFullYear();
return "A-"+jahr+"-"+String(alle.length+1).padStart(3,"0");
}

function angStatusCls(s){
if(s==="angenommen") return "ang-badge-grn";
if(s==="gesendet")   return "ang-badge-blu";
if(s==="abgelehnt")  return "ang-badge-red";
return "ang-badge-yel";
}
function angStatusLbl(s){
return {entwurf:"Entwurf",gesendet:"Gesendet",angenommen:"Angenommen",abgelehnt:"Abgelehnt"}[s]||"Entwurf";
}

function angSummen(ang){
var pos=ang.positionen||[];
var rab=parseFloat(ang.rabatt)||0;
var netto=pos.reduce(function(s,p){ return s+(parseFloat(p.menge)||0)*(parseFloat(p.ep)||0); },0);
var rabBetrag=netto*rab/100;
var nNachRab=netto-rabBetrag;
var ku = ang.kuOverride !== undefined ? ang.kuOverride : isKU();
var mwst0=!!ang.mwst0;
var mwst=(ku||mwst0)?0:nNachRab*0.19;
return {netto:netto,rabatt:rabBetrag,nettoNachRab:nNachRab,mwst:mwst,brutto:nNachRab+mwst,ku:ku,mwst0:mwst0};
}

// ============================================================
// LISTE
// ============================================================
function renderAngebote(){
var A=DB.ang2();
var empty="<div class='empty'><svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/></svg><p>Noch keine Angebote</p></div>";
var cards=A.length===0?empty:A.slice().reverse().map(function(a){
var s=angSummen(a);
return "<div class='ang-karte'>"+
"<div class='ang-karte-top'>"+
"<div class='ang-karte-left'>"+
"<div class='ang-karte-nr'>"+esc(a.nummer||"")+"</div>"+
"<div class='ang-karte-kunde'>"+esc(a.kundeName||"-")+"</div>"+
(a.objekt?"<div class='ang-karte-obj'>"+esc(a.objekt)+"</div>":"")+
"<div class='ang-karte-dat'>"+fdat(a.datum)+"</div>"+
"</div>"+
"<div class='ang-karte-right'>"+
"<div class='ang-brutto'>"+eur(s.brutto)+"</div>"+
"<span class='ang-badge "+angStatusCls(a.status)+"'>"+angStatusLbl(a.status)+"</span>"+
"</div>"+
"</div>"+
"<div class='ang-karte-btns'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' data-edita='"+a.id+"'>Bearbeiten</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-pdfa='"+a.id+"'>PDF</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-dupa='"+a.id+"'>Duplizieren</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' style='background:rgba(34,197,94,.12);color:#16a34a;border:1px solid rgba(34,197,94,.25)' data-a2rech='"+a.id+"'>→ Rechnung</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' data-dela='"+a.id+"'>Loeschen</button>"+
"</div>"+
"</div>";
}).join("");

el("s-a").innerHTML=
"<div class='ph'><h1>Angebote</h1><p>"+A.length+" Eintraege</p></div>"+
"<div class='sb'>"+
"<button class='ang-btn ang-btn-pri ang-btn-full' id='angNeuBtn' style='margin-bottom:12px'>"+
"<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' style='margin-right:6px'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>"+
"Neues Angebot erstellen"+
"</button>"+
cards+
"</div>";
var nb=el("angNeuBtn"); if(nb) nb.onclick=function(){ oAngNeu(); };
}

// ============================================================
// EDITOR OEFFNEN
// ============================================================
function oAngNeu(){
ANG.current={
id:uid(), nummer:genAngNr(),
kundeName:"", kundeId:"", ansprechpartner:"",
anschrift:"", objekt:"",
datum:new Date().toISOString().slice(0,10),
status:"entwurf", rabatt:0,
anzahlung:false, anzahlungProz:"",
skonto:false, skontoText:"",
estg:false,
kuOverride: isKU(),
mwst0: false,
anschreiben:"", schlusstext:"",
positionen:[], erstellt:Date.now()
};
ANG.katSrch=""; ANG.katFilter="alle"; ANG.vorschauOffen=false;
navTo("ang-edit"); renderAngEditor();
}

function oAngEdit(id){
var a=DB.ang2().find(function(x){ return x.id===id; });
if(!a){ toast("Nicht gefunden",true); return; }
ANG.current=JSON.parse(JSON.stringify(a));
ANG.katSrch=""; ANG.katFilter="alle"; ANG.vorschauOffen=false;
navTo("ang-edit"); renderAngEditor();
}

// ============================================================
// RENDER EDITOR (EINZIGE SCROLLBARE SEITE wie Screenshot)
// ============================================================
function renderAngEditor(){
var a=ANG.current; if(!a){ navTo("a"); return; }
var s=angSummen(a);
var K=DB.kunden();

// Kunden-Optionen
var kundeOpts="<option value=''>– Kunde auswaehlen –</option>"+
K.map(function(k){ return "<option value='"+k.id+"'"+(k.id===a.kundeId?" selected":"")+">"+esc(k.name)+"</option>"; }).join("");

// Vorlagen
var V=DB.vorlagen();
var anschVorlagen="<option value=''>– Vorlage auswaehlen –</option>"+
V.filter(function(v){ return v.typ==="anschreiben"; })
.map(function(v){ return "<option value='"+esc(v.id)+"'>"+esc(v.name)+"</option>"; }).join("");
var schlusVorlagen="<option value=''>– Vorlage auswaehlen –</option>"+
V.filter(function(v){ return v.typ==="schlusstext"; })
.map(function(v){ return "<option value='"+esc(v.id)+"'>"+esc(v.name)+"</option>"; }).join("");

// Positionen HTML
var pos=a.positionen||[];
var gruppen={};
pos.forEach(function(p){ var g=p.gruppe||"Allgemein"; if(!gruppen[g])gruppen[g]=[]; gruppen[g].push(p); });

var posHTML="";
var gruppen2=Object.keys(a.aufmassGruppen||{});
if(pos.length===0 && gruppen2.length===0){
posHTML="<div class='ang-pos-empty'>Noch keine Positionen. Leistungen aus dem Katalog unten auswaehlen.</div>";
} else {

// Tabellen-Header
posHTML+="<div class='ang-pos-header'>"+
"<span class='ang-ph-pos'>Pos.</span>"+
"<span class='ang-ph-leis'>Leistung</span>"+
"<span class='ang-ph-menge'>Menge</span>"+
"<span class='ang-ph-ep'>EP</span>"+
"<span class='ang-ph-ges'>Gesamt</span>"+
"<span style='width:28px'></span>"+
"</div>";
var posNr=0;
Object.keys(gruppen).forEach(function(grp){
posHTML+="<div class='ang-grp-hd' style='font-size:13px;font-weight:800;color:#1e3a5f;text-transform:uppercase;padding:12px 6px 5px;border-top:2px solid #e2e8f0;margin-top:8px'>"+esc(grp)+"</div>";
gruppen[grp].forEach(function(p){
var globalIdx=pos.indexOf(p); posNr++;
var gp=(parseFloat(p.menge)||0)*(parseFloat(p.ep)||0);
posHTML+=
"<div class='ki' data-posidx='"+globalIdx+"' style='margin-bottom:8px'>"+
"<div class='ki-h'>"+
"<div><div class='ki-n'>"+esc(p.name)+"</div><div class='ki-e'>"+esc(p.einh)+"</div></div>"+
"<button class='ang-pos-del' data-delpos='"+globalIdx+"' style='background:none;border:none;cursor:pointer;color:#ef4444'>"+
"<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>"+
"</button>"+
"</div>"+
(p.text?"<div class='ki-t' id='pos-desc-"+globalIdx+"' style='display:none;margin-top:6px;font-size:12px;color:var(--mut)'>"+esc(p.text)+"</div>"+ "<div onclick='var d=document.getElementById(\"pos-desc-"+globalIdx+"\");d.style.display=d.style.display===\"none\"?\"block\":\"none\"' style='font-size:11px;color:var(--acc);cursor:pointer;margin-top:4px'>&#9660; Beschreibung</div>":"")+
"<div style='display:flex;align-items:center;gap:8px;margin-top:8px'>"+
"<span style='font-size:12px;color:var(--mut)'>Menge</span>"+
"<input type='number' class='ang-pos-menge ang-input-sm' value='"+(p.menge||1)+"' min='0' step='0.01' data-posidx='"+globalIdx+"'>"+
"<span style='font-size:12px;color:var(--mut)'>EP</span>"+
"<input type='number' class='ang-pos-ep ang-input-sm' value='"+(p.ep||0)+"' min='0' step='0.01' data-posidx='"+globalIdx+"'>"+
"<div style='margin-left:auto;font-weight:700;font-size:14px;color:var(--txt)'>"+eur(gp)+"</div>"+
"</div>"+
"</div>";

});
});
}

// Summen-HTML
var ku=s.ku;
var sumHTML=
"<div class='ang-summen-block'>"+
"<div class='ang-sum-row'><span>Netto</span><span>"+eur(s.netto)+"</span></div>"+
(s.rabatt>0?"<div class='ang-sum-row'><span>Rabatt ("+a.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
"<div class='ang-sum-row'><span>"+(ku?"MwSt. (Par.19 UStG)":(s.mwst0?"0% Steuerfrei":"MwSt. 19%"))+"</span><span>"+eur(s.mwst)+"</span></div>"+
"<div class='ang-sum-row ang-sum-total'><span>Brutto</span><span>"+eur(s.brutto)+"</span></div>"+
(a.rabatt>0?"<div class='ang-sum-row'><span>Rabatt (%)</span><span>"+a.rabatt+" %</span></div>":"")+
"</div>";

// Katalog-Suche
var KAT=DB.katalog();
var katFilt=ANG.katSrch?KAT.filter(function(k){ return (k.name+k.text).toLowerCase().indexOf(ANG.katSrch.toLowerCase())>=0; }):KAT;
var katGrpMap={alle:"Alle",maler:"Maler",trockenbau:"Trockenbau",putz:"Putz",sonst:"Sonstiges"};
var katTabs=Object.keys(katGrpMap).map(function(k){
return "<button class='ang-kat-tab"+(ANG.katFilter===k?" ang-kat-tab-on":"")+"' data-katf='"+k+"'>"+katGrpMap[k]+"</button>";
}).join("");
var katItems=katFilt.slice(0,60).map(function(item){
return "<div class='ang-kat-item'>"+
"<div style='flex:1;min-width:0'>"+
"<div class='ang-kat-nm'>"+esc(item.name)+"</div>"+


"<div class='ang-kat-info'>"+esc(item.einh)+" · "+eur(item.preis)+"</div>"+
(item.text?"<div class='ki-t' style='font-size:12px;color:var(--mut);margin-top:4px'>"+esc(item.text)+"</div>":"")+ 


"</div>"+
"<button class='ang-kat-add' data-katid='"+esc(item.id)+"'>+</button>"+
"</div>";
}).join("")||"<div style='color:#94a3b8;padding:12px;font-size:13px;text-align:center'>Keine Treffer</div>";



// Vorschau-HTML (eingebettet wie Screenshot)
var vorschauHTML="";
if(ANG.vorschauOffen){
vorschauHTML="<div class='ang-vorschau-box' id='angVorschauBox'>"+buildAngVorschauInline(a)+"</div>";
}

// GESAMTES HTML - EINE SCROLLBARE SEITE
el("s-ang-edit").innerHTML=

// –– ACTION BAR OBEN (fixiert) ––
"<div class='ang-action-bar' id='angActionBar'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='angPdfBtn2'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>"+
" PDF"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='angVorschauBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>"+
" Vorschau"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='angUnterschriftBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/></svg>"+
" Unterschrift"+
"</button>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm ang-ab-btn ang-save-main' id='angSaveBtn2'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' style='flex-shrink:0'><polyline points='20 6 9 17 4 12'/></svg>"+
" Angebot speichern"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='angProjBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M2 20h20M5 20V8l7-5 7 5v12M9 20v-5h6v5'/></svg>"+
" Projekt erzeugen"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn ang-back-sm' id='angBackBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>"+
"</button>"+
"</div>"+

// –– INHALT (scrollbar) ––
"<div class='ang-scroll-body'>"+

// Vorschau (wenn offen)
vorschauHTML+

// –– RAHMENDATEN ––
"<div class='ang-card' id='angCardRahmen'>"+
"<div class='ang-card-hd'>"+
"<span class='ang-card-stripe'></span>"+
"<span class='ang-card-title'>Rahmendaten</span>"+
"</div>"+


"<div class='ang-form-grid'>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>KUNDE</label>"+
    "<select id='angKundeSelect' class='ang-input'>"+kundeOpts+"</select>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>ANSPRECHPARTNER</label>"+
    "<input id='angAnsprechpartner' class='ang-input' type='text' placeholder='z.B. Max Mustermann' value='"+esc(a.ansprechpartner||"")+"' autocomplete='off'>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>ANSCHRIFT</label>"+
    "<input id='angAnschrift' class='ang-input' type='text' placeholder='Strasse, PLZ Ort' value='"+esc(a.anschrift||"")+"' autocomplete='off'>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>OBJEKT</label>"+
    "<input id='angObjekt' class='ang-input' type='text' placeholder='z.B. EFH Musterstrasse' value='"+esc(a.objekt||"")+"' autocomplete='off'>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>DATUM</label>"+
    "<input id='angDatum' class='ang-input' type='date' value='"+esc(a.datum||"")+"'>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>ANGEBOTSNUMMER</label>"+
    "<input id='angNummer' class='ang-input' type='text' value='"+esc(a.nummer||"")+"' autocomplete='off'>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>STATUS</label>"+
    "<select id='angStatus' class='ang-input'>"+
      "<option value='entwurf'"+(a.status==="entwurf"?" selected":"")+">Entwurf</option>"+
      "<option value='gesendet'"+(a.status==="gesendet"?" selected":"")+">Gesendet</option>"+
      "<option value='angenommen'"+(a.status==="angenommen"?" selected":"")+">Angenommen</option>"+
      "<option value='abgelehnt'"+(a.status==="abgelehnt"?" selected":"")+">Abgelehnt</option>"+
    "</select>"+
  "</div>"+
  "<div class='ang-fg'>"+
    "<label class='ang-lbl'>RABATT (%)</label>"+
    "<input id='angRabatt' class='ang-input' type='number' min='0' max='100' step='0.5' value='"+(a.rabatt||0)+"'>"+
  "</div>"+
"</div>"+

// ZAHLUNGSBEDINGUNGEN + STEUER - Toggle Kacheln
"<div class='ang-zahlung-section'>"+
  "<div class='ang-zahlung-title'>ZAHLUNGSBEDINGUNGEN &amp; STEUER</div>"+

  "<div class='ang-toggle-row'"+(a.anzahlung?" ang-tog-on":"")+" data-tog='angAnzahlungCb'>"+
    "<div class='ang-tog-box'>"+
      "<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
    "</div>"+
    "<div class='ang-tog-info'>"+
      "<div class='ang-tog-nm'>Anzahlung vereinbaren</div>"+
      "<div class='ang-tog-sub'>Wird in Auftragsbestaetigung im PDF erwaehnt.</div>"+
    "</div>"+
  "</div>"+
  "<div id='angAnzahlungDetail' style='display:"+(a.anzahlung?"block":"none")+";padding:4px 0 12px 14px'>"+
    "<div class='ang-fg'><label class='ang-lbl'>Anzahlung (%)</label>"+
    "<input id='angAnzahlungProz' class='ang-input' type='number' min='0' max='100' step='5' placeholder='z.B. 30' value='"+esc(a.anzahlungProz||"")+"' style='max-width:200px'></div>"+
  "</div>"+

  "<div class='ang-toggle-row'"+(a.skonto?" ang-tog-on":"")+" data-tog='angSkontoCb'>"+
    "<div class='ang-tog-box'>"+
      "<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
    "</div>"+
    "<div class='ang-tog-info'>"+
      "<div class='ang-tog-nm'>Skonto gewaehren</div>"+
      "<div class='ang-tog-sub'>Wird in Angebot &amp; Auftragserteilung im PDF erwaehnt.</div>"+
    "</div>"+
  "</div>"+
  "<div id='angSkontoDetail' style='display:"+(a.skonto?"block":"none")+";padding:4px 0 12px 14px'>"+
    "<div class='ang-fg'><label class='ang-lbl'>Skonto-Konditionen</label>"+
    "<input id='angSkontoText' class='ang-input' type='text' placeholder='z.B. 2% Skonto innerhalb 10 Tagen' value='"+esc(a.skontoText||"")+"' autocomplete='off'></div>"+
  "</div>"+

  "<div class='ang-toggle-row'"+(a.estg?" ang-tog-on":"")+" data-tog='angEstgCb'>"+
    "<div class='ang-tog-box'>"+
      "<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
    "</div>"+
    "<div class='ang-tog-info'>"+
      "<div class='ang-tog-nm'>Hinweis &sect;35a EStG (Handwerkerleistungen)</div>"+
      "<div class='ang-tog-sub'>Optionaler Hinweis fuer Privatkunden im PDF.</div>"+
    "</div>"+
  "</div>"+
  "<div class='ang-divider' style='margin:6px 0 14px'></div>"+
  "<div class='ang-zahlung-title' style='margin-bottom:8px'>MEHRWERTSTEUER</div>"+

  "<div class='ang-toggle-row'"+(a.kuOverride!==undefined?a.kuOverride:isKU()?" ang-tog-on ang-tog-ku-on":"")+" data-tog='angKuCb'>"+
    "<div class='ang-tog-box'>"+
      "<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
    "</div>"+
    "<div class='ang-tog-info'>"+
      "<div class='ang-tog-nm'>Kleinunternehmer gem. &sect;19 UStG (0% MwSt.)</div>"+
      "<div class='ang-tog-sub'>Pflichthinweis im PDF. Einstellung: "+(isKU()?"Aktiv":"Inaktiv")+"</div>"+
    "</div>"+
  "</div>"+
  "<div class='ang-toggle-row'"+(a.mwst0?" ang-tog-on":"")+" data-tog='angMwst0Cb'>"+
    "<div class='ang-tog-box'>"+
      "<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
    "</div>"+
    "<div class='ang-tog-info'>"+
      "<div class='ang-tog-nm'>Steuerfreie Leistung (0% MwSt.)</div>"+
      "<div class='ang-tog-sub'>Fuer spezielle steuerbefreite Auftraege.</div>"+
    "</div>"+
  "</div>"+
"</div>"+

"<div class='ang-card-btns'>"+
  "<button class='ang-btn ang-btn-pri ang-btn-sm' id='angSaveMid'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='20 6 9 17 4 12'/></svg>"+
    " Angebot speichern"+
  "</button>"+
  "<button class='ang-btn ang-btn-sec ang-btn-sm' id='angProjBtnMid'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M2 20h20M5 20V8l7-5 7 5v12M9 20v-5h6v5'/></svg>"+
    " Projekt aus Angebot"+
  "</button>"+
"</div>"+


"</div>"+

// –– ANSCHREIBEN ––
"<div class='ang-card' id='angCardAnschreiben'>"+
"<div class='ang-card-hd'>"+
"<span class='ang-card-stripe'></span>"+
"<span class='ang-card-title'>Anschreiben</span>"+
"</div>"+
"<textarea id='angAnschreiben' class='ang-input ang-textarea' rows='6' placeholder='Sehr geehrte Damen und Herren, hiermit unterbreiten wir Ihnen unser Angebot...'>"+esc(a.anschreiben||"")+"</textarea>"+
"<div class='ang-vorl-row'>"+
"<select id='angAnschreibenVorl' class='ang-input ang-vorl-sel'>"+anschVorlagen+"</select>"+
"</div>"+
"<div class='ang-vorl-btns'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angAnschEinfuegen'>Text einfuegen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angAnschSpeichern'>Vorlage speichern</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' id='angAnschLoeschen'>Vorlage loeschen</button>"+
"</div>"+
"</div>"+

// –– POSITIONEN ––
"<div class='ang-card' id='angCardPositionen'>"+
"<div class='ang-card-hd'>"+
"<span class='ang-card-stripe'></span>"+
"<span class='ang-card-title'>Positionen</span>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angAddEigene' style='margin-left:auto'>+ Eigene</button>"+
"</div>"+
"<div id='angPosListe'>"+posHTML+"</div>"+
sumHTML+


// Katalog
"<div class='ang-kat-section'>"+
  "<div class='ang-lbl' style='margin-bottom:8px'>AUS KATALOG HINZUFUEGEN</div>"+
  "<div class='ang-kat-srch-wrap'>"+
    "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' style='position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#94a3b8;pointer-events:none'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>"+
    "<input id='angKatSrch' class='ang-input ang-kat-srch' type='text' placeholder='Leistung suchen...' value='"+esc(ANG.katSrch)+"'>"+
  "</div>"+
  "<div class='ang-kat-tabs'>"+katTabs+"</div>"+
  "<div class='ang-kat-liste' id='angKatListe'>"+katItems+"</div>"+
"</div>"+


"</div>"+

// –– SCHLUSSTEXT ––
"<div class='ang-card' id='angCardSchlusstext'>"+
"<div class='ang-card-hd'>"+
"<span class='ang-card-stripe'></span>"+
"<span class='ang-card-title'>Schlusstext</span>"+
"</div>"+
"<div class='ang-lbl' style='margin-bottom:6px'>ANGEBOTS-SCHLUSSTEXT (OPTIONAL)</div>"+
"<textarea id='angSchlusstext' class='ang-input ang-textarea' rows='4' placeholder='z.B. Mit freundlichen Gruessen...'>"+esc(a.schlusstext||"")+"</textarea>"+
"<div class='ang-vorl-row'>"+
"<select id='angSchlusstextVorl' class='ang-input ang-vorl-sel'>"+schlusVorlagen+"</select>"+
"</div>"+
"<div class='ang-vorl-btns'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angSchlusUebernehmen'>Uebernehmen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angSchlusEinfuegen'>Einfuegen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='angSchlusVorlSpeichern'>Als Vorlage speichern</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' id='angSchlusLoeschen'>Loeschen</button>"+
"</div>"+
"<div class='ang-tipp'>Tipp: Perfekt fuer Dankeszeilen, Ausfuehrungs-/Termin-Hinweise, Gewaehrleistungs-Hinweise oder einen kurzen Abschluss.</div>"+


// Abschliessende Action-Buttons (wie in Screenshot unten)
"<div class='ang-card-btns'>"+
  "<button class='ang-btn ang-btn-sec ang-btn-sm' id='angPdfBtnBot'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>"+
    " PDF"+
  "</button>"+
  "<button class='ang-btn ang-btn-sec ang-btn-sm' id='angMailBtn'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,13 2,6'/></svg>"+
    " Mail"+
  "</button>"+
  "<button class='ang-btn ang-btn-sec ang-btn-sm' id='angUnterschriftBtnBot'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/></svg>"+
    " Unterschrift"+
  "</button>"+
  "<button class='ang-btn ang-btn-pri ang-btn-sm ang-save-main' id='angSaveBot'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='20 6 9 17 4 12'/></svg>"+
    " Angebot speichern"+
  "</button>"+
  "<button class='ang-btn ang-btn-sec ang-btn-sm' id='angProjBtnBot'>"+
    "<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M2 20h20M5 20V8l7-5 7 5v12M9 20v-5h6v5'/></svg>"+
    " Projekt erzeugen"+
  "</button>"+
"</div>"+


"</div>"+

"</div>"; // ang-scroll-body

// –– ALLE EVENTS VERDRAHTEN ––
angBindEvents();
}

function angBindEvents(){
var a=ANG.current;

// – Action-Bar –
var bind=function(id,fn){ var e=el(id); if(e) e.onclick=fn; };

bind("angBackBtn",    function(){ navTo("a"); });
bind("angSaveBtn2",   angSave);
bind("angSaveMid",    angSave);
bind("angSaveBot",    angSave);
bind("angPdfBtn2",    function(){ angPDF(ANG.current); });
bind("angPdfBtnBot",  function(){ angPDF(ANG.current); });
bind("angVorschauBtn",function(){
// Kein angSyncAll() - wuerde Felder leeren die nicht im aktuellen Tab sind
// Stattdessen: Felder die IM DOM sind, direkt lesen
var safe_f=function(id){ var e=document.getElementById(id); return e?e.value:""; };
if(safe_f("angNummer")) ANG.current.nummer=safe_f("angNummer");
if(safe_f("angAnschreiben")) ANG.current.anschreiben=safe_f("angAnschreiben");
if(safe_f("angSchlusstext")) ANG.current.schlusstext=safe_f("angSchlusstext");
ANG.vorschauOffen=!ANG.vorschauOffen;
// Vorschau-Modal oeffnen (zuverlaessiger als DOM-Manipulation)
if(ANG.vorschauOffen){
var pc=document.getElementById("prevContent");
if(pc) pc.innerHTML=buildAngVorschauInline(ANG.current);
var mo_el=document.getElementById("m-prev");
if(mo_el) mo_el.classList.add("open");
} else {
var mc_el=document.getElementById("m-prev");
if(mc_el) mc_el.classList.remove("open");
}
});
bind("angUnterschriftBtn",   function(){ angOpenSig(); });
bind("angUnterschriftBtnBot",function(){ angOpenSig(); });
bind("angMailBtn",    function(){ toast("Mail-Funktion folgt"); });
bind("angProjBtn",    angProjektErzeugen);
bind("angProjBtnMid", angProjektErzeugen);
bind("angProjBtnBot", angProjektErzeugen);

// – Kunden-Autofill –
var ks=el("angKundeSelect");
if(ks) ks.onchange=function(){
var k=DB.kunden().find(function(x){ return x.id===this.value; },this);
if(k){
var adr=[k.str,k.plz&&k.ort?k.plz+" "+k.ort:""].filter(Boolean).join(", ");
var ainp=el("angAnschrift");
if(ainp){ ainp.value=adr; }
}
angSyncAll();
};

// – Live-Sync alle Eingaben –
["angAnsprechpartner","angAnschrift","angObjekt","angDatum","angNummer","angRabatt"]
.forEach(function(id){
var e=el(id); if(e) e.addEventListener("input",function(){ angSyncAll(); angRefreshSummen(); });
});
var stSel=el("angStatus"); if(stSel) stSel.onchange=function(){ angSyncAll(); };

// Zahlungsbedingungen
// Toggle-Kacheln: ganzer Bereich tippbar
function bindTog(tid, onFn, offFn){
var row=document.querySelector("[data-tog='"+tid+"']");
if(!row) return;
row.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-ku-on")||this.classList.contains("ang-tog-m0-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){ this.classList.add("ang-tog-on"); if(onFn)onFn(); }
else{ if(offFn)offFn(); }
angSyncAll(); angRefreshSummen();
};
}
bindTog("angAnzahlungCb",
function(){ ANG.current.anzahlung=true;  var d=el("angAnzahlungDetail"); if(d)d.style.display="block"; },
function(){ ANG.current.anzahlung=false; var d=el("angAnzahlungDetail"); if(d)d.style.display="none";  }
);
bindTog("angSkontoCb",
function(){ ANG.current.skonto=true;  var d=el("angSkontoDetail"); if(d)d.style.display="block"; },
function(){ ANG.current.skonto=false; var d=el("angSkontoDetail"); if(d)d.style.display="none";  }
);
bindTog("angEstgCb",
function(){ ANG.current.estg=true;  },
function(){ ANG.current.estg=false; }
);
// KU-Toggle: gruener Stil, schaltet M0 aus
var kuRow=document.querySelector("[data-tog='angKuCb']");
if(kuRow) kuRow.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-ku-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){
this.classList.add("ang-tog-ku-on");
ANG.current.kuOverride=true; ANG.current.mwst0=false;
var m0r=document.querySelector("[data-tog='angMwst0Cb']");
if(m0r) m0r.classList.remove("ang-tog-on","ang-tog-m0-on");
} else { ANG.current.kuOverride=false; }
angSyncAll(); angRefreshSummen();
};
// M0-Toggle: oranger Stil, schaltet KU aus
var m0Row=document.querySelector("[data-tog='angMwst0Cb']");
if(m0Row) m0Row.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-m0-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){
this.classList.add("ang-tog-m0-on");
ANG.current.mwst0=true; ANG.current.kuOverride=false;
var kur=document.querySelector("[data-tog='angKuCb']");
if(kur) kur.classList.remove("ang-tog-on","ang-tog-ku-on");
} else { ANG.current.mwst0=false; }
angSyncAll(); angRefreshSummen();
};
["angAnzahlungProz","angSkontoText"].forEach(function(id){
var e=el(id); if(e) e.addEventListener("input",function(){ angSyncAll(); });
});

// Textfelder
var ae=el("angAnschreiben"); if(ae) ae.oninput=function(){ ANG.current.anschreiben=this.value; };
var st=el("angSchlusstext"); if(st) st.oninput=function(){ ANG.current.schlusstext=this.value; };

// – Vorlagen Anschreiben –
bind("angAnschEinfuegen", function(){
var sel=el("angAnschreibenVorl"); if(!sel||!sel.value) return;
var v=DB.vorlagen().find(function(x){ return x.id===sel.value; });
if(v){ var ta=el("angAnschreiben"); if(ta){ta.value=v.text;ANG.current.anschreiben=v.text;} toast("Vorlage eingefuegt"); }
});
bind("angAnschSpeichern", function(){
var ta=el("angAnschreiben"); if(!ta||!ta.value.trim()){ toast("Kein Text",true); return; }
var nm=prompt("Name der Vorlage:"); if(!nm) return;
var V2=DB.vorlagen(); V2.push({id:uid(),typ:"anschreiben",name:nm,text:ta.value});
DB.sVorlagen(V2); toast("Vorlage gespeichert"); renderAngEditor();
});
bind("angAnschLoeschen", function(){
var sel=el("angAnschreibenVorl"); if(!sel||!sel.value) return;
if(!confirm("Vorlage loeschen?")) return;
DB.sVorlagen(DB.vorlagen().filter(function(v){ return v.id!==sel.value; }));
toast("Vorlage geloescht"); renderAngEditor();
});

// – Vorlagen Schlusstext –
bind("angSchlusUebernehmen", function(){
var sel=el("angSchlusstextVorl"); if(!sel||!sel.value) return;
var v=DB.vorlagen().find(function(x){ return x.id===sel.value; });
if(v){ var ta=el("angSchlusstext"); if(ta){ta.value=v.text;ANG.current.schlusstext=v.text;} toast("Uebernommen"); }
});
bind("angSchlusEinfuegen", function(){
var sel=el("angSchlusstextVorl"); if(!sel||!sel.value) return;
var v=DB.vorlagen().find(function(x){ return x.id===sel.value; });
if(v){ var ta=el("angSchlusstext");
if(ta){ ta.value=(ta.value?ta.value+"\n":"")+v.text; ANG.current.schlusstext=ta.value; } toast("Eingefuegt"); }
});
bind("angSchlusVorlSpeichern", function(){
var ta=el("angSchlusstext"); if(!ta||!ta.value.trim()){ toast("Kein Text",true); return; }
var nm=prompt("Name der Vorlage:"); if(!nm) return;
var V2=DB.vorlagen(); V2.push({id:uid(),typ:"schlusstext",name:nm,text:ta.value});
DB.sVorlagen(V2); toast("Vorlage gespeichert"); renderAngEditor();
});
bind("angSchlusLoeschen", function(){
var ta=el("angSchlusstext"); if(!ta) return;
ta.value=""; ANG.current.schlusstext=""; toast("Text geloescht");
});

// – Positionen –
bind("angAddEigene", function(){
if(!ANG.current.positionen) ANG.current.positionen=[];
ANG.current.positionen.push({id:uid(),name:"Neue Position",einh:"m2",menge:1,ep:0,gruppe:"Allgemein"});
renderAngEditor();
});

// Inline-Editing Menge/EP
document.querySelectorAll(".ang-pos-menge,.ang-pos-ep").forEach(function(inp){
inp.addEventListener("input", function(){
var idx=parseInt(this.getAttribute("data-posidx"));
var p=ANG.current.positionen[idx]; if(!p) return;
if(this.classList.contains("ang-pos-menge")) p.menge=parseFloat(this.value)||0;
if(this.classList.contains("ang-pos-ep"))    p.ep   =parseFloat(this.value)||0;
var row=this.closest(".ang-pos-row");
if(row){ var gp=row.querySelector(".ang-pos-gp"); if(gp) gp.textContent=eur(p.menge*p.ep); }
angRefreshSummen();
});
});

// Position loeschen
document.querySelectorAll("[data-delpos]").forEach(function(b){
b.onclick=function(e){
e.stopPropagation();
ANG.current.positionen.splice(parseInt(this.getAttribute("data-delpos")),1);
renderAngEditor();
};
});

// – Katalog –
var kat=el("angKatSrch");
if(kat){
kat.oninput=function(){ ANG.katSrch=this.value; angRefreshKatalog(); };
if(ANG.katSrch) setTimeout(function(){ var e=el("angKatSrch"); if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length);} },80);
}
document.querySelectorAll("[data-katf]").forEach(function(b){
b.onclick=function(){ ANG.katFilter=this.getAttribute("data-katf"); angRefreshKatalog(); };
});
document.querySelectorAll(".ang-kat-add").forEach(function(b){
b.addEventListener("click",function(e){
e.stopPropagation();
angAddKatalogPos(this.getAttribute("data-katid"));
});
});
}

// Nur Summen-Block refresh (ohne komplettes Re-Render)
function angRefreshSummen(){
var s=angSummen(ANG.current); var a=ANG.current; var ku=s.ku;
var sm=document.querySelector(".ang-summen-block");
if(sm){
sm.innerHTML=
"<div class='ang-sum-row'><span>Netto</span><span>"+eur(s.netto)+"</span></div>"+
(s.rabatt>0?"<div class='ang-sum-row'><span>Rabatt ("+a.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
"<div class='ang-sum-row'><span>"+(ku?"MwSt. (Par.19 UStG)":(s.mwst0?"0% Steuerfrei":"MwSt. 19%"))+"</span><span>"+eur(s.mwst)+"</span></div>"+
"<div class='ang-sum-row ang-sum-total'><span>Brutto</span><span>"+eur(s.brutto)+"</span></div>";
}
}

// Nur Katalog-Liste refresh
function angRefreshKatalog(){
var KAT=DB.katalog();
var katFilt=ANG.katSrch?KAT.filter(function(k){ return (k.name+k.text).toLowerCase().indexOf(ANG.katSrch.toLowerCase())>=0; }):KAT;
if(ANG.katFilter!=="alle") katFilt=katFilt.filter(function(k){ return k.kat===ANG.katFilter; });
var items=katFilt.slice(0,60).map(function(item){
return "<div class='ang-kat-item'>"+
"<div style='flex:1;min-width:0'>"+
"<div class='ang-kat-nm'>"+esc(item.name)+"</div>"+
"<div class='ang-kat-info'>"+esc(item.einh)+" · "+eur(item.preis)+"</div>"+
"</div>"+
"<button class='ang-kat-add' data-katid='"+esc(item.id)+"'>+</button>"+
"</div>";
}).join("")||"<div style='color:#94a3b8;padding:12px;font-size:13px;text-align:center'>Keine Treffer</div>";

var kl=el("angKatListe"); if(kl) kl.innerHTML=items;
// Tab-Klassen neu setzen
document.querySelectorAll("[data-katf]").forEach(function(b){
b.classList.toggle("ang-kat-tab-on", b.getAttribute("data-katf")===ANG.katFilter);
});
// Events neu binden
document.querySelectorAll(".ang-kat-add").forEach(function(b){
b.addEventListener("click",function(e){
e.stopPropagation(); angAddKatalogPos(this.getAttribute("data-katid"));
});
});
var ks=el("angKatSrch"); if(ks && ANG.katSrch){ ks.focus(); ks.setSelectionRange(ks.value.length,ks.value.length); }
}

function angSyncAll(){
var a=ANG.current;
var f=function(id){ var e=el(id); return e?e.value:""; };
var cb=function(id){ var e=el(id); return e?e.checked:false; };
var ks=el("angKundeSelect");
if(ks){
var k=DB.kunden().find(function(x){ return x.id===ks.value; });
a.kundeId=ks.value; a.kundeName=k?k.name:"";
}
a.ansprechpartner=f("angAnsprechpartner");
a.anschrift=f("angAnschrift"); a.objekt=f("angObjekt");
a.datum=f("angDatum"); a.nummer=f("angNummer");
a.status=f("angStatus"); a.rabatt=parseFloat(f("angRabatt"))||0;
a.anzahlung=cb("angAnzahlungCb"); a.anzahlungProz=f("angAnzahlungProz");
a.skonto=cb("angSkontoCb"); a.skontoText=f("angSkontoText");
// Toggle-States bereits in ANG.current gesetzt durch bindTog
a.anschreiben=f("angAnschreiben"); a.schlusstext=f("angSchlusstext");
}

function angAddKatalogPos(kid){
var item=DB.katalog().find(function(x){ return x.id===kid; });
if(!item){ toast("Nicht gefunden",true); return; }
if(!ANG.current.positionen) ANG.current.positionen=[];
var grpMap={maler:"Malerarbeiten",trockenbau:"Trockenbauarbeiten",putz:"Putz und Stuck",sonst:"Sonstiges"};
ANG.current.positionen.push({id:uid(),name:item.name,einh:item.einh,menge:1,ep:item.preis,gruppe:grpMap[item.kat]||"Allgemein",katId:item.id,text:item.text||""});
toast(item.name+" hinzugefuegt");
renderAngEditor();
setTimeout(function(){
var pl=el("angPosListe");
if(pl) pl.scrollIntoView({behavior:"smooth",block:"nearest"});
},100);
}

function angSave(){
angSyncAll();
var a=ANG.current; if(!a) return;
var s=angSummen(a); a.netto=s.nettoNachRab; a.mwst=s.mwst; a.brutto=s.brutto; a.geaendert=Date.now();
var alle=DB.ang2(); var idx=alle.findIndex(function(x){ return x.id===a.id; });
if(idx>=0) alle[idx]=a; else alle.push(a);
haptic("medium"); DB.sAng2(alle); toast("Angebot gespeichert");
}

function angProjektErzeugen(){
var a=ANG.current; if(!a){ toast("Kein Angebot",true); return; }
angSave();
toast("Projekt aus Angebot erstellt (folgt)");
}

// Eingebettete Vorschau (wie Screenshot)
function buildAngVorschauInline(a){
var s=DB.settings();var sum=angSummen(a);
var gb=a.datum?new Date(new Date(a.datum).getTime()+30*864e5).toLocaleDateString('de-DE'):'-';
var meta='<strong>Nr.:</strong> '+esc(a.nummer||'')+'<br><strong>Datum:</strong> '+(a.datum?new Date(a.datum).toLocaleDateString('de-DE'):'-')+'<br><strong>Gueltig bis:</strong> '+gb;
return _bHeader('Angebot',meta)+_bAddr(s,a.kundeName,a.anschrift,a.ansprechpartner)+'<div class="db"><div class="dtb"><h2>Angebot &ndash; '+esc(a.objekt||a.kundeName||'Malerarbeiten')+'</h2><span>'+esc(a.nummer||'')+'</span></div>'+(a.anschreiben?'<div class="danschr">'+esc(a.anschreiben)+'</div>':'')+_bPos(a.positionen||[])+'<div style="display:flex;justify-content:flex-end;border-top:2px solid #a8bcba">'+_bSum(sum,a)+'</div>'+(sum.ku?'<div class="ku-hw">Gem. &sect;19 UStG wird keine Umsatzsteuer berechnet.</div>':'')+_bKond({gueltigBis:gb,skonto:a.skonto&&a.skontoText?a.skontoText:null,anzahlung:a.anzahlung&&a.anzahlungProz?a.anzahlungProz+'% nach Auftragserteilung':null,estg:a.estg})+(a.schlusstext?'<div class="schluss">'+esc(a.schlusstext)+'</div>':'')+_bSig(s.inhaber||s.firma,a.kundeName,a.unterschrift)+'</div>'+_bFooter(a.nummer,s);
}


function angPDF(a){
if(!a){ toast("Kein Angebot",true); return; }
var s=DB.settings(); var sm=angSummen(a); var ku=sm.ku;
var pos=a.positionen||[]; var gruppen={};
pos.forEach(function(p){ var g=p.gruppe||"Allgemein"; if(!gruppen[g])gruppen[g]=[]; gruppen[g].push(p); });
var rows=""; var nr=0;
Object.keys(gruppen).forEach(function(grp){
rows+="<tr><td colspan='6' style='padding:7px 8px 4px;font-weight:700;font-size:11px;background:#f8fafc;color:#1e3a5f'>"+esc(grp)+"</td></tr>";
gruppen[grp].forEach(function(p){
nr++;
rows+="<tr><td style='padding:7px 8px;color:#888'>"+nr+"</td>"+
"<td style='padding:7px 8px'><strong>"+esc(p.name)+"</strong></td>"+
"<td style='padding:7px 8px;text-align:right'>"+esc(String(p.menge||1))+"</td>"+
"<td style='padding:7px 8px;text-align:center;color:#888'>"+esc(p.einh)+"</td>"+
"<td style='padding:7px 8px;text-align:right'>"+eur(p.ep||0)+"</td>"+
"<td style='padding:7px 8px;text-align:right;font-weight:700'>"+eur((p.menge||0)*(p.ep||0))+"</td></tr>";
});
});
var html="<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'>"+
"<title>Angebot "+esc(a.nummer||"")+"</title>"+
"<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e}"+
".pg{max-width:820px;margin:0 auto;padding:32px 40px}"+
".tb{background:#f4f4f8;padding:10px 20px;display:flex;gap:10px;margin-bottom:0}"+
".tb button{background:#1e3a5f;color:#fff;border:none;padding:8px 20px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer}"+
"table{width:100%;border-collapse:collapse}tr:nth-child(even){background:#f8fafc}"+
"th{background:#1e3a5f;color:#fff;padding:9px 8px;text-align:left;font-size:11px}"+
"@media print{.tb{display:none}}</style></head><body>"+
"<div class='tb'><button onclick='window.print()'>Drucken / Als PDF speichern</button></div>"+
"<div class='pg'>"+
"<div style='display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1e3a5f'>"+
"<div><div style='font-size:26px;font-weight:900;color:#1e3a5f'>"+esc(s.firma||"Workbase")+"</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.8;margin-top:6px'>"+esc(s.adr||"")+"<br>"+esc(s.tel||"")+
(s.mail?" • "+esc(s.mail):"")+
(ku?"<br>Kleinunternehmer gem. Par.19 UStG":(s.ust?"<br>USt-IdNr.: "+esc(s.ust):""))+"</div></div>"+
"<div style='text-align:right'>"+
"<div style='font-size:28px;font-weight:900;color:#1e3a5f'>ANGEBOT</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.9;margin-top:6px'>"+
"<strong>Nr.:</strong> "+esc(a.nummer||"")+"<br>"+
"<strong>Datum:</strong> "+(a.datum?new Date(a.datum).toLocaleDateString("de-DE"):"-")+"<br>"+
"<strong>Gueltig bis:</strong> "+(a.datum?new Date(new Date(a.datum).getTime()+30*864e5).toLocaleDateString("de-DE"):"-")+
"</div></div></div>"+
"<div style='display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px'>"+
"<div style='background:#f8fafc;border-radius:8px;padding:14px'>"+
"<div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px'>Auftraggeber</div>"+
"<div style='font-size:13px;font-weight:700'>"+esc(a.kundeName||"-")+"</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.7;margin-top:3px'>"+esc(a.anschrift||"")+"</div>"+
(a.ansprechpartner?"<div style='font-size:11px;color:#6b7280'>Ansp.: "+esc(a.ansprechpartner)+"</div>":"")+
"</div>"+
"<div style='background:#f8fafc;border-radius:8px;padding:14px'>"+
"<div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px'>Objekt</div>"+
"<div style='font-size:13px;font-weight:700'>"+esc(a.objekt||"-")+"</div>"+
"</div></div>"+
(a.anschreiben?"<div style='margin-bottom:20px;font-size:12px;line-height:1.7;white-space:pre-wrap'>"+esc(a.anschreiben)+"</div>":"")+
"<table style='margin-bottom:8px'><thead><tr>"+
"<th style='width:36px'>Pos.</th><th>Leistung</th>"+
"<th style='text-align:right;width:70px'>Menge</th>"+
"<th style='text-align:center;width:50px'>Einh.</th>"+
"<th style='text-align:right;width:90px'>EP netto</th>"+
"<th style='text-align:right;width:100px'>Gesamt</th>"+
"</tr></thead><tbody>"+rows+"</tbody></table>"+
"<div style='margin-left:auto;width:280px;margin-top:12px;margin-bottom:16px'>"+
(sm.rabatt>0?"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>Zwischensumme</span><span>"+eur(sm.netto)+"</span></div>":"")+
(sm.rabatt>0?"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#ef4444'><span>Rabatt ("+a.rabatt+"%)</span><span>-"+eur(sm.rabatt)+"</span></div>":"")+
"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>Netto</span><span>"+eur(sm.nettoNachRab)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>"+(ku?"MwSt. (Par.19)":"MwSt. 19%")+"</span><span>"+eur(sm.mwst)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:9px 0;font-size:16px;font-weight:900;border-top:2px solid #1e3a5f;margin-top:3px'><span>GESAMT</span><span>"+eur(sm.brutto)+"</span></div>"+
"</div>"+
(ku?"<div style='font-size:10px;color:#6b7280;margin-bottom:12px'>Gem. Par.19 UStG wird keine Umsatzsteuer berechnet.</div>":"")+
(a.skonto&&a.skontoText?"<div style='font-size:11px;color:#475569;margin-bottom:12px'>Skonto: "+esc(a.skontoText)+"</div>":"")+
(a.anzahlung&&a.anzahlungProz?"<div style='font-size:11px;color:#475569;margin-bottom:12px'>Anzahlung: "+esc(a.anzahlungProz)+"% nach Auftragserteilung.</div>":"")+
(a.estg?"<div style='font-size:11px;color:#475569;margin-bottom:12px'>Hinweis gem. Par.35a EStG: Handwerkerleistungen sind steuerlich absetzbar (20% der Lohnkosten, max. 1.200 EUR).</div>":"")+
(a.schlusstext?"<div style='margin-top:16px;font-size:12px;line-height:1.7;white-space:pre-wrap'>"+esc(a.schlusstext)+"</div>":"")+
"<div style='margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px'>"+
"<div style='border-top:1px solid #1e3a5f;padding-top:8px'>"+(a.unterschrift?"<img src='"+a.unterschrift+"' style='max-height:55px;display:block;margin-bottom:4px'>":"<div style='height:55px'></div>")+"<span style='font-size:10px;color:#6b7280'>Ort, Datum / Unterschrift Auftragnehmer</span></div>"+
"<div style='border-top:1px solid #1a1a2e;padding-top:6px;font-size:10px;color:#6b7280'>Ort, Datum / Unterschrift Auftraggeber</div>"+
"</div>"+
"</div></body></html>";

openPDF(html);
}

function angOpenSig(){
mo("m-sig");
setTimeout(function(){
var cv=el("sigCanvas"); if(!cv) return;
var dpr=window.devicePixelRatio||1;
var rect=cv.getBoundingClientRect();
cv.width=Math.round(rect.width*dpr)||540;
cv.height=Math.round(rect.height*dpr)||160;
cv.style.width=(cv.width/dpr)+"px"; cv.style.height=(cv.height/dpr)+"px";
var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
ctx.clearRect(0,0,cv.width/dpr,cv.height/dpr);
ctx.strokeStyle="#1e293b"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round";
cv._has=false;
var ph=el("sigPh"); if(ph) ph.style.display="block";
function getP(e){ var r=cv.getBoundingClientRect(); var s=e.touches?e.touches[0]:e; return {x:s.clientX-r.left,y:s.clientY-r.top}; }
cv.onmousedown=function(e){ cv._has=true; cv._draw=true; var p2=el("sigPh"); if(p2)p2.style.display="none"; var p=getP(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
cv.onmousemove=function(e){ if(!cv._draw) return; var p=getP(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
cv.onmouseup=cv.onmouseleave=function(){ cv._draw=false; };
cv.ontouchstart=function(e){ e.preventDefault(); cv._has=true; cv._draw=true; var p2=el("sigPh"); if(p2)p2.style.display="none"; var p=getP(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
cv.ontouchmove=function(e){ e.preventDefault(); if(!cv._draw)return; var p=getP(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
cv.ontouchend=function(){ cv._draw=false; };
},250);
}

function angDuplizieren(id){
var alle=DB.ang2(); var a=alle.find(function(x){ return x.id===id; });
if(!a){ toast("Nicht gefunden",true); return; }
var neu=JSON.parse(JSON.stringify(a));
neu.id=uid(); neu.nummer=genAngNr(); neu.status="entwurf"; neu.erstellt=Date.now();
alle.push(neu); DB.sAng2(alle); toast("Angebot dupliziert"); renderAngebote();
}

dlg("a","data-edita",function(id){ oAngEdit(id); });
dlg("a","data-vora",function(id){
var a=DB.ang2().find(function(x){ return x.id===id; }); if(!a) return;
var pc=el("prevContent"); if(pc) pc.innerHTML=buildAngVorschauInline(a);
mo("m-prev");
});
dlg("a","data-pdfa", function(id){ var a=DB.ang2().find(function(x){ return x.id===id; }); if(a) angPDF(a); });
dlg("a","data-dupa",  function(id){ angDuplizieren(id); });
dlg("a","data-dela",  function(id){
iosConfirm("Angebot loeschen?", function(){
DB.sAng2(DB.ang2().filter(function(x){ return x.id!==id; }));
haptic("error"); toast("Geloescht"); renderAngebote();
});
});

// ============================================================
// RECHNUNGSMODUL - Vollstaendige Erweiterung
// Gleiches Design wie Angebotsmodul
// ============================================================

// –– DB Erweiterung fuer neue Rechnungen ––
DB.rech2     = function(){ return this.g("mp_rech2"); };
DB.sRech2    = function(v){ this.s("mp_rech2",v); };
DB.ang2      = function(){ return this.g("mp_ang2"); };
DB.sAng2     = function(v){ this.s("mp_ang2",v); };

// –– State ––
function renderAngebote(){
var A=DB.ang2();
var empty=emptyState("<svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#38bdf8' stroke-width='1.5'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>","Noch keine Angebote","Erstelle dein erstes Angebot aus dem Katalog.","angNeuBtnEmpty","+ Erstes Angebot");
var cards=A.length===0?empty:A.slice().reverse().map(function(a){
var s=angSummen(a);
return "<div class='ang-karte'>"+
"<div class='ang-karte-top'>"+
"<div class='ang-karte-left'>"+
"<div class='ang-karte-nr'>"+esc(a.nummer||"")+"</div>"+
"<div class='ang-karte-kunde'>"+esc(a.kundeName||"-")+"</div>"+
(a.objekt?"<div class='ang-karte-obj'>"+esc(a.objekt)+"</div>":"")+
"<div class='ang-karte-dat'>"+fdat(a.datum)+"</div>"+
"</div>"+
"<div class='ang-karte-right'>"+
"<div class='ang-brutto'>"+eur(s.brutto)+"</div>"+
"<span class='ang-badge "+angStatusCls(a.status)+"'>"+angStatusLbl(a.status)+"</span>"+
"</div>"+
"</div>"+
"<div class='ang-karte-btns'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' data-edita='"+a.id+"'>Bearbeiten</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-vora='"+a.id+"'>Vorschau</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-pdfa='"+a.id+"'>PDF</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-dupa='"+a.id+"'>Duplizieren</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' style='background:rgba(34,197,94,.12);color:#16a34a;border:1px solid rgba(34,197,94,.25)' data-a2rech='"+a.id+"'>→ Rechnung</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' data-dela='"+a.id+"'>Loeschen</button>"+
"</div>"+
"</div>";
}).join("");
el("s-a").innerHTML=
"<div class='ph'><h1>Angebote</h1><p>"+A.length+" Eintraege</p></div>"+
"<div class='sb'>"+
"<button class='ang-btn ang-btn-pri ang-btn-full' id='angNeuBtn' style='margin-bottom:12px'>"+
"<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' style='margin-right:6px'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>"+
"Neues Angebot erstellen"+
"</button>"+
cards+
"</div>";
var nb=el("angNeuBtn"); if(nb) nb.onclick=function(){ oAngNeu(); };
}

function oAngebot(){
tmpLA={}; tmpKatA={};
var sel=el("aPrj");
if(sel) sel.innerHTML="<option value=''>Projekt waehlen</option>"+
DB.projekte().map(function(p){ return "<option value='"+p.id+"'>"+esc(p.name)+"</option>"; }).join("");
var afl=el("aFlBox"); if(afl) afl.style.display="none";
var all=el("aLL"); if(all) all.innerHTML="";
var aki=el("aKatI"); if(aki) aki.innerHTML="";
var akl=el("aKatL"); if(akl){ akl.innerHTML=""; akl.style.display="none"; }
sv("aNotTxt","");
var nb=el("aNotBody"); if(nb) nb.classList.remove("open");
var nt=el("aNotToggle"); if(nt) nt.classList.remove("open");
updateSums("aNt","aMw","aMwLbl","aBr",tmpLA);
mo("m-a");
}

var aNotToggle=el("aNotToggle");
if(aNotToggle) aNotToggle.onclick=function(){
this.classList.toggle("open");
var b=el("aNotBody"); if(b) b.classList.toggle("open");
};

var aPrjSel=el("aPrj");
if(aPrjSel) aPrjSel.onchange=function(){
var pid=this.value;
var p=pid?DB.projekte().find(function(x){ return x.id===pid; }):null;
var dm2=p?(p.raeume||[]).reduce(function(s,r){ return s+r.m2; },0):0;
LEI.forEach(function(l){ tmpLA[l.id]={on:tmpLA[l.id]?tmpLA[l.id].on:false,m2:dm2}; });
buildLeistungen("aLL",tmpLA,"aNt","aMw","aMwLbl","aBr");
rebuildKatI();
};

var aLL=el("aLL");
if(aLL) aLL.addEventListener("click",function(e){
var t=e.target.closest("[data-lei]"); if(!t) return;
var lid=t.getAttribute("data-lei");
toggleLEI(lid,tmpLA,"aNt","aMw","aMwLbl","aBr");
});

var aKatSrch="";
var aKatB=el("aKatB");
if(aKatB) aKatB.onclick=function(){
var kl=el("aKatL"); if(!kl) return;
if(kl.style.display==="block"){ kl.style.display="none"; aKatSrch=""; return; }
renderAKatPicker();
kl.style.display="block";
};

function renderAKatPicker(){
var kl=el("aKatL"); if(!kl) return;
var KAT=DB.katalog();
if(!KAT.length){ toast("Katalog ist leer",true); return; }
var filt = aKatSrch
? KAT.filter(function(i){ return (i.name+i.text).toLowerCase().includes(aKatSrch.toLowerCase()); })
: KAT;
var labs={maler:"Maler & Lack",trockenbau:"Trockenbau",putz:"Putz & Stuck",sonst:"Sonstiges"};
// Gruppiert nach kat
var byKat = {};
filt.forEach(function(item){
if(!byKat[item.kat]) byKat[item.kat]=[];
byKat[item.kat].push(item);
});
var listH = "";
Object.keys(labs).forEach(function(kat){
var items = byKat[kat]||[];
if(!items.length) return;
listH += "<div style='font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:0.6px;padding:8px 4px 4px'>"+labs[kat]+"</div>";
listH += items.map(function(item){
return "<div class='ki' data-adk='"+item.id+"' style='cursor:pointer;margin-bottom:7px'>" +
"<div class='ki-h'><div>" +
"<div class='ki-n'>"+esc(item.name)+"</div>" +
"<div class='ki-e'>"+esc(item.einh)+" \u00B7 "+eur(item.preis)+"</div>" +
"</div><div style='color:var(--acc);font-size:20px;font-weight:700;line-height:1'>+</div></div></div>";
}).join("");
});
if(!listH) listH="<div style='padding:12px;color:var(--mut);font-size:13px;text-align:center'>Keine Treffer</div>";
kl.innerHTML=
"<div style='position:sticky;top:0;background:var(--bg);padding-bottom:8px;z-index:1'>" +
"<div class='srch-w'>" +
"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>" +
"<input id='aKatSrchInp' type='text' placeholder='Katalog durchsuchen...' value='"+esc(aKatSrch)+"'>" +
"</div>" +
"</div>" +
"<div>"+listH+"</div>";
var si=el("aKatSrchInp");
if(si){
si.oninput=function(){ aKatSrch=this.value; renderAKatPicker(); };
if(aKatSrch){ si.focus(); si.setSelectionRange(si.value.length,si.value.length); }
}
}

var aKatLEl=el("aKatL");
if(aKatLEl) aKatLEl.addEventListener("click",function(e){
var t=e.target.closest("[data-adk]"); if(!t) return;
var item=DB.katalog().find(function(x){ return x.id===t.getAttribute("data-adk"); });
if(item){
tmpKatA[item.id]={item:item,menge:1};
rebuildKatI(); updateSums("aNt","aMw","aMwLbl","aBr",tmpLA);
toast(item.name+" hinzugefuegt");
}
});

el("aCan").onclick=function(){ mc("m-a"); };
el("aSav").onclick=function(){
var pid=(el("aPrj")||{}).value;
if(!pid){ toast("Projekt auswaehlen",true); return; }
var items=LEI.filter(function(l){ return tmpLA[l.id]&&tmpLA[l.id].on; })
.map(function(l){ var m2=tmpLA[l.id].m2||0; return{name:l.name,m2:m2,einh:"m2",einzelpreis:lp(l,m2).ges}; });
Object.keys(tmpKatA).forEach(function(kid){
var e=tmpKatA[kid]; items.push({name:e.item.name,m2:e.menge||1,einh:e.item.einh,einzelpreis:e.item.preis*(e.menge||1)});
});
if(!items.length){ toast("Mindestens eine Leistung auswaehlen",true); return; }
var netto=items.reduce(function(s,x){ return s+(x.einzelpreis||0); },0);
var ku=isKU(); var mw=ku?0:netto*0.19; var brutto=netto+mw;
var p=DB.projekte().find(function(x){ return x.id===pid; });
var k=p?DB.kunden().find(function(x){ return x.id===p.kid; }):null;
var A=DB.angebote();
var num="A-"+new Date().getFullYear()+"-"+String(A.length+1).padStart(3,"0");
A.push({id:uid(),titel:num,projektId:pid,kundeName:k?k.name:"",projName:p?p.name:"",
items:items,netto:netto,mwst:mw,brutto:brutto,ku:ku,notiz:gv("aNotTxt"),datum:Date.now()});
DB.sA(A); mc("m-a"); toast("Angebot gespeichert");
if(CS==="a") renderAngebote(); if(CS==="d") renderDash();
};

el("aPrevBtn").onclick=function(){
var pid=(el("aPrj")||{}).value;
if(!pid){ toast("Bitte Projekt auswaehlen",true); return; }
var items=LEI.filter(function(l){ return tmpLA[l.id]&&tmpLA[l.id].on; })
.map(function(l){ var m2=tmpLA[l.id].m2||0; return{name:l.name,m2:m2,einh:"m2",einzelpreis:lp(l,m2).ges}; });
Object.keys(tmpKatA).forEach(function(kid){
var e=tmpKatA[kid]; items.push({name:e.item.name,m2:e.menge||1,einh:e.item.einh,einzelpreis:e.item.preis*(e.menge||1)});
});
var netto=items.reduce(function(s,x){ return s+(x.einzelpreis||0); },0);
var ku=isKU(); var mw=ku?0:netto*0.19;
var p=DB.projekte().find(function(x){ return x.id===pid; });
var k=p?DB.kunden().find(function(x){ return x.id===p.kid; }):null;
var pc=el("prevContent");
if(pc) pc.innerHTML=buildDocHTML({
typ:"ANGEBOT",num:"(Vorschau)",datum:new Date().toLocaleDateString("de-DE"),
items:items,netto:netto,mwst:mw,brutto:netto+mw,ku:ku,
kundeName:k?k.name:"",projName:p?p.name:""
});
mc("m-a"); mo("m-prev");
};

// ============================================================
// RECHNUNGEN
// ============================================================
function statCls(s){
if(s==="bezahlt") return "bgg";
if(s==="storniert"||s==="gemahnt") return "bgr";
return "bgy";
}

