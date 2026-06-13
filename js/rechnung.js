var RECH = { current: null, vorschauOffen: false, katFilter: "alle", katSrch: "" };


// –– Rechnungsnummer generieren ––
function genRechNr(){
var alle = DB.rech2();
var jahr = new Date().getFullYear();
return "R-" + jahr + "-" + String(alle.length + 1).padStart(3,"0");
}

// –– Status ––
function rechStatusCls(s){
if(s === "bezahlt")   return "ang-badge-grn";
if(s === "gemahnt")   return "ang-badge-red";
if(s === "versendet") return "ang-badge-blu";
if(s === "storniert") return "ang-badge-red";
return "ang-badge-yel"; // offen
}
function rechStatusLbl(s){
return {offen:"Offen",versendet:"Versendet",bezahlt:"Bezahlt",
gemahnt:"Gemahnt",storniert:"Storniert"}[s]||"Offen";
}

// –– Rechnungs-Typ Labels ––
function rechTypLbl(t){
return {schluss:"Schlussrechnung",abschlag:"Abschlagsrechnung",
teil:"Teilrechnung",voraus:"Vorauszahlung"}[t]||"Schlussrechnung";
}

// –– Summen ––
function rechSummen(r){
var pos = r.positionen || [];
var rab = parseFloat(r.rabatt) || 0;
var netto = pos.reduce(function(s,p){
return s + (parseFloat(p.menge)||0) * (parseFloat(p.ep)||0);
},0);
var rabBetrag = netto * rab / 100;
var nNachRab = netto - rabBetrag;
var ku = r.kuOverride !== undefined ? r.kuOverride : isKU();
var mwst0 = !!r.mwst0;
// Abschlag/Vorauszahlung: Prozentsatz
var abschlagProz = (r.typ==="abschlag"||r.typ==="voraus") ? (parseFloat(r.abschlagProz)||30)/100 : 1;
var mwstSatz = (ku||mwst0) ? 0 : 0.19;
var mwst = nNachRab * mwstSatz * abschlagProz;
var nettoAbschlag = nNachRab * abschlagProz;
var brutto = nettoAbschlag + mwst;
// Skonto
var skontoProz = r.skonto ? (parseFloat(r.skontoProz)||2)/100 : 0;
var skontoBetrag = brutto * skontoProz;
// Offener Betrag (abzgl. Zahlungseingang)
var bezahlt = (r.zahlungen||[]).reduce(function(s,z){ return s+(parseFloat(z.betrag)||0); },0);
var offen = Math.max(0, brutto - bezahlt);
return {
netto:netto, rabatt:rabBetrag, nNachRab:nNachRab,
nettoAbschlag:nettoAbschlag, mwst:mwst, brutto:brutto,
ku:ku, mwst0:mwst0, mwstSatz:mwstSatz, abschlagProz:abschlagProz,
skontoProz:skontoProz, skontoBetrag:skontoBetrag,
bezahlt:bezahlt, offen:offen
};
}

// –– Faelligkeitsdatum berechnen ––
function faelligAm(datum, tage){
if(!datum) return "";
var d = new Date(datum);
d.setDate(d.getDate() + (parseInt(tage)||14));
return d.toISOString().slice(0,10);
}

// ============================================================
// LISTE
// ============================================================
function renderRechnungen(){
var R = DB.rech2();
// Summen: offen / bezahlt
var totOffen = 0, totBezahlt = 0;
R.forEach(function(r){
var s=rechSummen(r);
if(r.status==="bezahlt") totBezahlt+=s.brutto;
else if(r.status!=="storniert") totOffen+=s.brutto;
});

var empty = emptyState("<svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#38bdf8' stroke-width='1.5'><rect x='2' y='5' width='20' height='14' rx='2'/><path d='M2 10h20'/></svg>","Noch keine Rechnungen","Wandle ein Angebot um oder erstelle eine neue Rechnung.",null, null)

var cards = R.length===0 ? empty : R.slice().reverse().map(function(r){
var s = rechSummen(r);
var typLbl = rechTypLbl(r.typ);
var istFaellig = r.faellig && r.status==="offen" && new Date(r.faellig) < new Date();
return "<div class='ang-karte" + (istFaellig?" rech-faellig":"") + "'>"+
"<div class='ang-karte-top'>"+
"<div class='ang-karte-left'>"+
"<div class='ang-karte-nr'>"+esc(r.nummer||"")+"</div>"+
"<div class='ang-karte-kunde'>"+esc(r.kundeName||"-")+"</div>"+
(r.objekt?"<div class='ang-karte-obj'>"+esc(r.objekt)+"</div>":"")+
"<div class='ang-karte-obj' style='color:#94a3b8'>"+typLbl+"</div>"+
(r.von?"<div class='ang-karte-dat'>"+esc(r.von)+(r.bis?" bis "+esc(r.bis):"")+"</div>":"")+
"<div class='ang-karte-dat'>"+fdat(r.datum)+"</div>"+
(istFaellig?"<div style='font-size:11px;color:#ef4444;font-weight:600;margin-top:2px'>Faellig: "+fdat(r.faellig)+"</div>":"")+
"</div>"+
"<div class='ang-karte-right'>"+
"<div class='ang-brutto'>"+eur(s.brutto)+"</div>"+
(s.offen>0&&s.offen<s.brutto?"<div style='font-size:11px;color:#f59e0b;font-weight:600'>Offen: "+eur(s.offen)+"</div>":"")+
"<span class='ang-badge "+rechStatusCls(r.status)+"'>"+rechStatusLbl(r.status)+"</span>"+
(r.angNummer?"<div style='font-size:10px;color:#94a3b8;margin-top:3px'>aus "+esc(r.angNummer)+"</div>":"")+
"</div>"+
"</div>"+
"<div class='ang-karte-btns'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' data-editr='"+r.id+"'>Bearbeiten</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-vorr='"+r.id+"'>Vorschau</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-pdfr='"+r.id+"'>PDF</button>"+
(r.status==="offen"?"<button class='ang-btn ang-btn-sec ang-btn-sm rech-btn-zahlung' data-zahlr='"+r.id+"'>Zahlung</button>":"")+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-dupr='"+r.id+"'>Duplizieren</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' data-delr2='"+r.id+"'>Loeschen</button>"+
"</div>"+
"</div>";
}).join("");

el("s-r").innerHTML =
"<div class='ph'><h1>Rechnungen</h1><p>"+R.length+" Eintraege</p></div>"+
"<div class='sb'>"+
"<div class='rech-summary'>"+
"<div class='rech-sum-tile'><div class='rech-sum-lbl'>Offen</div><div class='rech-sum-val' style='color:#f59e0b'>"+eur(totOffen)+"</div></div>"+
"<div class='rech-sum-tile'><div class='rech-sum-lbl'>Bezahlt</div><div class='rech-sum-val' style='color:#22c55e'>"+eur(totBezahlt)+"</div></div>"+
"</div>"+
"<button class='ang-btn ang-btn-pri ang-btn-full' id='rechNeuBtn' style='margin-bottom:12px'>"+
"<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' style='margin-right:6px'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>"+
"Neue Rechnung erstellen"+
"</button>"+
cards+
"</div>";

var nb=el("rechNeuBtn"); if(nb) nb.onclick=function(){ oRechNeu(); };
}

// ============================================================
// EDITOR OEFFNEN
// ============================================================
function oRechNeu(vonAngebot){
var heute = new Date().toISOString().slice(0,10);
var r = {
id: uid(), nummer: genRechNr(),
kundeName:"", kundeId:"", ansprechpartner:"",
anschrift:"", objekt:"",
datum: heute,
faellig: faelligAm(heute, 14),
zahlungsziel: 14,
status: "offen",
typ: "schluss",
abschlagProz: 30,
rabatt: 0,
von: "", bis: "",
skonto: false, skontoProz: 2, skontoTage: 10,
kuOverride: isKU(), mwst0: false,
estg: false,
positionen: [],
zahlungen: [],
anschreiben: "", schlusstext: "",
angId: "", angNummer: "",
erstellt: Date.now()
};
if(vonAngebot){
// Aus Angebot uebernehmen
r.kundeId       = vonAngebot.kundeId||"";
r.kundeName     = vonAngebot.kundeName||"";
r.ansprechpartner = vonAngebot.ansprechpartner||"";
r.anschrift     = vonAngebot.anschrift||"";
r.objekt        = vonAngebot.objekt||"";
r.positionen    = JSON.parse(JSON.stringify(vonAngebot.positionen||[]));
r.rabatt        = vonAngebot.rabatt||0;
r.kuOverride    = vonAngebot.kuOverride!==undefined?vonAngebot.kuOverride:isKU();
r.mwst0         = vonAngebot.mwst0||false;
r.estg          = vonAngebot.estg||false;
r.skonto        = vonAngebot.skonto||false;
r.skontoText    = vonAngebot.skontoText||"";
r.angId         = vonAngebot.id||"";
r.angNummer     = vonAngebot.nummer||"";
r.anschreiben   = "Hiermit stellen wir Ihnen unsere Leistungen wie besprochen in Rechnung.";
r.schlusstext   = DB.settings().inhaber ? "Mit freundlichen Gruessen,\n\n"+DB.settings().inhaber : "";
}
RECH.current = r;
RECH.vorschauOffen = false;
navTo("rech-edit");
renderRechEditor();
}

function oRechEdit(id){
var r = DB.rech2().find(function(x){ return x.id===id; });
if(!r){ toast("Nicht gefunden",true); return; }
RECH.current = JSON.parse(JSON.stringify(r));
RECH.vorschauOffen = false;
navTo("rech-edit");
renderRechEditor();
}

// ============================================================
// RENDER EDITOR
// ============================================================
function renderRechEditor(){
var r = RECH.current; if(!r){ navTo("r"); return; }
var s = rechSummen(r);
var K = DB.kunden();
var A = DB.ang2(); // fuer Angebots-Verknuepfung

var kundeOpts = "<option value=''>– Kunde auswaehlen –</option>"+
K.map(function(k){ return "<option value='"+k.id+"'"+(k.id===r.kundeId?" selected":"")+">"+esc(k.name)+"</option>"; }).join("");

var angOpts = "<option value=''>– Aus Angebot erstellen (optional) –</option>"+
A.map(function(a){ return "<option value='"+a.id+"'"+(a.id===r.angId?" selected":"")+">"+esc(a.nummer)+" - "+esc(a.kundeName)+"</option>"; }).join("");

var V = DB.vorlagen();
var anschVorl = "<option value=''>– Vorlage auswaehlen –</option>"+
V.filter(function(v){ return v.typ==="anschreiben"; })
.map(function(v){ return "<option value='"+esc(v.id)+"'>"+esc(v.name)+"</option>"; }).join("");
var schlusVorl = "<option value=''>– Vorlage auswaehlen –</option>"+
V.filter(function(v){ return v.typ==="schlusstext"; })
.map(function(v){ return "<option value='"+esc(v.id)+"'>"+esc(v.name)+"</option>"; }).join("");

// Positionen HTML
var pos = r.positionen||[];
var gruppen = {};
pos.forEach(function(p){ var g=p.gruppe||"Allgemein"; if(!gruppen[g])gruppen[g]=[]; gruppen[g].push(p); });
var posHTML = "";
if(pos.length===0){
posHTML = "<div class='ang-pos-empty'>Noch keine Positionen.</div>";
} else {
posHTML += "<div class='ang-pos-header'><span class='ang-ph-pos'>Pos.</span><span class='ang-ph-leis'>Leistung</span><span class='ang-ph-menge'>Menge</span><span class='ang-ph-ep'>EP</span><span class='ang-ph-ges'>Gesamt</span><span style='width:28px'></span></div>";
var posNr=0;
Object.keys(gruppen).forEach(function(grp){
posHTML+="<div class='ang-grp-hd'>"+esc(grp)+"</div>";
gruppen[grp].forEach(function(p){
var gi=pos.indexOf(p); posNr++;
var gp=(parseFloat(p.menge)||0)*(parseFloat(p.ep)||0);
posHTML+=
"<div class='ang-pos-row'>"+
"<span class='ang-pos-nr'>"+posNr+"</span>"+
"<div class='ang-pos-bez'><div class='ang-pos-nm'>"+esc(p.name)+"</div><div class='ang-pos-sub'>"+esc(p.einh)+"</div></div>"+
"<input type='number' class='ang-pos-menge ang-input-sm' value='"+(p.menge||1)+"' min='0' step='0.01' data-posidx='"+gi+"'>"+
"<input type='number' class='ang-pos-ep ang-input-sm' value='"+(p.ep||0)+"' min='0' step='0.01' data-posidx='"+gi+"'>"+
"<div class='ang-pos-gp'>"+eur(gp)+"</div>"+
"<button class='ang-pos-del' data-delpos='"+gi+"'><svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>"+
"</div>";
});
});
}

// Zahlungseingaenge
var zahlenHTML = (r.zahlungen||[]).length===0
? "<div style='color:#94a3b8;font-size:13px;padding:8px 0'>Noch keine Zahlungen erfasst.</div>"
: (r.zahlungen||[]).map(function(z,i){
return "<div class='rech-zahlung-row'>"+
"<div class='rech-zahlung-info'>"+
"<span class='rech-zahlung-dat'>"+fdat(z.datum)+"</span>"+
(z.notiz?"<span class='rech-zahlung-notiz'>"+esc(z.notiz)+"</span>":"")+
"</div>"+
"<span class='rech-zahlung-betrag'>"+eur(z.betrag)+"</span>"+
"<button class='ang-pos-del' data-delz='"+i+"'><svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>"+
"</div>";
}).join("");

// Summen
var ku=s.ku, m0=s.mwst0;
var istAbschlag = r.typ==="abschlag"||r.typ==="voraus";
var sumHTML =
"<div class='ang-summen-block'>"+
(r.rabatt>0?"<div class='ang-sum-row'><span>Zwischensumme</span><span>"+eur(s.netto)+"</span></div>":"") +
(r.rabatt>0?"<div class='ang-sum-row'><span>Rabatt ("+r.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
(istAbschlag?"<div class='ang-sum-row'><span>"+rechTypLbl(r.typ)+" ("+r.abschlagProz+"%)</span><span>"+eur(s.nettoAbschlag)+"</span></div>":"")+
"<div class='ang-sum-row'><span>Netto</span><span>"+eur(s.nettoAbschlag)+"</span></div>"+
"<div class='ang-sum-row'><span>"+(ku?"MwSt. (Par.19 UStG)":m0?"MwSt. 0% (steuerfrei)":"MwSt. 19%")+"</span><span>"+eur(s.mwst)+"</span></div>"+
"<div class='ang-sum-row ang-sum-total'><span>Brutto</span><span>"+eur(s.brutto)+"</span></div>"+
(s.bezahlt>0?"<div class='ang-sum-row' style='color:#22c55e'><span>Bereits bezahlt</span><span>-"+eur(s.bezahlt)+"</span></div>":"")+
(s.bezahlt>0?"<div class='ang-sum-row ang-sum-total' style='color:"+(s.offen>0?"#f59e0b":"#22c55e")+"'><span>Offener Betrag</span><span>"+eur(s.offen)+"</span></div>":"")+
"</div>";

// Katalog
var KAT = DB.katalog();
var katTabs = ["alle","maler","trockenbau","putz","sonst"].map(function(k){
var lbl={alle:"Alle",maler:"Maler",trockenbau:"Trockenbau",putz:"Putz",sonst:"Sonstiges"}[k];
return "<button class='ang-kat-tab"+(RECH.katFilter===k?" ang-kat-tab-on":"")+"' data-rkatf='"+k+"'>"+lbl+"</button>";
}).join("");
var katFilt = RECH.katSrch?KAT.filter(function(i){ return (i.name+i.text).toLowerCase().indexOf(RECH.katSrch.toLowerCase())>=0; }):KAT;
if(RECH.katFilter!=="alle") katFilt=katFilt.filter(function(i){ return i.kat===RECH.katFilter; });
var katItems = katFilt.slice(0,60).map(function(item){
return "<div class='ang-kat-item'>"+
"<div style='flex:1;min-width:0'><div class='ang-kat-nm'>"+esc(item.name)+"</div>"+
"<div class='ang-kat-info'>"+esc(item.einh)+" · "+eur(item.preis)+"</div></div>"+
"<button class='ang-kat-add' data-rkatid='"+esc(item.id)+"'>+</button>"+
"</div>";
}).join("")||"<div style='color:#94a3b8;padding:12px;font-size:13px;text-align:center'>Keine Treffer</div>";

el("s-rech-edit").innerHTML =

// –– ACTION BAR ––
"<div class='ang-action-bar' id='rechActionBar'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn ang-back-sm' id='rechBackBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='rechVorschauBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>"+
" Vorschau"+
"</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm ang-ab-btn' id='rechPdfBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>"+
" PDF"+
"</button>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm ang-ab-btn ang-save-main' id='rechSaveBtn'>"+
"<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='20 6 9 17 4 12'/></svg>"+
" Speichern"+
"</button>"+
"</div>"+

"<div class='ang-scroll-body'>"+

// –– RAHMENDATEN ––
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#3b82f6'></span><span class='ang-card-title'>Rahmendaten</span></div>"+
"<div class='ang-form-grid'>"+
"<div class='ang-fg'><label class='ang-lbl'>Rechnungsnummer</label>"+
"<input id='rechNummer' class='ang-input' type='text' value='"+esc(r.nummer||"")+"' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Rechnungstyp</label>"+
"<select id='rechTyp' class='ang-input'>"+
"<option value='schluss'"+(r.typ==="schluss"?" selected":"")+">Schlussrechnung</option>"+
"<option value='abschlag'"+(r.typ==="abschlag"?" selected":"")+">Abschlagsrechnung</option>"+
"<option value='teil'"+(r.typ==="teil"?" selected":"")+">Teilrechnung</option>"+
"<option value='voraus'"+(r.typ==="voraus"?" selected":"")+">Vorauszahlung</option>"+
"</select></div>"+
(istAbschlag?
"<div class='ang-fg'><label class='ang-lbl'>Abschlag (%)</label>"+
"<input id='rechAbschlagProz' class='ang-input' type='number' min='1' max='100' step='5' value='"+(r.abschlagProz||30)+"'></div>":"")+
"<div class='ang-fg'><label class='ang-lbl'>Status</label>"+
"<select id='rechStatus' class='ang-input'>"+
"<option value='offen'"+(r.status==="offen"?" selected":"")+">Offen</option>"+
"<option value='versendet'"+(r.status==="versendet"?" selected":"")+">Versendet</option>"+
"<option value='bezahlt'"+(r.status==="bezahlt"?" selected":"")+">Bezahlt</option>"+
"<option value='gemahnt'"+(r.status==="gemahnt"?" selected":"")+">Gemahnt</option>"+
"<option value='storniert'"+(r.status==="storniert"?" selected":"")+">Storniert</option>"+
"</select></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Kunde</label>"+
"<select id='rechKundeSelect' class='ang-input'>"+kundeOpts+"</select></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Ansprechpartner</label>"+
"<input id='rechAnsprechpartner' class='ang-input' type='text' placeholder='z.B. Herr Mustermann' value='"+esc(r.ansprechpartner||"")+"' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Anschrift</label>"+
"<input id='rechAnschrift' class='ang-input' type='text' placeholder='Strasse, PLZ Ort' value='"+esc(r.anschrift||"")+"' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Objekt / Projekt</label>"+
"<input id='rechObjekt' class='ang-input' type='text' placeholder='z.B. EFH Musterstrasse' value='"+esc(r.objekt||"")+"' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Rechnungsdatum</label>"+
"<input id='rechDatum' class='ang-input' type='date' value='"+esc(r.datum||"")+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Faellig am</label>"+
"<input id='rechFaellig' class='ang-input' type='date' value='"+esc(r.faellig||"")+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Zahlungsziel (Tage)</label>"+
"<input id='rechZahlungsziel' class='ang-input' type='number' min='0' step='1' value='"+(r.zahlungsziel||14)+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Rabatt (%)</label>"+
"<input id='rechRabatt' class='ang-input' type='number' min='0' max='100' step='0.5' value='"+(r.rabatt||0)+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Leistungszeitraum von</label>"+
"<input id='rechVon' class='ang-input' type='date' value='"+esc(r.von||"")+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Leistungszeitraum bis</label>"+
"<input id='rechBis' class='ang-input' type='date' value='"+esc(r.bis||"")+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Aus Angebot</label>"+
"<select id='rechAngSel' class='ang-input'>"+angOpts+"</select></div>"+
"</div>"+

// Zahlungsbedingungen
"<div class='ang-zahlung-section' style='margin-top:14px'>"+
"<div class='ang-zahlung-title'>ZAHLUNGSBEDINGUNGEN & STEUER</div>"+
rechTogKachel("rechSkontoCb", r.skonto, "Skonto gewaehren","Wird im PDF und Zahlungsaufforderung erwaehnt.")+
"<div id='rechSkontoDetail' style='display:"+(r.skonto?"block":"none")+";padding:4px 0 10px 14px'>"+
"<div class='row2'><div class='ang-fg'><label class='ang-lbl'>Skonto (%)</label>"+
"<input id='rechSkontoProz' class='ang-input' type='number' min='0' step='0.5' value='"+(r.skontoProz||2)+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Bei Zahlung innerhalb (Tage)</label>"+
"<input id='rechSkontoTage' class='ang-input' type='number' min='0' step='1' value='"+(r.skontoTage||10)+"'></div></div>"+
"</div>"+
rechTogKachel("rechEstgCb", r.estg, "Hinweis §35a EStG", "Optionaler Hinweis fuer Privatkunden im PDF.")+
"<div class='ang-divider'></div>"+
"<div class='ang-zahlung-title' style='margin-top:10px;margin-bottom:8px'>MEHRWERTSTEUER</div>"+
rechTogKachel("rechKuCb", r.kuOverride!==undefined?r.kuOverride:isKU(),
"Kleinunternehmer gem. §19 UStG (0% MwSt.)",
"Pflichthinweis im PDF. Globale Einstellung: "+(isKU()?"Aktiv":"Inaktiv"),
"ang-tog-ku-on")+
rechTogKachel("rechMwst0Cb", r.mwst0, "Steuerfreie Leistung (0% MwSt.)",
"Fuer spezielle steuerbefreite Auftraege.", "ang-tog-m0-on")+
"</div>"+

"<div class='ang-card-btns'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='rechSaveMid'>"+
"<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='20 6 9 17 4 12'/></svg>"+
" Rechnung speichern</button>"+
"</div>"+
"</div>"+

// –– POSITIONEN ––
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#3b82f6'></span>"+
"<span class='ang-card-title'>Positionen</span>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechAddEigene' style='margin-left:auto'>+ Eigene</button>"+
"</div>"+
"<div id='rechPosListe'>"+posHTML+"</div>"+
sumHTML+
"<div class='ang-kat-section'>"+
"<div class='ang-lbl' style='margin-bottom:8px'>AUS KATALOG HINZUFUEGEN</div>"+
"<div class='ang-kat-srch-wrap'>"+
"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' style='position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#94a3b8;pointer-events:none'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>"+
"<input id='rechKatSrch' class='ang-input ang-kat-srch' type='text' placeholder='Leistung suchen...' value='"+esc(RECH.katSrch||"")+"'>"+
"</div>"+
"<div class='ang-kat-tabs'>"+katTabs+"</div>"+
"<div class='ang-kat-liste' id='rechKatListe'>"+katItems+"</div>"+
"</div>"+
"</div>"+

// –– ANSCHREIBEN ––
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#3b82f6'></span><span class='ang-card-title'>Anschreiben / Begleittext</span></div>"+
"<textarea id='rechAnschreiben' class='ang-input ang-textarea' rows='5' placeholder='Sehr geehrte Damen und Herren,...'>"+esc(r.anschreiben||"")+"</textarea>"+
"<div class='ang-vorl-row'><select id='rechAnschVorl' class='ang-input ang-vorl-sel'>"+anschVorl+"</select></div>"+
"<div class='ang-vorl-btns'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechAnschEinfuegen'>Text einfuegen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechAnschSpeichern'>Als Vorlage</button>"+
"</div>"+
"</div>"+

// –– SCHLUSSTEXT ––
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#3b82f6'></span><span class='ang-card-title'>Schlusstext</span></div>"+
"<textarea id='rechSchlusstext' class='ang-input ang-textarea' rows='4' placeholder='Mit freundlichen Gruessen,...'>"+esc(r.schlusstext||"")+"</textarea>"+
"<div class='ang-vorl-row'><select id='rechSchlusVorl' class='ang-input ang-vorl-sel'>"+schlusVorl+"</select></div>"+
"<div class='ang-vorl-btns'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechSchlusEinfuegen'>Text einfuegen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechSchlusSpeichern'>Als Vorlage</button>"+
"</div>"+
"</div>"+

// –– ZAHLUNGSEINGAENGE ––
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#22c55e'></span><span class='ang-card-title'>Zahlungseingaenge</span></div>"+
"<div id='rechZahlListe'>"+zahlenHTML+"</div>"+
"<div class='rech-zahlung-form'>"+
"<div class='ang-form-grid'>"+
"<div class='ang-fg'><label class='ang-lbl'>Datum</label>"+
"<input id='rechZDat' class='ang-input' type='date' value='"+new Date().toISOString().slice(0,10)+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Betrag (EUR)</label>"+
"<input id='rechZBetrag' class='ang-input' type='number' min='0' step='0.01' placeholder='0.00'></div>"+
"</div>"+
"<div class='ang-fg'><label class='ang-lbl'>Notiz (optional)</label>"+
"<input id='rechZNotiz' class='ang-input' type='text' placeholder='z.B. Ueberweisung' autocomplete='off'></div>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechZahlAddBtn' style='margin-top:6px'>+ Zahlung erfassen</button>"+
"</div>"+
"</div>"+

// –– ABSCHLUSS BUTTONS ––
"<div class='ang-card-btns' style='padding:0 0 8px'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='rechPdfBtnBot'>"+
"<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>"+
" PDF</button>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm ang-save-main' id='rechSaveBot'>"+
"<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='20 6 9 17 4 12'/></svg>"+
" Rechnung speichern</button>"+
"</div>"+

"</div>"; // ang-scroll-body

rechBindEvents();
}

// Toggle-Kachel fuer Rechnung (gleiche Optik wie Angebot)
function rechTogKachel(id, isOn, nm, sub, extraCls){
var on = isOn;
var cls = on ? (" ang-tog-on"+(extraCls?" "+extraCls:"")) : "";
return "<div class='ang-toggle-row'"+cls+" data-rtog='"+id+"'>"+
"<div class='ang-tog-box'>"+
"<svg class='ang-tog-check' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3'><polyline points='20 6 9 17 4 12'/></svg>"+
"</div>"+
"<div class='ang-tog-info'>"+
"<div class='ang-tog-nm'>"+nm+"</div>"+
"<div class='ang-tog-sub'>"+sub+"</div>"+
"</div>"+
"</div>";
}

// ============================================================
// BIND EVENTS
// ============================================================
function rechBindEvents(){
var r = RECH.current;
var bind = function(id,fn){ var e=el(id); if(e) e.onclick=fn; };

bind("rechBackBtn",   function(){ navTo("r"); });
bind("rechSaveBtn",   rechSave);
bind("rechSaveMid",   rechSave);
bind("rechSaveBot",   rechSave);
bind("rechPdfBtn",    function(){ rechPDF(RECH.current); });
bind("rechPdfBtnBot", function(){ rechPDF(RECH.current); });
bind("rechVorschauBtn", function(){
RECH.vorschauOffen = !RECH.vorschauOffen;
rechSyncAll();
if(RECH.vorschauOffen){
var pc=el("prevContent");
if(pc) pc.innerHTML = rechVorschauHTML(RECH.current);
mo("m-prev");
} else { mc("m-prev"); }
});

// Kunden-Autofill
var ks=el("rechKundeSelect");
if(ks) ks.onchange=function(){
var k=DB.kunden().find(function(x){ return x.id===this.value; },this);
if(k){
var ai=el("rechAnschrift");
var adr=[k.str,k.plz&&k.ort?k.plz+" "+k.ort:""].filter(Boolean).join(", ");
if(ai&&!ai.value) ai.value=adr;
}
rechSyncAll(); rechRefreshSummen();
};

// Aus Angebot laden
var angSel=el("rechAngSel");
if(angSel) angSel.onchange=function(){
var a=DB.ang2().find(function(x){ return x.id===this.value; },this);
if(a){
r.positionen=JSON.parse(JSON.stringify(a.positionen||[]));
r.rabatt=a.rabatt||0; r.angId=a.id; r.angNummer=a.nummer||"";
r.kundeName=a.kundeName||""; r.kundeId=a.kundeId||"";
r.anschrift=a.anschrift||""; r.objekt=a.objekt||"";
toast("Positionen aus "+esc(a.nummer)+" uebernommen");
rechSyncAll(); renderRechEditor();
}
};

// Datum -> Faelligkeit auto
var datEl=el("rechDatum"), ziEl=el("rechZahlungsziel"), faEl=el("rechFaellig");
function updateFaellig(){
var d=gv("rechDatum"), z=gv("rechZahlungsziel");
if(d&&z){ var f=faelligAm(d,z); if(faEl) faEl.value=f; rechSyncAll(); }
}
if(datEl) datEl.addEventListener("change",updateFaellig);
if(ziEl)  ziEl.addEventListener("change",updateFaellig);

// Typ -> Abschlag-Feld anzeigen
var typEl=el("rechTyp");
if(typEl) typEl.onchange=function(){ rechSyncAll(); renderRechEditor(); };

// Live-Sync
["rechNummer","rechAnsprechpartner","rechAnschrift","rechObjekt",
"rechDatum","rechFaellig","rechZahlungsziel","rechRabatt","rechVon","rechBis",
"rechAbschlagProz","rechSkontoProz","rechSkontoTage"].forEach(function(id){
var e=el(id); if(e) e.addEventListener("input",function(){ rechSyncAll(); rechRefreshSummen(); });
});
var stEl=el("rechStatus"); if(stEl) stEl.onchange=function(){ rechSyncAll(); };

// Toggle-Kacheln
function bindRechTog(tid, onFn, offFn){
var row=document.querySelector("[data-rtog='"+tid+"']"); if(!row) return;
row.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-ku-on")||this.classList.contains("ang-tog-m0-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){ this.classList.add("ang-tog-on"); if(onFn)onFn(); } else { if(offFn)offFn(); }
rechSyncAll(); rechRefreshSummen();
};
}
bindRechTog("rechSkontoCb",
function(){ r.skonto=true;  var d=el("rechSkontoDetail"); if(d)d.style.display="block"; },
function(){ r.skonto=false; var d=el("rechSkontoDetail"); if(d)d.style.display="none";  }
);
bindRechTog("rechEstgCb",
function(){ r.estg=true;  }, function(){ r.estg=false; }
);
// KU-Toggle (gruen)
var kuRow=document.querySelector("[data-rtog='rechKuCb']");
if(kuRow) kuRow.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-ku-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){
this.classList.add("ang-tog-ku-on"); r.kuOverride=true; r.mwst0=false;
var m0r=document.querySelector("[data-rtog='rechMwst0Cb']");
if(m0r) m0r.classList.remove("ang-tog-on","ang-tog-m0-on");
} else { r.kuOverride=false; }
rechSyncAll(); rechRefreshSummen();
};
// M0-Toggle (orange)
var m0Row=document.querySelector("[data-rtog='rechMwst0Cb']");
if(m0Row) m0Row.onclick=function(){
var on=this.classList.contains("ang-tog-on")||this.classList.contains("ang-tog-m0-on");
this.classList.remove("ang-tog-on","ang-tog-ku-on","ang-tog-m0-on");
if(!on){
this.classList.add("ang-tog-m0-on"); r.mwst0=true; r.kuOverride=false;
var kur=document.querySelector("[data-rtog='rechKuCb']");
if(kur) kur.classList.remove("ang-tog-on","ang-tog-ku-on");
} else { r.mwst0=false; }
rechSyncAll(); rechRefreshSummen();
};

// Positionen Inline-Editing
document.querySelectorAll(".ang-pos-menge,.ang-pos-ep").forEach(function(inp){
inp.addEventListener("input",function(){
var idx=parseInt(this.getAttribute("data-posidx"));
var p=RECH.current.positionen[idx]; if(!p) return;
if(this.classList.contains("ang-pos-menge")) p.menge=parseFloat(this.value)||0;
if(this.classList.contains("ang-pos-ep"))    p.ep   =parseFloat(this.value)||0;
var row=this.closest(".ang-pos-row");
if(row){ var gp=row.querySelector(".ang-pos-gp"); if(gp) gp.textContent=eur(p.menge*p.ep); }
rechRefreshSummen();
});
});
document.querySelectorAll("[data-delpos]").forEach(function(b){
b.onclick=function(e){ e.stopPropagation();
RECH.current.positionen.splice(parseInt(this.getAttribute("data-delpos")),1);
renderRechEditor();
};
});

// Katalog
var ks2=el("rechKatSrch");
if(ks2){ ks2.oninput=function(){ RECH.katSrch=this.value; rechRefreshKatalog(); }; }
document.querySelectorAll("[data-rkatf]").forEach(function(b){
b.onclick=function(){ RECH.katFilter=this.getAttribute("data-rkatf"); rechRefreshKatalog(); };
});
document.querySelectorAll("[data-rkatid]").forEach(function(b){
b.addEventListener("click",function(e){ e.stopPropagation();
rechAddKatalogPos(this.getAttribute("data-rkatid")); });
});

// Eigene Position
bind("rechAddEigene", function(){
if(!RECH.current.positionen) RECH.current.positionen=[];
RECH.current.positionen.push({id:uid(),name:"Neue Position",einh:"m2",menge:1,ep:0,gruppe:"Allgemein"});
renderRechEditor();
});

// Zahlung erfassen
bind("rechZahlAddBtn",function(){
var dat=gv("rechZDat"), bet=parseFloat(gv("rechZBetrag")||0);
if(!dat||!bet){ toast("Datum und Betrag eingeben",true); return; }
if(!RECH.current.zahlungen) RECH.current.zahlungen=[];
RECH.current.zahlungen.push({datum:dat,betrag:bet,notiz:gv("rechZNotiz")});
var s=rechSummen(RECH.current);
if(s.offen<=0) RECH.current.status="bezahlt";
rechSyncAll(); renderRechEditor();
toast("Zahlung erfasst");
});
document.querySelectorAll("[data-delz]").forEach(function(b){
b.onclick=function(e){ e.stopPropagation();
RECH.current.zahlungen.splice(parseInt(this.getAttribute("data-delz")),1);
renderRechEditor();
};
});

// Vorlagen
bind("rechAnschEinfuegen",function(){
var sel=el("rechAnschVorl"); if(!sel||!sel.value) return;
var v=DB.vorlagen().find(function(x){ return x.id===sel.value; });
if(v){ var ta=el("rechAnschreiben"); if(ta){ta.value=v.text;RECH.current.anschreiben=v.text;} toast("Vorlage eingefuegt"); }
});
bind("rechAnschSpeichern",function(){
var ta=el("rechAnschreiben"); if(!ta||!ta.value.trim()){toast("Kein Text",true);return;}
var nm=prompt("Name der Vorlage:"); if(!nm)return;
var V=DB.vorlagen(); V.push({id:uid(),typ:"anschreiben",name:nm,text:ta.value});
DB.sVorlagen(V); toast("Vorlage gespeichert");
});
bind("rechSchlusEinfuegen",function(){
var sel=el("rechSchlusVorl"); if(!sel||!sel.value) return;
var v=DB.vorlagen().find(function(x){ return x.id===sel.value; });
if(v){ var ta=el("rechSchlusstext"); if(ta){ta.value=v.text;RECH.current.schlusstext=v.text;} toast("Vorlage eingefuegt"); }
});
bind("rechSchlusSpeichern",function(){
var ta=el("rechSchlusstext"); if(!ta||!ta.value.trim()){toast("Kein Text",true);return;}
var nm=prompt("Name der Vorlage:"); if(!nm)return;
var V=DB.vorlagen(); V.push({id:uid(),typ:"schlusstext",name:nm,text:ta.value});
DB.sVorlagen(V); toast("Vorlage gespeichert");
});
}

function rechSyncAll(){
var r=RECH.current; if(!r) return;
var f=function(id){ var e=el(id); return e?e.value:""; };
var ks=el("rechKundeSelect");
if(ks){ var k=DB.kunden().find(function(x){ return x.id===ks.value; });
r.kundeId=ks.value; r.kundeName=k?k.name:""; }
r.nummer=f("rechNummer"); r.status=f("rechStatus")||r.status;
r.typ=f("rechTyp")||r.typ;
r.abschlagProz=parseFloat(f("rechAbschlagProz"))||30;
r.ansprechpartner=f("rechAnsprechpartner");
r.anschrift=f("rechAnschrift"); r.objekt=f("rechObjekt");
r.datum=f("rechDatum"); r.faellig=f("rechFaellig");
r.zahlungsziel=parseInt(f("rechZahlungsziel"))||14;
r.rabatt=parseFloat(f("rechRabatt"))||0;
r.von=f("rechVon"); r.bis=f("rechBis");
r.skontoProz=parseFloat(f("rechSkontoProz"))||2;
r.skontoTage=parseInt(f("rechSkontoTage"))||10;
r.anschreiben=f("rechAnschreiben"); r.schlusstext=f("rechSchlusstext");
}

function rechRefreshSummen(){
var r=RECH.current; if(!r) return;
var s=rechSummen(r);
var sm=document.querySelector("#rechPosListe")?document.querySelector("#rechPosListe").nextElementSibling:null;
if(!sm||!sm.classList.contains("ang-summen-block")) return;
var ku=s.ku,m0=s.mwst0, istA=r.typ==="abschlag"||r.typ==="voraus";
sm.innerHTML=
(r.rabatt>0?"<div class='ang-sum-row'><span>Zwischensumme</span><span>"+eur(s.netto)+"</span></div>":"")+
(r.rabatt>0?"<div class='ang-sum-row'><span>Rabatt ("+r.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
(istA?"<div class='ang-sum-row'><span>"+rechTypLbl(r.typ)+" ("+r.abschlagProz+"%)</span><span>"+eur(s.nettoAbschlag)+"</span></div>":"")+
"<div class='ang-sum-row'><span>Netto</span><span>"+eur(s.nettoAbschlag)+"</span></div>"+
"<div class='ang-sum-row'><span>"+(ku?"MwSt. (Par.19 UStG)":m0?"MwSt. 0%":"MwSt. 19%")+"</span><span>"+eur(s.mwst)+"</span></div>"+
"<div class='ang-sum-row ang-sum-total'><span>Brutto</span><span>"+eur(s.brutto)+"</span></div>"+
(s.bezahlt>0?"<div class='ang-sum-row' style='color:#22c55e'><span>Bezahlt</span><span>-"+eur(s.bezahlt)+"</span></div>":"")+
(s.bezahlt>0?"<div class='ang-sum-row ang-sum-total' style='color:"+(s.offen>0?"#f59e0b":"#22c55e")+"'><span>Offen</span><span>"+eur(s.offen)+"</span></div>":"");
}

function rechRefreshKatalog(){
var KAT=DB.katalog();
var f=RECH.katSrch?KAT.filter(function(i){ return (i.name+i.text).toLowerCase().indexOf(RECH.katSrch.toLowerCase())>=0; }):KAT;
if(RECH.katFilter!=="alle") f=f.filter(function(i){ return i.kat===RECH.katFilter; });
var items=f.slice(0,60).map(function(item){
return "<div class='ang-kat-item'>"+
"<div style='flex:1;min-width:0'><div class='ang-kat-nm'>"+esc(item.name)+"</div>"+
"<div class='ang-kat-info'>"+esc(item.einh)+" · "+eur(item.preis)+"</div></div>"+
"<button class='ang-kat-add' data-rkatid='"+esc(item.id)+"'>+</button>"+
"</div>";
}).join("")||"<div style='color:#94a3b8;padding:12px;font-size:13px;text-align:center'>Keine Treffer</div>";
var kl=el("rechKatListe"); if(kl) kl.innerHTML=items;
document.querySelectorAll("[data-rkatf]").forEach(function(b){
b.classList.toggle("ang-kat-tab-on",b.getAttribute("data-rkatf")===RECH.katFilter);
});
document.querySelectorAll("[data-rkatid]").forEach(function(b){
b.addEventListener("click",function(e){ e.stopPropagation(); rechAddKatalogPos(this.getAttribute("data-rkatid")); });
});
var ks=el("rechKatSrch"); if(ks&&RECH.katSrch){ ks.focus(); ks.setSelectionRange(ks.value.length,ks.value.length); }
}

function rechAddKatalogPos(kid){
var item=DB.katalog().find(function(x){ return x.id===kid; });
if(!item){ toast("Nicht gefunden",true); return; }
if(!RECH.current.positionen) RECH.current.positionen=[];
var grpMap={maler:"Malerarbeiten",trockenbau:"Trockenbauarbeiten",putz:"Putz und Stuck",sonst:"Sonstiges"};
RECH.current.positionen.push({id:uid(),name:item.name,einh:item.einh,menge:1,ep:item.preis,gruppe:grpMap[item.kat]||"Allgemein",katId:item.id});
toast(item.name+" hinzugefuegt");
renderRechEditor();
}

// ============================================================
// SPEICHERN
// ============================================================
function rechSave(){
rechSyncAll();
var r=RECH.current; if(!r) return;
var s=rechSummen(r);
r.netto=s.nettoAbschlag; r.mwst=s.mwst; r.brutto=s.brutto; r.geaendert=Date.now();
var alle=DB.rech2(); var idx=alle.findIndex(function(x){ return x.id===r.id; });
if(idx>=0) alle[idx]=r; else alle.push(r);
haptic("medium"); DB.sRech2(alle); toast("Rechnung gespeichert");
}

// ============================================================
// VORSCHAU HTML (Eingebettet)
// ============================================================
function rechVorschauHTML(r){
var s=rechSummen(r); var ku=s.ku; var m0=s.mwst0;
var set=DB.settings();
var pos=r.positionen||[]; var gruppen={}; var nr=0;
pos.forEach(function(p){ var g=p.gruppe||"Allgemein"; if(!gruppen[g])gruppen[g]=[]; gruppen[g].push(p); });
var rows="";
Object.keys(gruppen).forEach(function(grp){
rows+="<tr><td colspan='5' style='padding:6px 8px 3px;font-weight:700;font-size:11px;color:#1e3a5f;background:#f8fafc;border-top:1px solid #e2e8f0'>"+esc(grp)+"</td></tr>";
gruppen[grp].forEach(function(p){
nr++;
var gp=(parseFloat(p.menge)||0)*(parseFloat(p.ep)||0);
rows+="<tr><td style='padding:6px 8px;color:#6b7280;font-size:11px'>"+nr+"</td>"+
"<td style='padding:6px 8px;font-weight:600;font-size:12px'>"+esc(p.name)+"</td>"+
"<td style='padding:6px 8px;text-align:right;font-size:11px'>"+esc(String(p.menge||1))+" "+esc(p.einh)+"</td>"+
"<td style='padding:6px 8px;text-align:right;font-size:11px'>"+eur(p.ep||0)+"</td>"+
"<td style='padding:6px 8px;text-align:right;font-weight:700'>"+eur(gp)+"</td></tr>";
});
});
var istA=r.typ==="abschlag"||r.typ==="voraus";
return "<div style='font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;border-radius:12px;padding:22px'>"+
"<h2 style='font-size:18px;font-weight:900;color:#1e3a5f;margin-bottom:4px'>"+rechTypLbl(r.typ)+"</h2>"+
"<div style='color:#475569;margin-bottom:3px'>"+esc(r.kundeName||"")+"</div>"+
(r.objekt?"<div style='color:#94a3b8;font-size:11px'>Objekt: "+esc(r.objekt)+"</div>":"")+
"<div style='color:#94a3b8;font-size:11px;margin-bottom:12px'>Nr.: "+esc(r.nummer||"")+" • "+fdat(r.datum)+(r.faellig?" • Faellig: "+fdat(r.faellig):"")+"</div>"+
(r.von?"<div style='color:#475569;font-size:11px;margin-bottom:8px'>Leistungszeitraum: "+esc(r.von)+(r.bis?" bis "+esc(r.bis):"")+"</div>":"")+
"<table style='width:100%;border-collapse:collapse;margin-bottom:10px'>"+
"<thead><tr style='border-bottom:2px solid #1e3a5f'><th style='padding:7px 8px;text-align:left;font-size:10px;color:#6b7280'>Pos.</th>"+
"<th style='padding:7px 8px;text-align:left;font-size:10px;color:#6b7280'>Leistung</th>"+
"<th style='padding:7px 8px;text-align:right;font-size:10px;color:#6b7280'>Menge</th>"+
"<th style='padding:7px 8px;text-align:right;font-size:10px;color:#6b7280'>EP</th>"+
"<th style='padding:7px 8px;text-align:right;font-size:10px;color:#6b7280'>Gesamt</th></tr></thead>"+
"<tbody>"+rows+"</tbody></table>"+
"<div style='border-top:1px solid #e2e8f0;padding-top:8px'>"+
(r.rabatt>0?"<div style='display:flex;justify-content:space-between;padding:3px 0;font-size:11px'><span>Rabatt ("+r.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
(istA?"<div style='display:flex;justify-content:space-between;padding:3px 0;font-size:11px'><span>"+rechTypLbl(r.typ)+" ("+r.abschlagProz+"%)</span><span>"+eur(s.nettoAbschlag)+"</span></div>":"")+
"<div style='display:flex;justify-content:space-between;padding:3px 0;font-size:11px'><span>Netto</span><span>"+eur(s.nettoAbschlag)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:3px 0;font-size:11px'><span>"+(ku?"MwSt. (Par.19)":m0?"0% steuerfrei":"MwSt. 19%")+"</span><span>"+eur(s.mwst)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:7px 0;font-size:15px;font-weight:900;border-top:2px solid #1e3a5f;margin-top:4px'><span>Brutto</span><span>"+eur(s.brutto)+"</span></div>"+
"</div>"+
(ku?"<div style='font-size:10px;color:#16a34a;padding:6px 8px;background:#f0fdf4;border-radius:5px;margin-top:8px'>Gem. §19 UStG wird keine Umsatzsteuer berechnet.</div>":"")+
"</div>";
}

// ============================================================
// PDF
// ============================================================
function oRechnung(pf){
tmpLR={};
var sel=el("rPrj");
if(sel) sel.innerHTML="<option value=''>Projekt waehlen</option>"+
DB.projekte().map(function(p){ return "<option value='"+p.id+"'>"+esc(p.name)+"</option>"; }).join("");
var rfl=el("rFlBox"); if(rfl) rfl.style.display="none";
var rll=el("rLL"); if(rll) rll.innerHTML="";
sv("rVon",""); sv("rBis","");
var rt=el("rTyp"); if(rt) rt.value="schluss";
var ra=el("rAbPRow"); if(ra) ra.style.display="none";
var rab=el("rAbRow"); if(rab) rab.style.display="none";
sv("rZiel","14"); sv("rSkoP","2"); sv("rSkoT","7"); sv("rNotTxt","");
var eb=el("rExtBody"); if(eb) eb.classList.remove("open");
var et=el("rExtToggle"); if(et) et.classList.remove("open");
updateSums("rNt","rMw","rMwLbl","rBr",tmpLR,"schluss",0.3);
if(pf){
if(sel) sel.value=pf.projektId||"";
if(sel) sel.dispatchEvent(new Event("change"));
(pf.items||[]).forEach(function(i){ if(i.name) tmpLR[i.name]={on:true,m2:i.m2||0}; });
buildLeistungen("rLL",tmpLR,"rNt","rMw","rMwLbl","rBr");
}
mo("m-r");
}

var rTypEl=el("rTyp");
if(rTypEl) rTypEl.onchange=function(){
var v=this.value;
var ra=el("rAbPRow"); if(ra) ra.style.display=(v==="abschlag"||v==="voraus")?"block":"none";
var rt=gv("rTyp"), ap=parseFloat(gv("rAbP")||30)/100;
updateSums("rNt","rMw","rMwLbl","rBr",tmpLR,rt,ap);
};
var rAbPEl=el("rAbP");
if(rAbPEl) rAbPEl.oninput=function(){
updateSums("rNt","rMw","rMwLbl","rBr",tmpLR,gv("rTyp"),parseFloat(this.value||30)/100);
};
var rExtTgl=el("rExtToggle");
if(rExtTgl) rExtTgl.onclick=function(){
this.classList.toggle("open");
var b=el("rExtBody"); if(b) b.classList.toggle("open");
};

var rPrjSel=el("rPrj");
if(rPrjSel) rPrjSel.onchange=function(){
var pid=this.value;
var p=pid?DB.projekte().find(function(x){ return x.id===pid; }):null;
var dm2=p?(p.raeume||[]).reduce(function(s,r){ return s+r.m2; },0):0;
LEI.forEach(function(l){ tmpLR[l.id]={on:tmpLR[l.id]?tmpLR[l.id].on:false,m2:dm2}; });
buildLeistungen("rLL",tmpLR,"rNt","rMw","rMwLbl","rBr");
};

var rLL=el("rLL");
if(rLL) rLL.addEventListener("click",function(e){
var t=e.target.closest("[data-lei]"); if(!t) return;
toggleLEI(t.getAttribute("data-lei"),tmpLR,"rNt","rMw","rMwLbl","rBr");
});

el("rCan").onclick=function(){ mc("m-r"); };
el("rSav").onclick=function(){
var pid=(el("rPrj")||{}).value;
if(!pid){ toast("Projekt auswaehlen",true); return; }
var items=LEI.filter(function(l){ return tmpLR[l.id]&&tmpLR[l.id].on; })
.map(function(l){ var m2=tmpLR[l.id].m2||0; return{name:l.name,m2:m2,einh:"m2",einzelpreis:lp(l,m2).ges}; });
if(!items.length){ toast("Mindestens eine Leistung auswaehlen",true); return; }
var netto=items.reduce(function(s,x){ return s+(x.einzelpreis||0); },0);
var ku=isKU(); var mw=ku?0:netto*0.19;
var rtyp=gv("rTyp"); var abp=parseFloat(gv("rAbP")||30)/100;
var brutto=(rtyp==="abschlag"||rtyp==="voraus")?(netto+mw)*abp:(netto+mw);
var p=DB.projekte().find(function(x){ return x.id===pid; });
var k=p?DB.kunden().find(function(x){ return x.id===p.kid; }):null;
var R=DB.rechnungen();
var pre={schluss:"R",abschlag:"AR",teil:"TR",voraus:"VR"}[rtyp]||"R";
var num=pre+"-"+new Date().getFullYear()+"-"+String(R.length+1).padStart(3,"0");
R.push({id:uid(),nummer:num,typ:rtyp,abproz:abp,projektId:pid,
kundeName:k?k.name:"",projName:p?p.name:"",
items:items,netto:netto,mwst:mw,brutto:brutto,ku:ku,
status:(el("rStat")||{}).value||"offen",datum:Date.now(),
von:gv("rVon"),bis:gv("rBis"),zahlungsziel:parseInt(gv("rZiel")||14),
skoProz:parseFloat(gv("rSkoP")||0),skoTage:parseInt(gv("rSkoT")||0),
notiz:gv("rNotTxt")});
DB.sR(R); mc("m-r"); toast("Rechnung erstellt");
if(CS==="r") renderRechnungen(); if(CS==="d") renderDash();
};

el("rPrevBtn").onclick=function(){
var pid=(el("rPrj")||{}).value;
if(!pid){ toast("Bitte Projekt auswaehlen",true); return; }
var items=LEI.filter(function(l){ return tmpLR[l.id]&&tmpLR[l.id].on; })
.map(function(l){ var m2=tmpLR[l.id].m2||0; return{name:l.name,m2:m2,einh:"m2",einzelpreis:lp(l,m2).ges}; });
var netto=items.reduce(function(s,x){ return s+(x.einzelpreis||0); },0);
var ku=isKU(); var mw=ku?0:netto*0.19;
var rtyp=gv("rTyp"); var abp=parseFloat(gv("rAbP")||30)/100;
var brutto=(rtyp==="abschlag"||rtyp==="voraus")?(netto+mw)*abp:(netto+mw);
var p=DB.projekte().find(function(x){ return x.id===pid; });
var k=p?DB.kunden().find(function(x){ return x.id===p.kid; }):null;
var pc=el("prevContent");
if(pc) pc.innerHTML=buildDocHTML({
typ:"RECHNUNG",num:"(Vorschau)",datum:new Date().toLocaleDateString("de-DE"),
items:items,netto:netto,mwst:mw,brutto:brutto,ku:ku,
kundeName:k?k.name:"",projName:p?p.name:"",
isR:true,zahlungsziel:parseInt(gv("rZiel")||14),
skoProz:parseFloat(gv("rSkoP")||0),skoTage:parseInt(gv("rSkoT")||0),
von:gv("rVon"),bis:gv("rBis"),rtyp:rtyp,abp:abp
});
mc("m-r"); mo("m-prev");
};

// ============================================================
// LEISTUNGSKATALOG
// ============================================================
var katFilter="alle", katSrch="";

var KDEF = [
{id:"M01",kat:"maler",name:"Untergrund pruefen und dokumentieren",einh:"m2",preis:3.50,
text:"Untergrundpruefung nach DIN 18363: Tragfaehigkeit, Haftung, Feuchte messen. Pruefprotokoll erstellen. Empfehlung fuer geeignete Beschichtung. Grundlage fuer Gewaehrleistungsanspruch."},
{id:"M02",kat:"maler",name:"Tiefengrundierung aufbringen",einh:"m2",preis:2.80,
text:"Saugenden oder kreidenden Untergrund mit loesemittelfreier Tiefengrundierung behandeln. Verfestigt losen Untergrund, reduziert Saugfaehigkeit, verbessert Haftung der Folgebeschichtung."},
{id:"M03",kat:"maler",name:"Haftgrundierung aufbringen",einh:"m2",preis:3.40,
text:"Dichte Untergrnde (Beton, Fliesen, alter Glanzlack) mit Haftprimer vorbehandeln. Erzeugt mechanisch aufgerauhte Haftgrundlage. Trocknungszeit min. 4h vor Folgebeschichtung."},
{id:"M04",kat:"maler",name:"Sperrgrundierung gegen Wasserflecken",einh:"m2",preis:4.20,
text:"Wasserflecken, Nikotinverfaerbungen oder Gerbstoffe mit Shellack-Sperrgrund abdecken. Verhindert Durchbluten in Folgebeschichtung. 2 Lagen bei starker Verfaerbung."},
{id:"M05",kat:"maler",name:"Flaechen abwaschen und entfetten",einh:"m2",preis:3.20,
text:"Wandflaechen von Fettflecken, Nikotin und Staub abseifen. Nachspuelen, trocknen. Voraussetzung fuer haftfaehige Neuanstriche."},
{id:"M06",kat:"maler",name:"Alten Anstrich abkratzen und abschleifen",einh:"m2",preis:6.50,
text:"Abplatzende Anstrichschichten mechanisch entfernen. Spachtelkratzer und Schleifpapier, Uebergaenge abkanten. Flaechig auftretende Maengel vollstaendig freilegen."},
{id:"M07",kat:"maler",name:"Alten Anstrich chemisch abbeizen",einh:"m2",preis:9.80,
text:"Mehrschichtige Lackanstriche mit Beizmittel anloechen, abschrapen und neutralisieren. Entsorgung Sondermaterial eingeschlossen."},
{id:"M08",kat:"maler",name:"Flaechen anschleifen maschinell",einh:"m2",preis:4.50,
text:"Wandflaechen mit Exzenter- oder Schwingschleifer anschleifen. Koernung 80-180. Staubabsaugung. Optimale Haftgrundlage."},
{id:"M09",kat:"maler",name:"Spachtelung Flaeche egalisieren 1 Lage",einh:"m2",preis:5.50,
text:"Kleine Unebenheiten bis 3mm mit Ausgleichsspachtel schliessen. 1 Spachtellage, anschleifen nach Trocknung. Flaeche malerfertig."},
{id:"M10",kat:"maler",name:"Spachtelung 2 Lagen Vollflaeche",einh:"m2",preis:9.80,
text:"Vollstaendige Flaechenspachtelung in 2 Lagen. Je Lage trocknen und anschleifen. Egalisierte ebene Flaeche fuer hochwertige Beschichtungen."},
{id:"M11",kat:"maler",name:"Risse mit Gewebeband ueberspannen",einh:"lfm",preis:6.80,
text:"Risse mit Fugengewebeband ueberkleben und verspachteln. Verhindert erneutes Aufreissen. Fuer Haarrisse und Schwindrisse."},
{id:"M12",kat:"maler",name:"Schimmelflecken behandeln und grundieren",einh:"m2",preis:12.00,
text:"Befallene Flaechen mit fungiziden Mitteln behandeln, abreiben, trocknen. Schimmelschutzfarbe anschliessend. Ursache dokumentieren."},
{id:"M13",kat:"maler",name:"Wand 1x Dispersionsfarbe",einh:"m2",preis:4.80,
text:"Wand- oder Deckenflaeche 1x mit matt-seidenmatter Dispersionsfarbe nach Farbangabe streichen. Einschl. Abkleben und Bodenabdeckung."},
{id:"M14",kat:"maler",name:"Wand 2x Dispersionsfarbe deckend",einh:"m2",preis:7.20,
text:"Wand- oder Deckenflaeche 2x deckend streichen. 1. Lage Haftanstrich gebrochen, 2. Lage sattfarben. Guete nach DIN 18363 Klasse 2."},
{id:"M15",kat:"maler",name:"Wand 3x Dispersionsfarbe",einh:"m2",preis:10.50,
text:"3-facher Anstrich fuer hoechste Farbtiefe oder schwierige Untergrnde. Volldeckung auch bei Farbwechsel dunkel zu hell."},
{id:"M16",kat:"maler",name:"Decke 2x weiss streichen",einh:"m2",preis:9.50,
text:"Deckenflaeche 2x mit weisser Deckenfarbe. Hohe Deckkraft Klasse 2, splatterarme Formulierung. Einschl. Abkleben Wandanschluss."},
{id:"M17",kat:"maler",name:"Decke 3x weiss streichen",einh:"m2",preis:13.00,
text:"Dreifacher Deckenanstrich fuer maximale Helligkeit und Deckung. Nach Wasserschaeden oder Flecken. Einschl. Einruesten bis 3m."},
{id:"M18",kat:"maler",name:"Akzentwand farbig 2x streichen",einh:"m2",preis:11.00,
text:"Einzelne Wand in kraeftiger Akzentfarbe 2x streichen. Sorgfaeltiges Abkleben angrenzender Flaechen. Saubere Kante zwischen Farben."},
{id:"M19",kat:"maler",name:"Komplettes Zimmer bis 20m2 streichen",einh:"psch",preis:220.00,
text:"Komplettes Zimmer: Decke und alle Waende 2x streichen. Farbe weiss oder 1 Farbton. Moebel zusammenschieben, Bodenabdeckung."},
{id:"M20",kat:"maler",name:"Kalkfarbe mineralisch aufbringen",einh:"m2",preis:9.50,
text:"Natuerliche Kalkfarbe auf Kalkputz oder Mauerwerk. 3-4 duenne Lagen, antibakteriell, diffusionsoffen. Fuer Denkmalschutz und Altbau."},
{id:"M21",kat:"maler",name:"Schimmelschutzfarbe 2x auftragen",einh:"m2",preis:12.00,
text:"Schimmelschutzfarbe mit fungizider Ausruestung 2x. Langzeitwirkung min. 5 Jahre. Fuer Keller, Nassraeume, Nordwaende."},
{id:"M22",kat:"maler",name:"Lehm- oder Naturfarbe aufbringen",einh:"m2",preis:14.00,
text:"Oekologische Lehmfarbe oder Naturharzfarbe innen. Reguliert Luftfeuchte, kein Ausdunsten. Geeignet fuer Allergiker und Biobau."},
{id:"M23",kat:"maler",name:"Tapeten abloesen 1 Lage",einh:"m2",preis:5.50,
text:"Tapetenlage durchfeuchten, abziehen, Kleisterreste abschaben, Wand glattstossen. Vorbereitung fuer Neubeschichtung."},
{id:"M24",kat:"maler",name:"Tapeten abloesen mehrlagig bis 3 Lagen",einh:"m2",preis:9.00,
text:"2-3 Tapetenschichten entfernen. Mehrfaches Einweichen, mechanisches Abloesen. Zeitaufwaendig. Untergrund pruefen."},
{id:"M25",kat:"maler",name:"Raufasertapete kleben und ueberstreichen",einh:"m2",preis:13.50,
text:"Raufaser auf grundierten Untergrund kleben, Bahnen gestossen, 2x Dispersionsfarbe ueberstreichen. Klassische wirtschaftliche Wandgestaltung."},
{id:"M26",kat:"maler",name:"Vliestapete Standard kleben",einh:"m2",preis:13.50,
text:"Vliestapete auf Wand kleben (Wandtapisserierung). Kleister auf Wand auftragen, Bahn anlegen, ausrichten, Luftblasen ausstreichen."},
{id:"M27",kat:"maler",name:"Vliestapete Designqualitaet kleben",einh:"m2",preis:22.00,
text:"Hochwertige Strukturtapete oder Designtapete verkleben. Mustereinpassung, Gehrungsecken, saubere Leistenschnitte."},
{id:"M28",kat:"maler",name:"Vliestapete mit Rapportmuster kleben",einh:"m2",preis:28.00,
text:"Tapete mit Mustervorsatz fachgerecht kleben. Rapportausgleich bei jeder Bahn. Materialverschnitt 15-25 Prozent."},
{id:"M29",kat:"maler",name:"Glasfasertapete Malervlies kaschieren",einh:"m2",preis:16.80,
text:"Glasgewebe auf Wand und Decke kaschieren. Rissabdeckend, armierend. Grundlage fuer hochwertige Beschichtungen."},
{id:"M30",kat:"maler",name:"Textiltapete kleben",einh:"m2",preis:32.00,
text:"Naturtextil- oder Kunstfasertapete auf vorgeklebten Untergrund. Spezialkleber, keine Nahtverschiebungen, Schnittkanten versiegeln."},
{id:"M31",kat:"maler",name:"Holzflaechen schleifen und lackieren 2x",einh:"m2",preis:32.00,
text:"Holzflaechen (Tueren, Rahmen, Regale) schleifen, entstauben, Grundierung, 2x Deckbeschichtung. Farbton nach Wahl."},
{id:"M32",kat:"maler",name:"Holztuer mit Zarge komplett lackieren",einh:"Stk",preis:140.00,
text:"Tuer und Zarge komplett abschleifen, Fehlstellen spachteln, grundieren, 2x Deckbeschichtung weiss oder farbig."},
{id:"M33",kat:"maler",name:"Fenster Holz 2-fluegelig streichen",einh:"Stk",preis:190.00,
text:"Holzfenster 2-fluegelig aussen und innen: Anschliff, Holzschutzgrundierung, 2x Wetterschutzlasur oder Lack."},
{id:"M34",kat:"maler",name:"Fenster Holz 1-fluegelig streichen",einh:"Stk",preis:98.00,
text:"Holzfenster 1-fluegelig komplett: Schleifen, Grundierung, 2x Deckbeschichtung UV-bestaendig wetterfest."},
{id:"M35",kat:"maler",name:"Parkettboden schleifen und lackieren",einh:"m2",preis:16.50,
text:"Holzboden abschleifen Grob bis Fein, entstauben, grundieren, 2-3x Parkettlack. Seidenglanz bis Hochglanz."},
{id:"M36",kat:"maler",name:"Holzboden oelen 2x",einh:"m2",preis:14.00,
text:"Holzboden abschleifen, 2x hartoelen. Natuerlicher Schutz ohne Filmbildung. Holz atmungsaktiv."},
{id:"M37",kat:"maler",name:"Treppe streichen komplett",einh:"psch",preis:380.00,
text:"Holztreppe vollstaendig renovieren: Stufen, Setzstufen, Gelaender. Schleifen, spachteln, 2x Farbbeschichtung. Trittstufen rutschsicher."},
{id:"M38",kat:"maler",name:"Holzdecke Balken sichtbar lasieren",einh:"m2",preis:22.00,
text:"Sichtbare Balken und Bretter abschleifen, 2x Holzlasur. Maserung erhalten. UV- und Feuchtigkeitsschutz."},
{id:"M39",kat:"maler",name:"Stahlbauteile grundieren und streichen",einh:"m2",preis:38.00,
text:"Stahl- und Eisenteile entrosten (St 2-3), Zinkstaubgrundierung, 2x Deckbeschichtung Korrosionsschutzfarbe."},
{id:"M40",kat:"maler",name:"Heizkoerper Gliedheizkoerper streichen",einh:"Stk",preis:78.00,
text:"Heizkoerper abschleifen, grundieren, 2x Heizkoerperlack hitzebestaendig 120 Grad. Weiss oder farbig. Ohne Demontage."},
{id:"M41",kat:"maler",name:"Heizungsrohre und Leitungen streichen",einh:"lfm",preis:8.50,
text:"Rohrleitungen anschleifen, Metallgrundierung, Deckfarbe farblich angepasst oder nach RAL-Norm."},
{id:"M42",kat:"maler",name:"Gelaender Metall streichen komplett",einh:"lfm",preis:18.00,
text:"Metallgelaender entrosten, grundieren, 2x Deckbeschichtung. Profilverlauf exakt, keine Laeufer."},
{id:"M43",kat:"maler",name:"Holz lasieren innen 2x",einh:"m2",preis:18.00,
text:"Innenholz schleifen, 2x Innenholzlasur. Maserung sichtbar, UV- und Feuchtigkeitsschutz, loesemittelarm."},
{id:"M44",kat:"maler",name:"Holz lasieren aussen 2x Wetterschutz",einh:"m2",preis:24.00,
text:"Aussenholz schleifen, grundieren, 2x Wetterschutzlasur wasserverduennbar. UV-Schutz, diffusionsoffen."},
{id:"M45",kat:"maler",name:"Holz beizen und lasieren",einh:"m2",preis:28.00,
text:"Holzbeize auftragen (Farbtonwechsel), anschliessend 2x Schutzlasur. Ton individuell mischbar."},
{id:"M46",kat:"maler",name:"Patinierung Vintage-Effekt",einh:"m2",preis:45.00,
text:"Holz oder Metall mit Patina versehen: Crackelierung, Trockenbuerstung, Wash-Techniken. Handwerklicher Unikat-Effekt."},
{id:"M47",kat:"maler",name:"Wischputz Dekoreffekt Wand",einh:"m2",preis:38.00,
text:"Grundanstrich, Effektfarbe auftragen, teilweise abwischen fuer Reliefeffekt. Handwerklicher Unikat-Effekt."},
{id:"M48",kat:"maler",name:"Venezianischer Putz Marmoreffekt",einh:"m2",preis:55.00,
text:"Mehrlagiger Glanzputz in Marmorimitat-Technik. 3-5 Lagen, je Lage polieren. Fuer Repraesentationsraeume."},
{id:"M49",kat:"maler",name:"Betonoptik Spachteltechnik",einh:"m2",preis:48.00,
text:"Betonoptik durch spezielle Spachtelmasse simulieren. 2-3 duenne Lagen, Strukturierung, Versiegelung."},
{id:"M50",kat:"maler",name:"Metallic-Anstrich Perleffektfarbe",einh:"m2",preis:32.00,
text:"Perlglanz- oder Metallic-Effektfarbe aufbringen. Grundanstrich, 2x Effektfarbe. Dekorativer Lichteffekt."},
{id:"M51",kat:"maler",name:"Fassade reinigen Hochdruckgeraet",einh:"m2",preis:4.50,
text:"Fassade mit 200-250 bar Hochdruckreiniger abspuelen. Algen, Moos entfernen. Biozid-Behandlung bei Bewuchs."},
{id:"M52",kat:"maler",name:"Fassade Silikatfarbe mineralisch 2x",einh:"m2",preis:14.00,
text:"Silikatfarbe 2x auf mineralischen Untergrund. Verwitterungsbestaendig, diffusionsoffen, kieselsauregebunden."},
{id:"M53",kat:"maler",name:"Fassade Silikonharzfarbe 2x",einh:"m2",preis:15.50,
text:"Hochwertige Silikonharzfassadenfarbe 2x. Selbstreinigend, 10 Jahre Standzeit. Wasserabweisend, diffusionsoffen."},
{id:"M54",kat:"maler",name:"Fassade Reinacrylfarbe 2x",einh:"m2",preis:12.00,
text:"Acrylat-Fassadenfarbe 2x. Flexible Beschichtung, Rissueberbrueckung bis 0,2mm, wetterfest."},
{id:"M55",kat:"maler",name:"Holzfassade Schalung streichen",einh:"m2",preis:22.00,
text:"Holzschalung entfetten, schleifen, Holzschutzgrund, 2x Fassadenlasur oder -farbe. Stirnflaechen versiegeln."},
{id:"M56",kat:"maler",name:"Sockel Kellerbereich Schutzanstrich",einh:"m2",preis:18.00,
text:"Sockelbereich mit mineralischer Sockelfarbe oder Kellerdichtschlaemme. Feuchtigkeitsabweisend, frostbestaendig."},
{id:"M57",kat:"maler",name:"Balkonboden wasserabweisend beschichten",einh:"m2",preis:28.00,
text:"Balkon- oder Terrassenboden mit 2K-Beschichtungssystem abdichten. Grundierung, Armierung, 2x Deckbeschichtung, rutschhemmend."},
{id:"M58",kat:"maler",name:"Garagenboden Epoxidharz 2K",einh:"m2",preis:22.00,
text:"Betonboden entfetten, abschieben, 2x 2K-Epoxidharz. Optional Farbchips oder Koernung rutschhemmend."},
{id:"M59",kat:"maler",name:"Brandschutzbeschichtung Holz B1",einh:"m2",preis:16.00,
text:"Holzflaechen mit Brandschutzfarbe schwerentflammbar B1 behandeln. Nachweis gemaess DIN 4102. Fuer Dachstuhl, Holzdecke."},
{id:"M60",kat:"maler",name:"Antigraffiti Beschichtung permanent",einh:"m2",preis:24.00,
text:"Fassade mit permanentem Antigraffiti-System schuetzen. Dauerhafter Schutzfilm, Graffiti spaeter mit Wasser ablosbar."},
{id:"M61",kat:"maler",name:"Graffiti entfernen und Flaeche herstellen",einh:"m2",preis:32.00,
text:"Graffiti mit Spezialentferner abloesen, Untergrund reinigen, neutralisieren, Neuanstrich."},
{id:"M62",kat:"maler",name:"Rostschutzanstrich Metall Dach",einh:"m2",preis:18.00,
text:"Metall- oder Blechdach entrosten, Rostschutzgrundierung, 2x Dachfarbe. Langzeitschutz 10 Jahre."},
{id:"M63",kat:"maler",name:"Fussbodenfarbe Industriehalle",einh:"m2",preis:14.00,
text:"Industrieboden mit einkomponentiger Bodenfarbe oder PU-Versiegelung. Rutschhemmend, chemikalienbestaendig."},
{id:"M64",kat:"maler",name:"Brandschutzanstrich Stahl intumeszierend",einh:"m2",preis:68.00,
text:"Stahltraeger mit intumeszierender Brandschutzbeschichtung R 30/60/90. Schichtdickennachweis, Dokumentation."},
{id:"M65",kat:"maler",name:"Abschlussreinigung nach Malerarbeiten",einh:"psch",preis:95.00,
text:"Endreinigung: Farbreste entfernen, Folien abziehen, Fenster und Beschlaege reinigen, Bauschutt entsorgen."},
{id:"M66",kat:"maler",name:"Farbberatung mit Musteranstrichen",einh:"psch",preis:120.00,
text:"Farbkonzept und Beratung vor Ort. Bis 5 Farbmuster je 50x50cm aufbringen. Einschaetzung Wirkung in versch. Licht."},
{id:"T01",kat:"trockenbau",name:"Staenderwand CW 50 einfach beplankt",einh:"m2",preis:32.00,
text:"Nichttragende Staenderwand CW 50/UW 50, Achsabstand 625mm, beidseitig 1 Lage GK 12,5mm, Mineralwolle 50mm. Fugen gespachtelt Q2. Dicke 100mm."},
{id:"T02",kat:"trockenbau",name:"Staenderwand CW 75 einfach beplankt",einh:"m2",preis:36.00,
text:"Staenderwand CW 75/UW 75, beidseitig 1 Lage GK 12,5mm, Mineralwolle 75mm. Schallschutz ca. Rw 42dB. Malerfertig. Dicke 125mm."},
{id:"T03",kat:"trockenbau",name:"Staenderwand CW 100 einfach beplankt",einh:"m2",preis:40.00,
text:"Staenderwand CW 100/UW 100, beidseitig 1 Lage GK 12,5mm, Mineralwolle 100mm. Verbesserte Schall- und Waermedaemmung. Dicke 150mm."},
{id:"T04",kat:"trockenbau",name:"Staenderwand CW 75 doppelt beplankt",einh:"m2",preis:52.00,
text:"Verstaerkte Staenderwand CW 75, beidseitig 2 Lagen GK 12,5mm Kreuzlage, Mineralwolle 75mm. Rw >= 52dB. F30. Dicke 138mm."},
{id:"T05",kat:"trockenbau",name:"Staenderwand CW 100 doppelt beplankt",einh:"m2",preis:66.00,
text:"Hochwertiger Schallschutz CW 100, beidseitig 2 Lagen GKF 12,5mm, Mineralwolle 100mm. Rw >= 57dB. Bis F90."},
{id:"T06",kat:"trockenbau",name:"Staenderwand Feuerschutzplatten GKF",einh:"m2",preis:48.00,
text:"Staenderwand CW 75/100 mit GKF-Feuerschutzplatten beidseitig, Mineralwolle nicht brennbar. F30-A bis F90-A."},
{id:"T07",kat:"trockenbau",name:"Staenderwand Nassraum GKB impraegniert",einh:"m2",preis:46.00,
text:"Staenderwand CW-Profile, GKB Feuchtigkeitsschutzplatten. Rueckseitenbeschichtung mit Dichtungsschlammung. Fuer Bad."},
{id:"T08",kat:"trockenbau",name:"Staenderwand Zementkernplatten Nassraum",einh:"m2",preis:58.00,
text:"Hochwertiger Nassraum: CW-Profile, beidseitig Zementkernplatten (Aquapanel). Vollstaendig wasserunempfindlich."},
{id:"T09",kat:"trockenbau",name:"Doppelstaender entkoppelt Schallschutz",einh:"m2",preis:78.00,
text:"2 unabhaengige Staendersysteme ohne Verbindung, je 1 Lage GK, Mineralwolle 100mm. Rw >= 62dB. Fuer Studio und Musikkeller."},
{id:"T10",kat:"trockenbau",name:"Schachtwand Installationsschacht",einh:"lfm",preis:72.00,
text:"Installationsschacht CW-Profile 3-seitig GKF beplankt, Revisionsklappe eingebaut. Fuer Lueftung, Abfluss, Elektro."},
{id:"T11",kat:"trockenbau",name:"Tuerausschnitt in Staenderwand",einh:"Stk",preis:180.00,
text:"Tuerausschnitt einarbeiten, CW-Verstaerkung, Sturz, umlaufende Eckschienen, Anschluss vorhandene Wand."},
{id:"T12",kat:"trockenbau",name:"Glastrennwand mit Rahmen und Glas",einh:"m2",preis:95.00,
text:"Staenderwand mit Glasfeldern VSG oder ESG, Aluminium- oder Stahlrahmen. Schalldaemmende Dichtungen. Glas liefern und setzen."},
{id:"T13",kat:"trockenbau",name:"Sichtschutzwand mit Holzverkleidung",einh:"m2",preis:88.00,
text:"Staenderwand CW 75 mit Holzpaneelen als Sichtverkleidung. Latten- oder Paneelbefestigung. Dekorativ und akustisch."},
{id:"T14",kat:"trockenbau",name:"Trennwand demontieren und entsorgen",einh:"m2",preis:14.00,
text:"Bestehende Trockenbautrennwand abbauen, Platten entschrauben, Profile zerlegen, Daemmung trennen, entsorgen."},
{id:"T15",kat:"trockenbau",name:"Unterdecke CD 60 einfach beplankt",einh:"m2",preis:42.00,
text:"Unterdecke CD 60/UD 28, 1 Lage GK 12,5mm, Fugen gespachtelt Q2. Abhaenghoehe bis 400mm. Einschl. Randanschlussprofil."},
{id:"T16",kat:"trockenbau",name:"Unterdecke CD 60 doppelt beplankt",einh:"m2",preis:56.00,
text:"Unterdecke CD-Konstruktion, 2 Lagen GK 12,5mm versetzt. Hoehere Schalldaemmung und Feuerwiderstand."},
{id:"T17",kat:"trockenbau",name:"Unterdecke mit Akustikdaemmung",einh:"m2",preis:54.00,
text:"Akustikdecke mit Mineralwolle 100mm. Schallabsorption alpha >= 0,7. Fuer Buero, Schulen, Konferenzraeume."},
{id:"T18",kat:"trockenbau",name:"Unterdecke Holzlattenkonstruktion",einh:"m2",preis:36.00,
text:"Unterdecke mit Holzlattung 60x40mm, GK oder Holzwerkstoffplatten. Fuer geringe Abhaenghoehe. Brandschutz Holz."},
{id:"T19",kat:"trockenbau",name:"Lichtvoute indirekte Beleuchtung",einh:"lfm",preis:65.00,
text:"Deckensegel oder Lichtvoute mit verdecktem LED-Kanal. Abgesetzte Deckenebene 150-300mm Abstand. LED-Profil einbauen."},
{id:"T20",kat:"trockenbau",name:"Decke Einbauleuchten vorbereiten",einh:"Stk",preis:28.00,
text:"Einbauleuchtenschnitt in GK-Decke: Oeffnung ausschneiden, Stabilisierungsring, Kabel durchfuehren."},
{id:"T21",kat:"trockenbau",name:"Revisionsklappe in Decke unsichtbar",einh:"Stk",preis:98.00,
text:"Unsichtbare Revisionsklappe: Magnetverschluss, rahmenbuendig, beplankungsgleich. Oeffnet nach unten."},
{id:"T22",kat:"trockenbau",name:"Schallschutzdecke mit Federabhanger",einh:"m2",preis:72.00,
text:"Schallschutzdecke entkoppelt: Federabhanger, Mineralwolle 200mm, doppelt beplankt. Trittschall DeltaLw >= 22dB."},
{id:"T23",kat:"trockenbau",name:"Kassettendecke Kofferstuck",einh:"m2",preis:68.00,
text:"Kassetten- oder Kofferdecke mit Unterkonstruktion und GK-Einfassungen. Einschl. Ecken und Gehrungsschnitte."},
{id:"T24",kat:"trockenbau",name:"Geschwungene Decke Freiform Radius",einh:"m2",preis:95.00,
text:"Freigeformte GK-Decke mit biegsamen Platten. Radien und Kurven nach Planvorgabe. Fuer Designprojekte."},
{id:"T25",kat:"trockenbau",name:"Dampfbremse Dampfsperre verlegen",einh:"m2",preis:8.50,
text:"Dampfbremsfolie Sd > 10m luftdicht einbauen. Ueberlappungen 150mm, alle Stoesse geklebt. Blower-Door-tauglich."},
{id:"T26",kat:"trockenbau",name:"Vorsatzschale GK direktverspachtelung",einh:"m2",preis:30.00,
text:"GK-Platten mit Klebemoertel direkt auf Mauerwerk kleben. Bis 30mm Ausgleich. Fugen bandagiert. Malerfertig."},
{id:"T27",kat:"trockenbau",name:"Vorsatzschale auf Profilen mit Daemmung",einh:"m2",preis:46.00,
text:"Vorsatzschale CD-Profile 50mm, Mineralwolle 50mm WLG 032. Waerme- und Schallverbesserung. Gesamtaufbau 75mm."},
{id:"T28",kat:"trockenbau",name:"Gipsfaserplatte Fermacell Wand",einh:"m2",preis:48.00,
text:"Gipsfaserplatten 12,5mm auf Metallprofilen. Robuster als GK, weniger Kantenverletzung. Fugen gespachtelt."},
{id:"T29",kat:"trockenbau",name:"Zementkernplatte Nassraumwand",einh:"m2",preis:58.00,
text:"Zementgebundene Bauplatte (Aquapanel, Wedi) als Untergrund Fliesen Nassraum. Wasserunempfindlich, formstabil."},
{id:"T30",kat:"trockenbau",name:"Spachtelung Q1 Basisqualitaet",einh:"m2",preis:4.50,
text:"GK-Spachtelung Q1: Fugen fuellen, Schraubenkoepfe abdecken, kein Anschliff. Fuer Nebenraeume und Keller."},
{id:"T31",kat:"trockenbau",name:"Spachtelung Q2 Standard malerfertig",einh:"m2",preis:8.50,
text:"Spachtelung Q2: Fugen bandagiert, 2 Spachtellagen, Zwischenschliff. Malerfertig fuer normalen Dispersionsanstrich."},
{id:"T32",kat:"trockenbau",name:"Spachtelung Q3 strukturierte Oberflaechen",einh:"m2",preis:13.00,
text:"Spachtelung Q3: Vollflaeche 3 Lagen, Feinschliff 120er. Fuer seidenmatten Anstrich und indirekte Beleuchtung."},
{id:"T33",kat:"trockenbau",name:"Spachtelung Q4 Hochglanz Premium",einh:"m2",preis:22.00,
text:"Spachtelung Q4: 4-5 Lagen, Flaechenschliff 120, Endschliff 220. Fuer Spiegelglanzlackierung und Premium-Innenausbau."},
{id:"T34",kat:"trockenbau",name:"Schleifarbeiten nach Spachtelung",einh:"m2",preis:5.00,
text:"GK-Flaechen mit Langhalsschleifer staubarm abschleifen. Koernung angepasst an Guetestufe. Staubabsaugung integriert."},
{id:"T35",kat:"trockenbau",name:"Risse verspachteln und bandagieren",einh:"lfm",preis:12.00,
text:"Risse mit Fuellmoertel verpressen und Gewebeband ueberkleben. Verhindert Wiederaufreissen. Rissklassen 0-2."},
{id:"T36",kat:"trockenbau",name:"Dachschraege ausbauen mit GK",einh:"m2",preis:62.00,
text:"Dachschraege: Holzunterlattung oder CD-Profile, Daemmung, Dampfbremse, GK beplanken. First- und Gratanschluss. Malerfertig."},
{id:"T37",kat:"trockenbau",name:"Kniestock Dachgeschoss ausbauen",einh:"m2",preis:55.00,
text:"Kniestockwand aufbauen: CW-Profile, Daemmung, GK, Schallschutz. Anschluss Dachschraege und Boden. Malerfertig."},
{id:"T38",kat:"trockenbau",name:"Unterzuege Balken mit GK verkleiden",einh:"lfm",preis:48.00,
text:"Beton- oder Stahlunterzuege mit GK-Mantel 3-seitig einhausen. Fugen gespachtelt. Brandschutz auf Anfrage."},
{id:"T39",kat:"trockenbau",name:"Trockenestrich Gipsfaserplatten verlegen",einh:"m2",preis:34.00,
text:"2 Lagen Fermacell auf Schuettung oder Daemmung, Kreuzlage, versetzt, verklebt und verdubelt. Fuer Fussbodenheizung."},
{id:"T40",kat:"trockenbau",name:"Zellulosedaemmstoff einblasen",einh:"m2",preis:18.00,
text:"Zellulose in Holzbalkendecke oder Dachschraege einblasen. Fuellgrade 60-65 kg/m3, lueckenfrei. B1, hohe Schallabsorption."},
{id:"T41",kat:"trockenbau",name:"Brandschutzklappe in Decke EI90",einh:"Stk",preis:320.00,
text:"Selbstschliessende Brandschutzklappe EI90 in abgehaengte Decke. Anschluss RWA-Steuerung. CE-zertifiziert."},
{id:"T42",kat:"trockenbau",name:"Elektrounterputzdosen in GK einbauen",einh:"Stk",preis:18.00,
text:"Unterputzdosen in GK: Einschnitt, Stabilisierungsring, Kabel durchfuehren. Vor Beplankung koordinieren."},
{id:"T43",kat:"trockenbau",name:"Akustikdecke Lochplatten",einh:"m2",preis:58.00,
text:"Gelochte GK-Akustikplatten in Unterdecke. Schallabsorption durch Lochbild und Daemmstoff. Fuer Konferenz und Buero."},
{id:"T44",kat:"trockenbau",name:"GK-Decke biegsame Platten Radius",einh:"m2",preis:88.00,
text:"Geschwungene Decke mit biegsamen GK-Platten. Radien ab R=500mm. Fuer Wellenkonstruktionen und Bogensegmente."},
{id:"P01",kat:"putz",name:"Gipsputz Rotband innen 1-lagig",einh:"m2",preis:22.00,
text:"Gipsputz 1-lagig auf Innenflaechen, 10-15mm, abgezogen und gerieben. Malerfertig. Einschl. Anputzleisten."},
{id:"P02",kat:"putz",name:"Gipsputz 2-lagig Unterputz und Oberflaechenputz",einh:"m2",preis:28.00,
text:"Zweilagiger Gipsputzaufbau: Unterputz 12-15mm, Oberflaechenputz 3-5mm, gerieben. Fuer glatte ebene Flaechen."},
{id:"P03",kat:"putz",name:"Kalkzementputz aussen 2-lagig",einh:"m2",preis:26.00,
text:"Aussenputz KZP 2-lagig: Spritzbewurf, Unterputz 15-20mm, abgezogen gefilzt. Untergrund fuer Oberputz."},
{id:"P04",kat:"putz",name:"Kalkputz mineralisch innen",einh:"m2",preis:24.00,
text:"Traditioneller Kalkputz fuer Altbau und Denkmalschutz. Atemaktiv, feuchteregulierend, schimmelresistent."},
{id:"P05",kat:"putz",name:"Lehmputz klimaregulierend 2-lagig",einh:"m2",preis:32.00,
text:"Lehmunterputz 10-15mm, Lehmfeinputz 3-5mm. Feuchteregulierend, oekologisch. Fuer Biobau und Niedrigenergie."},
{id:"P06",kat:"putz",name:"Reibeputz Fassade Koernung 1,5mm",einh:"m2",preis:18.50,
text:"Mineralischer Reibeputz K15 auf Unterputz aufbringen und reiben. Farbton mineralisch nach Karte."},
{id:"P07",kat:"putz",name:"Reibeputz Fassade Koernung 2,0mm",einh:"m2",preis:17.50,
text:"Reibeputz K20, grobere Koernung fuer rustikale Optik. Bestaendig, pflegeleicht."},
{id:"P08",kat:"putz",name:"Kratzputz Fassade",einh:"m2",preis:19.00,
text:"Putz aufbringen, nach Ansteifen mit Stahlkamm strukturieren (Kratzen). Tiefe Rillen, rustikal, traditionell."},
{id:"P09",kat:"putz",name:"Edelputz Marmorino innen",einh:"m2",preis:45.00,
text:"Feiner Marmorino-Edelputz fuer Innenanwendung. Marmormehl und Sumpfkalk, mehrlagig aufgebaut und poliert."},
{id:"P10",kat:"putz",name:"Stucco Lustro Glanzkalkputz",einh:"m2",preis:68.00,
text:"Hochwertiger Polierkalkputz: 5-7 Lagen duenn aufgetragen, je Lage polieren bis Spiegelglanz. Traditionelle Technik."},
{id:"P11",kat:"putz",name:"Putz ausbessern Flickarbeiten",einh:"m2",preis:32.00,
text:"Schadhafte Stellen abschlagen, reinigen, vorbenetzen, Putz lagenweise erneuern, abziehen, malerfertig."},
{id:"P12",kat:"putz",name:"Sockelputz Aussenbereich wasserabweisend",einh:"m2",preis:24.00,
text:"Sockelbereich bis 80cm mit hydraulischem Kalkzementputz oder Sperrputz. Wasserabweisend, frostbestaendig."},
{id:"P13",kat:"putz",name:"Spritzputz Fassade dekorativ",einh:"m2",preis:22.00,
text:"Grobteiliger Spritzputz mit Putzmaschine. Grobe Struktur durch Spritzauftrag. Robust, traditionelle Technik."},
{id:"P14",kat:"putz",name:"Eckschienen setzen und einputzen",einh:"lfm",preis:9.50,
text:"Eckschutzschienen Metall oder Kunststoff an Aussenecken einputzen, ausrichten, Putzanschluss egalisieren."},
{id:"P15",kat:"putz",name:"Anputzleisten Putzabschluss setzen",einh:"lfm",preis:7.80,
text:"Putzabschlussleisten an Decken-Wand-Anschluessen, Fensterbaenken oder Bewegungsfugen setzen und einputzen."},
{id:"P16",kat:"putz",name:"Bewegungsfuge anlegen und abdichten",einh:"lfm",preis:18.00,
text:"Bauwerkstrennfuge anlegen. Fugenband einbauen, Polyurethan-Fugenmasse einspritzen, Oberflaechenabschluss."},
{id:"P17",kat:"putz",name:"Dekorputz Tuscanor Effektputz innen",einh:"m2",preis:38.00,
text:"Kunstharzgebundener Dekorputz in Tuskanischer Optik. Mehrere Farbschichten, Wischputztechnik."},
{id:"P18",kat:"putz",name:"Mineralische Kellerdichtschlaemme 2-lagig",einh:"m2",preis:22.00,
text:"Kellerwaende mit 2-lagiger Sperrdichtschlaemme abdichten. Gegen druckendes Wasser bis 2bar. Diffusionsoffen."},
{id:"P19",kat:"putz",name:"Elektroschlitze schliessen und verspachteln",einh:"lfm",preis:14.00,
text:"Elektro- oder Rohrschlitze nach Verlegung schliessen. Moertel einbringen, Oberflaeche abglaetten, malerfertig."},
{id:"P20",kat:"putz",name:"Stuckprofil Deckengesims aufziehen",einh:"lfm",preis:85.00,
text:"Stuckprofil auf Decke oder Wand-Deckenanschluss aufziehen. Klassisches Gesims nach Vorlage. Kalkgips."},
{id:"P21",kat:"putz",name:"Stuckrosette herstellen und montieren",einh:"Stk",preis:180.00,
text:"Stuckrosette fuer Deckenleuchte. Durchmesser 40-60cm. Klassische Ornamentik. Kalkgips oder Polyurethan."},
{id:"P22",kat:"putz",name:"Stuckelemente Kapitell Pilaster montieren",einh:"Stk",preis:95.00,
text:"Stuckkapitell, Pilaster oder Wandpilaster setzen und anspachteln. Klassische Raumgestaltung."},
{id:"P23",kat:"putz",name:"Putzsanierung Altbau Fassade",einh:"m2",preis:48.00,
text:"Schadhafte Altputzflaechen vollstaendig abschlagen, Schutzschlicht, Neuverputz mit restaurierungsgerechtem Kalkzementputz."},
{id:"P24",kat:"putz",name:"WDVS Armierungsputz und Deckputz",einh:"m2",preis:32.00,
text:"WDV-System: Armierungsgewebe einbetten, Armierungsmasse, Deckputz aufbringen. Vollstaendiger Systemaufbau."},
{id:"P25",kat:"putz",name:"Tiefkuehlhausputz waermedaemmend",einh:"m2",preis:55.00,
text:"Spezieller Daemmputz fuer Tiefkuehlbereiche. Waermedaemmend, dampfdiffusionsdicht. Systemgebundener Aufbau."},
{id:"S01",kat:"sonst",name:"Silikon Fugenabdichtung Sanitaerbereich",einh:"lfm",preis:12.00,
text:"Alte Fuge entfernen, reinigen, entfetten, neue Sanitaer-Siliconfuge einbringen und glaetten. Schimmelresistent."},
{id:"S02",kat:"sonst",name:"Acrylfuge Innenbereich Waende",einh:"lfm",preis:8.00,
text:"Acryl-Fugenmasse auf Wandanschluesse und Deckenfugen einbringen. Ueberstreichbar, elastisch."},
{id:"S03",kat:"sonst",name:"Sockelleisten Holz montieren",einh:"lfm",preis:8.00,
text:"MDF- oder Holzsockelleisten schneiden, verdubeln und kleben. Ecken auf Gehrung. Grundiert oder lackiert."},
{id:"S04",kat:"sonst",name:"Schutzfolie und Abdeckung verlegen",einh:"m2",preis:2.20,
text:"Boden und Einrichtung mit PE-Folie oder Malervlies schuetzen. Kanten mit Kreppband."},
{id:"S05",kat:"sonst",name:"Gerueststellen Zimmergeruest auf und ab",einh:"psch",preis:85.00,
text:"Auf- und Abbau Innenraumgeruest fuer Deckenarbeiten bis 6m Hoehe. Systemgeruest mit Sicherheitsbelag."},
{id:"S06",kat:"sonst",name:"Baureinigung nach Gewerk",einh:"psch",preis:95.00,
text:"Endreinigung: Farbreste entfernen, Folien abziehen, Fenster und Beschlaege reinigen, Bauschutt entsorgen."},
{id:"S07",kat:"sonst",name:"Stundenlohn Malerarbeiten Regielohn",einh:"h",preis:68.00,
text:"Regie-Stundenlohn fuer Zusatzarbeiten. Inkl. Werkzeug und Kleinstmengen Material."},
{id:"S08",kat:"sonst",name:"Stundenlohn Trockenbau Regielohn",einh:"h",preis:72.00,
text:"Regie-Stundenlohn Trockenbau fuer Aenderungsleistungen. Inkl. Werkzeug."},
{id:"S09",kat:"sonst",name:"Stundenlohn Putz Stuck Regielohn",einh:"h",preis:75.00,
text:"Regie-Stundenlohn Putz- und Stuckateurarbeiten fuer Sonderanfertigungen und Restaurierungen."},
{id:"S10",kat:"sonst",name:"Farbberatung und Musterflaechen",einh:"psch",preis:120.00,
text:"Farbkonzept und Beratung vor Ort. Bis 5 Farbmuster je 50x50cm aufbringen."}
];

function rechPDF(r){
if(!r){ toast("Keine Rechnung geladen",true); return; }
rechSyncAll();
var s=rechSummen(r); var ku=s.ku; var m0=s.mwst0;
var set=DB.settings();
var firma=esc(set.firma||"Workbase");
var pos=r.positionen||[]; var gruppen={}; var nr=0;
pos.forEach(function(p){ var g=p.gruppe||"Allgemein"; if(!gruppen[g])gruppen[g]=[]; gruppen[g].push(p); });
var rows="";
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
var istA=r.typ==="abschlag"||r.typ==="voraus";
var gueltigBis=r.faellig?new Date(r.faellig).toLocaleDateString("de-DE"):"-";
var html="<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'>"+
"<title>"+rechTypLbl(r.typ)+" "+esc(r.nummer||"")+"</title>"+
"<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e}"+
".pg{max-width:820px;margin:0 auto;padding:32px 40px}"+
".tb{background:#f4f4f8;padding:10px 20px;display:flex;gap:10px;margin-bottom:0}"+
".tb button{background:#1e3a5f;color:#fff;border:none;padding:8px 20px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer}"+
"table{width:100%;border-collapse:collapse}tr:nth-child(even){background:#f8fafc}"+
"th{background:#1e3a5f;color:#fff;padding:9px 8px;text-align:left;font-size:11px}"+
".hinweis{background:#fef9c3;border-left:4px solid #f59e0b;padding:10px 14px;font-size:11px;margin-bottom:14px}"+
"@media print{.tb{display:none}}</style></head><body>"+
"<div class='tb'><button onclick='window.print()'>Drucken / Als PDF speichern</button></div>"+
"<div class='pg'>"+
// Header
"<div style='display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1e3a5f'>"+
"<div><div style='font-size:26px;font-weight:900;color:#1e3a5f'>"+firma+"</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.8;margin-top:6px'>"+esc(set.adr||"")+"<br>"+esc(set.tel||"")+
(set.mail?" • "+esc(set.mail):"")+
(ku?"<br>Kleinunternehmer gem. §19 UStG":(set.ust?"<br>USt-IdNr.: "+esc(set.ust):""))+"</div></div>"+
"<div style='text-align:right'>"+
"<div style='font-size:26px;font-weight:900;color:#1e3a5f'>"+rechTypLbl(r.typ).toUpperCase()+"</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.9;margin-top:6px'>"+
"<strong>Nr.:</strong> "+esc(r.nummer||"")+"<br>"+
"<strong>Datum:</strong> "+fdat(r.datum)+"<br>"+
"<strong>Faellig:</strong> "+gueltigBis+"<br>"+
(r.von?"<strong>Leistungszeitraum:</strong> "+esc(r.von)+(r.bis?" bis "+esc(r.bis):"")+"<br>":"")+
(r.angNummer?"<strong>Angebot:</strong> "+esc(r.angNummer):"")+"</div>"+
"</div>"+
"</div>"+
// Adressen
"<div style='display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px'>"+
"<div style='background:#f8fafc;border-radius:8px;padding:14px'>"+
"<div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px'>Rechnungsempfaenger</div>"+
"<div style='font-size:13px;font-weight:700'>"+esc(r.kundeName||"-")+"</div>"+
"<div style='font-size:11px;color:#6b7280;margin-top:3px;line-height:1.7'>"+esc(r.anschrift||"")+"</div>"+
(r.ansprechpartner?"<div style='font-size:11px;color:#6b7280'>Ansp.: "+esc(r.ansprechpartner)+"</div>":"")+
"</div>"+
"<div style='background:#f8fafc;border-radius:8px;padding:14px'>"+
"<div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px'>Objekt</div>"+
"<div style='font-size:13px;font-weight:700'>"+esc(r.objekt||"-")+"</div>"+
"</div>"+
"</div>"+
// Anschreiben
(r.anschreiben?"<div style='margin-bottom:18px;font-size:12px;line-height:1.7;white-space:pre-wrap'>"+esc(r.anschreiben)+"</div>":"")+
// Positionen
"<table style='margin-bottom:8px'><thead><tr>"+
"<th style='width:36px'>Pos.</th><th>Leistung</th>"+
"<th style='text-align:right;width:70px'>Menge</th>"+
"<th style='text-align:center;width:50px'>Einh.</th>"+
"<th style='text-align:right;width:90px'>EP netto</th>"+
"<th style='text-align:right;width:100px'>Gesamt</th>"+
"</tr></thead><tbody>"+rows+"</tbody></table>"+
// Summen
"<div style='margin-left:auto;width:300px;margin-top:12px;margin-bottom:16px'>"+
(r.rabatt>0?"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>Zwischensumme</span><span>"+eur(s.netto)+"</span></div>":"")+
(r.rabatt>0?"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#ef4444'><span>Rabatt ("+r.rabatt+"%)</span><span>-"+eur(s.rabatt)+"</span></div>":"")+
(istA?"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>"+rechTypLbl(r.typ)+" ("+r.abschlagProz+"%)</span><span>"+eur(s.nettoAbschlag)+"</span></div>":"")+
"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'><span>Nettobetrag</span><span>"+eur(s.nettoAbschlag)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px'>"+
"<span>"+(ku?"MwSt. gem. §19 UStG":m0?"MwSt. 0% (steuerfrei)":"MwSt. 19%")+"</span>"+
"<span>"+eur(s.mwst)+"</span></div>"+
"<div style='display:flex;justify-content:space-between;padding:9px 0;font-size:16px;font-weight:900;border-top:2px solid #1e3a5f;margin-top:3px'>"+
"<span>Gesamtbetrag</span><span>"+eur(s.brutto)+"</span></div>"+
"</div>"+
// Rechtliche Hinweise
(ku?"<div class='hinweis'>Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</div>":"")+
(m0?"<div class='hinweis'>Steuerfreie Leistung gemäß §4 UStG.</div>":"")+
(r.estg?"<div class='hinweis'>Hinweis gemäß §35a EStG: Aufwendungen für Handwerkerleistungen können steuerlich berücksichtigt werden (20% der Lohnkosten, max. 1.200 EUR p.a.).</div>":"")+
// Zahlungsbedingungen
"<div style='background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #1e3a5f;border-radius:0 8px 8px 0;padding:12px 14px;font-size:11px;line-height:1.7;margin-bottom:16px'>"+
"<strong>Zahlungsbedingungen:</strong> Bitte überweisen Sie den Betrag von <strong>"+eur(s.brutto)+"</strong> "+
"bis zum <strong>"+gueltigBis+"</strong> auf untenstehendes Konto. "+
(r.skonto&&r.skontoProz?"Bei Zahlung innerhalb von "+r.skontoTage+" Tagen gewähren wir "+r.skontoProz+"% Skonto ("+eur(s.skontoBetrag)+"). ":"")+
"Bitte geben Sie als Verwendungszweck die Rechnungsnummer <strong>"+esc(r.nummer||"")+"</strong> an.</div>"+
// Bankverbindung
(set.iban?"<div style='font-size:11px;color:#475569;margin-bottom:16px'><strong>Bankverbindung:</strong> IBAN: "+esc(set.iban)+(set.bic?" • BIC: "+esc(set.bic):"")+"</div>":"")+
// Schlusstext
(r.schlusstext?"<div style='margin-top:14px;font-size:12px;line-height:1.7;white-space:pre-wrap'>"+esc(r.schlusstext)+"</div>":"")+
// Unterschrift
"<div style='margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px'>"+
"<div style='border-top:1px solid #1a1a2e;padding-top:6px;font-size:10px;color:#6b7280'>Ort, Datum / Unterschrift Auftragnehmer</div>"+
"<div style='border-top:1px solid #1a1a2e;padding-top:6px;font-size:10px;color:#6b7280'>Ort, Datum / Auftraggeber</div>"+
"</div>"+
"</div></body></html>";

openPDF(html);
}

// ============================================================
// DELEGATES fuer Rechnungsliste
// ============================================================
dlg("r","data-editr",  function(id){ oRechEdit(id); });
dlg("r","data-vorr",   function(id){
var r=DB.rech2().find(function(x){ return x.id===id; }); if(!r) return;
var pc=el("prevContent"); if(pc) pc.innerHTML=rechVorschauHTML(r);
mo("m-prev");
});
dlg("r","data-pdfr",   function(id){
var r=DB.rech2().find(function(x){ return x.id===id; }); if(r) rechPDF(r);
});
dlg("r","data-zahlr",  function(id){ oRechEdit(id); });
dlg("r","data-dupr",   function(id){
var alle=DB.rech2(); var r=alle.find(function(x){ return x.id===id; });
if(!r){ toast("Nicht gefunden",true); return; }
var neu=JSON.parse(JSON.stringify(r));
neu.id=uid(); neu.nummer=genRechNr(); neu.status="offen";
neu.zahlungen=[]; neu.erstellt=Date.now();
alle.push(neu); DB.sRech2(alle); toast("Rechnung dupliziert"); renderRechnungen();
});
dlg("r","data-delr2",  function(id){
iosConfirm("Rechnung loeschen?", function(){
DB.sRech2(DB.rech2().filter(function(x){ return x.id!==id; }));
haptic("error"); toast("Geloescht"); renderRechnungen();
});
});

// 1-Klick aus Angebot -> Rechnung (Button in Angebotsliste)
dlg("a","data-a2rech",function(id){
var a=DB.ang2().find(function(x){ return x.id===id; });
if(!a){ toast("Angebot nicht gefunden",true); return; }
oRechNeu(a); toast("Aus Angebot "+esc(a.nummer)+" erstellt");
});

// ============================================================
// ERWEITERUNGSMODUL v1
// Dashboard, Mahnwesen, Zeiterfassung, Material, Unterschrift
// Textbausteine, Backup/Restore, Kunden-Umsatzhistorie,
// Geraete-Tracker
// ============================================================

// –– DB Erweiterungen ––
DB.zeiten    = function(){ return this.g("mp_zeiten"); };
DB.sZeiten   = function(v){ this.s("mp_zeiten",v); };
DB.material  = function(){ return this.g("mp_mat"); };
DB.sMaterial = function(v){ this.s("mp_mat",v); };
DB.geraete   = function(){ return this.g("mp_geraete"); };
DB.sGeraete  = function(v){ this.s("mp_geraete",v); };
DB.sig       = function(){ return this.g("mp_sig"); };
DB.sSig      = function(v){ this.s("mp_sig",v); };
DB.texte     = function(){ return this.g("mp_texte"); };
DB.sTexte    = function(v){ this.s("mp_texte",v); };

// ============================================================
// DASHBOARD - Umsatz-Statistik
// ============================================================
function renderDash(){
var K=DB.kunden(), P=DB.projekte();
var A=DB.ang2(), R=DB.rech2();
var heute = new Date();
var monat = heute.getMonth(), jahr = heute.getFullYear();

// Summen
var bz  = R.filter(function(x){ return x.status==="bezahlt"; }).reduce(function(s,x){ return s+(x.brutto||0); },0);
var of  = R.filter(function(x){ return x.status==="offen"||x.status==="versendet"; }).reduce(function(s,x){ return s+(x.brutto||0); },0);
var gem = R.filter(function(x){ return x.status==="gemahnt"; }).reduce(function(s,x){ return s+(x.brutto||0); },0);

// Diesen Monat
function imMonat(dat){
if(!dat) return false;
var d = new Date(dat);
return d.getMonth()===monat && d.getFullYear()===jahr;
}
var bzMonat = R.filter(function(x){ return x.status==="bezahlt"&&imMonat(x.datum); }).reduce(function(s,x){ return s+(x.brutto||0); },0);
var angMonat = A.filter(function(x){ return imMonat(x.datum); }).length;
var angAngenommen = A.filter(function(x){ return x.status==="angenommen"; }).length;
var annahmeQuote = A.length>0 ? Math.round(angAngenommen/A.length*100) : 0;

// Letzte 6 Monate Balken-Daten
var monate6 = [];
for(var i=5;i>=0;i--){
var m = monat-i; var j = jahr;
while(m<0){ m+=12; j--; }
var lab = ["Jan","Feb","Mrz","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][m];
var sum = R.filter(function(x){
if(!x.datum) return false;
var d=new Date(x.datum); return d.getMonth()===m&&d.getFullYear()===j&&x.status==="bezahlt";
}).reduce(function(s,x){ return s+(x.brutto||0); },0);
monate6.push({lab:lab,sum:sum});
}
var maxVal = Math.max.apply(null, monate6.map(function(m){ return m.sum; }))||1;

var balken = monate6.map(function(m){
var pct = Math.round(m.sum/maxVal*100);
return "<div class='dash-bar-wrap'>"+
"<div class='dash-bar-val'>"+( m.sum>0 ? eur(m.sum) : "" )+"</div>"+
"<div class='dash-bar-outer'><div class='dash-bar-inner' style='height:"+pct+"%'></div></div>"+
"<div class='dash-bar-lbl'>"+m.lab+"</div>"+
"</div>";
}).join("");

// Ueberfaellige Rechnungen
var ueberfaellig = R.filter(function(x){
return (x.status==="offen"||x.status==="versendet") && x.faellig && new Date(x.faellig)<heute;
});

var ueberfHTML = ueberfaellig.length===0 ? "" :
"<div class='dash-warn'>"+
"<div class='dash-warn-hd'>"+
"<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>"+
" "+ueberfaellig.length+" ueberfaellige Rechnung(en)"+
"</div>"+
ueberfaellig.map(function(r){
var tage = Math.round((heute-new Date(r.faellig))/864e5);
return "<div class='dash-warn-row'>"+
"<span>"+esc(r.nummer||"")+" • "+esc(r.kundeName||"-")+"</span>"+
"<span style='color:#ef4444;font-weight:700'>"+tage+" Tage • "+eur(r.brutto)+"</span>"+
"<button class='ang-btn ang-btn-sm' style='background:#fee2e2;color:#dc2626;border:none;padding:4px 10px;min-height:28px;font-size:11px' data-mahn='"+r.id+"'>Mahnen</button>"+
"</div>";
}).join("")+
"</div>";

el("s-d").innerHTML =
"<div class='ph'><h1>Workbase</h1><p>"+new Date().toLocaleDateString("de-DE")+"</p></div>"+
"<div class='sb'>"+

// KPI-Kacheln
"<div class='dash-kpi-grid'>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Bezahlt gesamt</div>"+
"<div class='dash-kpi-val grn lg'>"+eur(bz)+"</div>"+
"</div>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Offen</div>"+
"<div class='dash-kpi-val yel'>"+eur(of)+"</div>"+
(gem>0?"<div class='dash-trend down'>▼ "+eur(gem)+" gemahnt</div>":"")+
"</div>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Dieser Monat</div>"+
"<div class='dash-kpi-val blu'>"+eur(bzMonat)+"</div>"+
"</div>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Annahme-Quote</div>"+
"<div class='dash-kpi-val blu'>"+annahmeQuote+"%</div>"+
"<div class='dash-trend "+(annahmeQuote>=50?"up":"down")+"'>"+
(annahmeQuote>=50?"▲":"▼")+" "+angMonat+" Angebote</div>"+
"</div>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Kunden</div>"+
"<div class='dash-kpi-val'>"+K.length+"</div>"+
"</div>"+
"<div class='dash-kpi'>"+
"<div class='dash-kpi-lbl'>Rechnungen</div>"+
"<div class='dash-kpi-val'>"+R.length+"</div>"+
"</div>"+
"</div>"+

// Umsatz-Balken
"<div class='ang-card' style='margin-bottom:12px'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe'></span><span class='ang-card-title'>Umsatz letzte 6 Monate (bezahlt)</span></div>"+
"<div class='dash-bar-chart'>"+balken+"</div>"+
"</div>"+

// Ueberfaellig
ueberfHTML+

// Schnellzugriff
"<div class='sec'>Schnellzugriff</div>"+
"<div class='dash-schnell'>"+
"<button class='dash-sn-btn' id='dNK'>"+
"<div class='dash-sn-ic' style='background:rgba(56,189,248,.15)'>👤</div>"+
"<span class='dash-sn-lbl'>+ Kunde</span></button>"+
"<button class='dash-sn-btn' id='dNA'>"+
"<div class='dash-sn-ic' style='background:rgba(249,115,22,.15)'>📄</div>"+
"<span class='dash-sn-lbl'>+ Angebot</span></button>"+
"<button class='dash-sn-btn' id='dNR'>"+
"<div class='dash-sn-ic' style='background:rgba(34,197,94,.15)'>💳</div>"+
"<span class='dash-sn-lbl'>+ Rechnung</span></button>"+
"<button class='dash-sn-btn' id='dNAM'>"+
"<div class='dash-sn-ic' style='background:rgba(167,139,250,.15)'>▦</div>"+
"<span class='dash-sn-lbl'>Aufmass</span></button>"+
"</div>"+
"</div>";

var e=function(id,fn){ var b=el(id); if(b) b.onclick=fn; };
e("dNK",  function(){ oKunde(); });
e("dNA",  function(){ oAngNeu(); });
e("dNR",  function(){ oRechNeu(); });
e("dNAM", function(){ navTo("am"); });
e("dSet", function(){ openSettings(); });
e("dBak", function(){ openBackup(); });

// Mahnen-Buttons
el("s-d").querySelectorAll("[data-mahn]").forEach(function(b){
b.onclick=function(){ oMahnung(this.getAttribute("data-mahn")); };
});
}

// ============================================================
// MAHNWESEN
// ============================================================
function oMahnung(rId){
var r = DB.rech2().find(function(x){ return x.id===rId; });
if(!r){ toast("Nicht gefunden",true); return; }
var set = DB.settings();
var tage = r.faellig ? Math.round((new Date()-new Date(r.faellig))/864e5) : 0;
var mahn = r.mahnstufe||0;
var stufe = mahn+1;
var gebuehr = stufe===1?0:stufe===2?5:15;
var brutto = (r.brutto||0)+gebuehr;

var html = "<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'>"+
"<title>Mahnung "+stufe+". Mahnung "+esc(r.nummer||"")+"</title>"+
"<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e}"+
".pg{max-width:820px;margin:0 auto;padding:32px 40px}"+
".tb{background:#f4f4f8;padding:10px 20px;display:flex;gap:10px}"+
".tb button{background:#1e3a5f;color:#fff;border:none;padding:8px 20px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer}"+
".warn{background:#fee2e2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;font-size:12px}"+
"@media print{.tb{display:none}}</style></head><body>"+
"<div class='tb'><button onclick='window.print()'>Drucken / Als PDF</button></div>"+
"<div class='pg'>"+
"<div style='display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:14px;border-bottom:3px solid #ef4444'>"+
"<div><div style='font-size:22px;font-weight:900;color:#1e3a5f'>"+esc(set.firma||"Workbase")+"</div>"+
"<div style='font-size:11px;color:#6b7280;line-height:1.8;margin-top:6px'>"+esc(set.adr||"")+"<br>"+esc(set.tel||"")+(set.mail?" • "+esc(set.mail):"")+"</div></div>"+
"<div style='text-align:right'>"+
"<div style='font-size:22px;font-weight:900;color:#ef4444'>"+stufe+". MAHNUNG</div>"+
"<div style='font-size:11px;color:#6b7280;margin-top:6px'>Datum: "+new Date().toLocaleDateString("de-DE")+"<br>Re.-Nr.: "+esc(r.nummer||"")+"</div>"+
"</div>"+
"</div>"+
"<div style='background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px'>"+
"<div style='font-size:13px;font-weight:700'>"+esc(r.kundeName||"-")+"</div>"+
"<div style='font-size:11px;color:#6b7280;margin-top:3px'>"+esc(r.anschrift||"")+"</div>"+
"</div>"+
"<div class='warn'>"+
"<strong>"+stufe+". Mahnung – Offene Rechnung Nr. "+esc(r.nummer||"")+"</strong><br>"+
"Trotz unserer Rechnung vom "+fdat(r.datum)+" mit Fälligkeit "+fdat(r.faellig)+" "+
"ist der nachfolgende Betrag bisher nicht eingegangen ("+tage+" Tage überfällig)."+
"</div>"+
"<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>"+
"<thead><tr style='background:#1e3a5f;color:#fff'><th style='padding:9px 10px;text-align:left'>Position</th>"+
"<th style='padding:9px 10px;text-align:right'>Betrag</th></tr></thead>"+
"<tbody>"+
"<tr><td style='padding:8px 10px'>Offener Rechnungsbetrag (Re. "+esc(r.nummer||"")+")</td>"+
"<td style='padding:8px 10px;text-align:right'>"+eur(r.brutto||0)+"</td></tr>"+
(gebuehr>0?"<tr><td style='padding:8px 10px;color:#ef4444'>Mahngebuehr (Mahnstufe "+stufe+")</td>"+
"<td style='padding:8px 10px;text-align:right;color:#ef4444'>"+eur(gebuehr)+"</td></tr>":"")+
"<tr style='border-top:2px solid #1e3a5f'><td style='padding:10px;font-weight:900;font-size:14px'>Gesamtbetrag</td>"+
"<td style='padding:10px;text-align:right;font-weight:900;font-size:14px;color:#ef4444'>"+eur(brutto)+"</td></tr>"+
"</tbody>"+
"</table>"+
"<div style='background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #ef4444;padding:12px 14px;font-size:11px;line-height:1.8;margin-bottom:16px'>"+
"<strong>Bitte überweisen Sie den Betrag von "+eur(brutto)+" bis zum "+
new Date(Date.now()+7*864e5).toLocaleDateString("de-DE")+" (Zahlungsfrist: 7 Tage).</strong><br>"+
"Verwendungszweck: "+esc(r.nummer||"")+" Mahnung "+stufe+"<br>"+
(set.iban?"IBAN: "+esc(set.iban)+(set.bic?" • BIC: "+esc(set.bic):""):"")+"</div>"+
"<p style='font-size:11px;color:#6b7280'>Sollten Sie den Betrag bereits überwiesen haben, bitten wir Sie dieses Schreiben als gegenstandslos zu betrachten. "+
"Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>"+
(stufe>=2?"<p style='font-size:11px;color:#ef4444;margin-top:10px;font-weight:700'>Bei weiterer Nichtbegleichung behalten wir uns rechtliche Schritte vor.</p>":"")+
"</div></body></html>";

// Mahnstufe erhoehen + speichern
var alle=DB.rech2(); var idx=alle.findIndex(function(x){ return x.id===rId; });
if(idx>=0){ alle[idx].mahnstufe=(alle[idx].mahnstufe||0)+1; alle[idx].status="gemahnt"; DB.sRech2(alle); }
toast("Mahnstufe "+(mahn+1)+" gesetzt");

openPDF(html);
renderRechnungen();
}

// ============================================================
// ZEITERFASSUNG
// ============================================================
function renderZeiterfassung(){
var Z = DB.zeiten();
var P = DB.projekte();
var projOpts = "<option value=''>– Projekt –</option>"+
P.map(function(p){ return "<option value='"+p.id+"'>"+esc(p.name)+"</option>"; }).join("");

// Summen pro Projekt
var projSummen = {};
Z.forEach(function(z){
if(!projSummen[z.pid]) projSummen[z.pid]={stunden:0,name:""};
projSummen[z.pid].stunden += parseFloat(z.stunden)||0;
var p=P.find(function(x){ return x.id===z.pid; });
if(p) projSummen[z.pid].name=p.name;
});

var zeilen = Z.length===0
? "<div class='ang-pos-empty'>Noch keine Zeiten erfasst.</div>"
: Z.slice().reverse().map(function(z,i){
var p=P.find(function(x){ return x.id===z.pid; });
var pName=p?p.name:"-";
return "<div class='ang-pos-row'>"+
"<div class='ang-pos-bez'><div class='ang-pos-nm'>"+esc(z.beschr||"Arbeit")+"</div>"+
"<div class='ang-pos-sub'>"+esc(pName)+" • "+esc(z.datum||"")+"</div></div>"+
"<div style='font-size:14px;font-weight:700;color:#1e3a5f;min-width:60px;text-align:right'>"+
(parseFloat(z.stunden)||0).toFixed(2)+" h</div>"+
"<div style='font-size:13px;color:#94a3b8;min-width:70px;text-align:right'>"+eur((parseFloat(z.stunden)||0)*(parseFloat(z.stundensatz)||0))+"</div>"+
"<button class='ang-pos-del' data-delzeit='"+z.id+"'><svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>"+
"</div>";
}).join("");

var sumHTML = Object.keys(projSummen).map(function(pid){
var ps=projSummen[pid];
return "<div class='ang-sum-row'><span>"+esc(ps.name||"-")+"</span><span>"+ps.stunden.toFixed(2)+" h</span></div>";
}).join("");

el("s-zeit").innerHTML =
"<div class='ph'><h1>Zeiterfassung</h1></div>"+
"<div class='sb'>"+
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#8b5cf6'></span><span class='ang-card-title'>Zeit erfassen</span></div>"+
"<div class='ang-form-grid'>"+
"<div class='ang-fg'><label class='ang-lbl'>Datum</label>"+
"<input id='ztDat' class='ang-input' type='date' value='"+new Date().toISOString().slice(0,10)+"'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Projekt</label>"+
"<select id='ztPrj' class='ang-input'>"+projOpts+"</select></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Beschreibung</label>"+
"<input id='ztBeschr' class='ang-input' type='text' placeholder='z.B. Malerarbeiten Wohnzimmer' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Stunden</label>"+
"<input id='ztStd' class='ang-input' type='number' min='0' step='0.25' placeholder='0.00'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Stundensatz (EUR)</label>"+
"<input id='ztSatz' class='ang-input' type='number' min='0' step='1' placeholder='45'></div>"+
"</div>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='ztAddBtn' style='margin-top:6px'>+ Zeit speichern</button>"+
"</div>"+
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#8b5cf6'></span><span class='ang-card-title'>Zeiten</span>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='ztRechBtn' style='margin-left:auto'>-> Rechnung</button></div>"+
"<div id='ztListe'>"+zeilen+"</div>"+
(sumHTML?"<div class='ang-summen-block'>"+sumHTML+"</div>":"")+
"</div>"+
"</div>";

var b=el("ztAddBtn");
if(b) b.onclick=function(){
var pid=el("ztPrj")?el("ztPrj").value:"";
var std=parseFloat(el("ztStd")?el("ztStd").value:0)||0;
if(!std){ toast("Stunden eingeben",true); return; }
var Z2=DB.zeiten();
Z2.push({id:uid(),pid:pid,datum:gv("ztDat"),beschr:gv("ztBeschr"),
stunden:std,stundensatz:parseFloat(gv("ztSatz"))||0});
DB.sZeiten(Z2); toast("Zeit gespeichert"); renderZeiterfassung();
};

var r2=el("ztRechBtn");
if(r2) r2.onclick=function(){
var pid=el("ztPrj")?el("ztPrj").value:"";
var p=DB.projekte().find(function(x){ return x.id===pid; });
var zeiten=DB.zeiten().filter(function(z){ return !pid||z.pid===pid; });
if(!zeiten.length){ toast("Keine Zeiten ausgewaehlt",true); return; }
var positionen=zeiten.map(function(z){
return {id:uid(),name:z.beschr||"Arbeitszeit "+esc(z.datum||""),
einh:"h",menge:parseFloat(z.stunden)||0,
ep:parseFloat(z.stundensatz)||0,gruppe:"Zeiterfassung"};
});
var dummy={positionen:positionen,kundeName:p?"":" ",objekt:p?p.name:""};
oRechNeu(dummy); toast("Rechnung aus Zeiterfassung erstellt");
};

el("s-zeit").querySelectorAll("[data-delzeit]").forEach(function(b){
b.onclick=function(){
var Z2=DB.zeiten().filter(function(z){ return z.id!==this.getAttribute("data-delzeit"); },this);
DB.sZeiten(Z2); renderZeiterfassung();
};
});
}

// ============================================================
// MATERIALLISTE
// ============================================================

// ================================================================
// MATERIAL-KATALOG (neu strukturiert)
// ================================================================
var MAT_KATEGORIEN = ["Farbe / Lack","Putz / Moertel","Grundierung",
"Klarlack / Lasur","Dichtstoff","Zatzbehoer","Sonstiges"];
var MAT_EINHEITEN  = ["l (Liter)","kg","m2","Stueck","Rolle","Sack","Eimer","Kartusche"];
var MAT_MARKEN_VORDEFINIERT = ["Brillux","Caparol","Sto","Sigma","Akzo Nobel","Profitec","Conpart"];

function renderMaterial(){
var M = DB.material();
var P = DB.projekte();
var matFilter = window._matFilter||"alle";
var matSrch   = window._matSrch||"";

// Alle Marken extrahieren
var marken = ["alle"];
M.forEach(function(m){ if(m.marke&&marken.indexOf(m.marke)<0) marken.push(m.marke); });
MAT_MARKEN_VORDEFINIERT.forEach(function(mk){ if(marken.indexOf(mk)<0&&M.find(function(m){return m.marke===mk;})) marken.push(mk); });

// Filter anwenden
var gefiltert = M;
if(matFilter!=="alle") gefiltert=gefiltert.filter(function(m){ return m.marke===matFilter; });
if(matSrch) gefiltert=gefiltert.filter(function(m){
return (m.name+m.marke+m.kategorie).toLowerCase().indexOf(matSrch.toLowerCase())>=0;
});

var markenTabs = marken.map(function(mk){
var lbl = mk==="alle"?"Alle":mk;
return "<button class='ang-kat-tab"+(matFilter===mk?" ang-kat-tab-on":"")+"' data-matflt='"+esc(mk)+"'>"+esc(lbl)+"</button>";
}).join("");

var karten = gefiltert.length===0
? "<div class='ang-pos-empty' style='grid-column:1/-1'>Keine Materialien gefunden.</div>"
: gefiltert.map(function(m){
// Preis pro Einheit berechnen
var ep = parseFloat(m.preisGebinde)||0;
var gb = parseFloat(m.gebindeGr)||1;
var verbrauch = parseFloat(m.verbrauch)||1;
var aufschlag = 1+(parseFloat(m.aufschlag)||0)/100;
var epEinheit = gb>0 ? ep/gb : 0;
var vkEinheit = epEinheit * verbrauch * aufschlag;
var epM2 = verbrauch>0 ? epEinheit*verbrauch : 0;
var vkM2 = epM2*aufschlag;


return "<div class='mat-karte'>"+
  "<div class='mat-karte-top'>"+
    "<div class='mat-karte-nm'>"+esc(m.name||"Material")+"</div>"+
    (m.marke?"<span class='mat-marke-badge'>"+esc(m.marke)+"</span>":"")+
    "<span class='mat-kat-badge'>"+esc(m.kategorie||"Sonstiges")+"</span>"+
  "</div>"+
  "<div class='mat-karte-row'>"+
    "<span class='mat-kl'>Gebinde: "+esc(String(m.gebindeGr||"-"))+" "+esc(m.einheit||"")+"</span>"+
    "<span class='mat-kl'>Verbrauch: "+esc(String(m.verbrauch||"-"))+" "+esc(m.verbrauchEinh||"l/m2")+"</span>"+
  "</div>"+
  "<div class='mat-karte-row'>"+
    "<span class='mat-kl'>Preis: "+eur(ep)+" &euro;/Gebinde</span>"+
  "</div>"+
  (epM2>0?
    "<div class='mat-karte-preise'>"+
      "<span>&asymp;"+eur(epM2)+" &euro;/m&sup2; (EK) &middot; VK "+eur(vkM2)+" &euro;</span>"+
    "</div>":"")+
  "<div class='mat-karte-btns'>"+
    "<button class='ang-btn ang-btn-sec ang-btn-sm' data-editmat='"+m.id+"'>Bearbeiten</button>"+
  "</div>"+
"</div>";


}).join("");

el("s-mat").innerHTML =
"<div class='ph'>"+
"<div style='flex:1'><h1>Material-Katalog</h1><p>"+M.length+" Materialien</p></div>"+
"<div style='display:flex;gap:8px'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='matPreisBtn'>↗ Preisanpassung</button>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='matNeuBtn'>+ Material</button>"+
"</div>"+
"</div>"+
"<div class='sb'>"+
"<div class='ang-input-sm' style='width:100%;margin-bottom:10px;position:relative;display:flex'>"+
"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' style='position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#94a3b8;pointer-events:none'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>"+
"<input id='matSrchInp' class='ang-input' style='padding-left:36px' placeholder='Material suchen...' value='"+esc(matSrch)+"'>"+
"</div>"+
"<div class='ang-kat-tabs' style='margin-bottom:12px'>"+markenTabs+"</div>"+
"<div class='mat-grid'>"+karten+"</div>"+
"</div>";

var nb=el("matNeuBtn"); if(nb) nb.onclick=function(){ openMatForm(null); };
var pb=el("matPreisBtn"); if(pb) pb.onclick=function(){ openMatPreisanpassung(); };
var si=el("matSrchInp");
if(si) si.oninput=function(){ window._matSrch=this.value; renderMaterial(); };
el("s-mat").querySelectorAll("[data-matflt]").forEach(function(b){
b.onclick=function(){ window._matFilter=this.getAttribute("data-matflt"); renderMaterial(); };
});
el("s-mat").querySelectorAll("[data-editmat]").forEach(function(b){
b.onclick=function(){ openMatForm(this.getAttribute("data-editmat")); };
});
}

function openMatForm(id){
var m = id ? (DB.material().find(function(x){ return x.id===id; })||{}) : {};
var isEdit = !!id;

var katOpts = MAT_KATEGORIEN.map(function(k){
return "<option value='"+esc(k)+"'"+(m.kategorie===k?" selected":"")+">"+esc(k)+"</option>";
}).join("");
var einOpts = MAT_EINHEITEN.map(function(e){
return "<option value='"+esc(e)+"'"+(m.einheit===e?" selected":"")+">"+esc(e)+"</option>";
}).join("");
var veinOpts = ["l/m2","kg/m2","m2/m2","Stueck/m2"].map(function(e){
return "<option value='"+esc(e)+"'"+(m.verbrauchEinh===e?" selected":"")+">"+esc(e)+"</option>";
}).join("");

var formHTML =
"<div class='mh'></div>"+
"<div style='padding:0 16px'>"+
"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px'>MATERIAL-KATALOG</div>"+
"<h2 style='font-size:18px;font-weight:700;color:#1e3a5f;margin-bottom:16px'>"+(isEdit?"Material bearbeiten":"Material anlegen")+"</h2>"+

"<div class='ang-fg' style='margin-bottom:10px'><label class='ang-lbl'>Name *</label>"+
"<input id='mfNm' class='ang-input' type='text' placeholder='z. B. Innenfarbe weiss, matt 10 l' value='"+esc(m.name||"")+"' autocomplete='off'></div>"+
"<div class='ang-form-grid' style='margin-bottom:10px'>"+
"<div class='ang-fg'><label class='ang-lbl'>Marke</label>"+
"<input id='mfMarke' class='ang-input' type='text' placeholder='Brillux, Caparol ...' value='"+esc(m.marke||"")+"' list='matMarkenList' autocomplete='off'>"+
"<datalist id='matMarkenList'>"+MAT_MARKEN_VORDEFINIERT.map(function(mk){ return "<option value='"+esc(mk)+"'>"; }).join("")+"</datalist>"+
"</div>"+
"<div class='ang-fg'><label class='ang-lbl'>Kategorie</label>"+
"<select id='mfKat' class='ang-input'>"+katOpts+"</select></div>"+
"</div>"+

"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin:12px 0 8px'>GEBINDE</div>"+
"<div class='ang-form-grid' style='margin-bottom:6px'>"+
"<div class='ang-fg'><label class='ang-lbl'>Gebaeudegroesse</label>"+
"<input id='mfGb' class='ang-input' type='number' min='0' step='0.1' placeholder='z. B. 25' value='"+(m.gebindeGr||"")+"'>"+
"<span style='font-size:11px;color:#94a3b8;margin-top:3px'>Menge pro Gebinde (z.B. 25 fuer 25-kg-Sack)</span></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Einheit</label>"+
"<select id='mfEin' class='ang-input'>"+einOpts+"</select></div>"+
"</div>"+
"<div class='ang-fg' style='margin-bottom:4px'><label class='ang-lbl'>Preis pro Gebinde (€)</label>"+
"<input id='mfPreis' class='ang-input' type='number' min='0' step='0.01' placeholder='z. B. 32,50' value='"+(m.preisGebinde||"")+"'>"+
"<span style='font-size:11px;color:#94a3b8;margin-top:3px'>Was kostet ein Eimer / Sack / Kartusche?</span></div>"+

"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin:12px 0 8px'>VERBRAUCH & AUFSCHLAG</div>"+
"<div class='ang-form-grid' style='margin-bottom:6px'>"+
"<div class='ang-fg'><label class='ang-lbl'>Verbrauch pro Einheit</label>"+
"<input id='mfVerbr' class='ang-input' type='number' min='0' step='0.01' placeholder='z. B. 1,2' value='"+(m.verbrauch||"")+"'>"+
"<span style='font-size:11px;color:#94a3b8;margin-top:3px'>Wieviel Material wird pro Einheit verbraucht?</span></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Verbrauchseinheit</label>"+
"<select id='mfVEin' class='ang-input'>"+veinOpts+"</select></div>"+
"</div>"+
"<div class='ang-fg' style='margin-bottom:4px'><label class='ang-lbl'>Aufschlag (%)</label>"+
"<input id='mfAuf' class='ang-input' type='number' min='0' max='200' step='5' placeholder='z. B. 40' value='"+(m.aufschlag||"")+"'></div>"+

"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin:12px 0 8px'>DETAILS (OPTIONAL)</div>"+
"<div class='ang-form-grid' style='margin-bottom:10px'>"+
"<div class='ang-fg'><label class='ang-lbl'>Lieferant</label>"+
"<input id='mfLief' class='ang-input' type='text' value='"+esc(m.lieferant||"")+"' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Art.-Nr. / SKU</label>"+
"<input id='mfSKU' class='ang-input' type='text' value='"+esc(m.sku||"")+"' autocomplete='off'></div>"+
"</div>"+

"<div style='display:flex;gap:10px;padding-bottom:16px'>"+
"<button class='ang-btn ang-btn-sec ang-btn-full' id='mfAbbr'>Abbrechen</button>"+
(isEdit?"<button class='ang-btn ang-btn-del ang-btn-sm' id='mfDel'>Loeschen</button>":"")+
"<button class='ang-btn ang-btn-pri ang-btn-full ang-save-main' id='mfSav'>Speichern</button>"+
"</div>"+
"</div>";

// Modal oeffnen
var modal_el = document.getElementById("m-matform");
if(!modal_el){
modal_el = document.createElement("div");
modal_el.id = "m-matform"; modal_el.className = "mov";
modal_el.innerHTML = "<div class='modal' style='max-width:560px'></div>";
document.body.appendChild(modal_el);
}
modal_el.querySelector(".modal").innerHTML = formHTML;
mo("m-matform");

var ab=document.getElementById("mfAbbr"); if(ab) ab.onclick=function(){ mc("m-matform"); };
var sv2=document.getElementById("mfSav");
if(sv2) sv2.onclick=function(){
var nm=document.getElementById("mfNm")?document.getElementById("mfNm").value.trim():"";
if(!nm){ toast("Name erforderlich",true); return; }
var M2=DB.material();
var newM={
id: id||uid(), name:nm,
marke: document.getElementById("mfMarke")?document.getElementById("mfMarke").value:"",
kategorie: document.getElementById("mfKat")?document.getElementById("mfKat").value:"",
gebindeGr: parseFloat(document.getElementById("mfGb")?document.getElementById("mfGb").value:0)||0,
einheit: document.getElementById("mfEin")?document.getElementById("mfEin").value:"",
preisGebinde: parseFloat(document.getElementById("mfPreis")?document.getElementById("mfPreis").value:0)||0,
verbrauch: parseFloat(document.getElementById("mfVerbr")?document.getElementById("mfVerbr").value:0)||0,
verbrauchEinh: document.getElementById("mfVEin")?document.getElementById("mfVEin").value:"",
aufschlag: parseFloat(document.getElementById("mfAuf")?document.getElementById("mfAuf").value:0)||0,
lieferant: document.getElementById("mfLief")?document.getElementById("mfLief").value:"",
sku: document.getElementById("mfSKU")?document.getElementById("mfSKU").value:""
};
var idx=M2.findIndex(function(x){ return x.id===newM.id; });
if(idx>=0) M2[idx]=newM; else M2.push(newM);
DB.sMaterial(M2); mc("m-matform"); toast("Material gespeichert"); renderMaterial();
};
var dl=document.getElementById("mfDel");
if(dl) dl.onclick=function(){
iosConfirm("Material loeschen?", function(){
DB.sMaterial(DB.material().filter(function(x){ return x.id!==id; }));
mc("m-matform"); renderMaterial(); haptic("error"); toast("Geloescht");
});
};
}

function openMatPreisanpassung(){
var M=DB.material();
var modal_el=document.getElementById("m-matpreis");
if(!modal_el){
modal_el=document.createElement("div"); modal_el.id="m-matpreis"; modal_el.className="mov";
modal_el.innerHTML="<div class='modal' style='max-width:460px'></div>";
document.body.appendChild(modal_el);
}

var kats=["alle"].concat(MAT_KATEGORIEN);
var katOpts=kats.map(function(k){
return "<option value='"+esc(k)+"'>"+esc(k==="alle"?"Alle Kategorien":k)+"</option>";
}).join("");

modal_el.querySelector(".modal").innerHTML=
"<div class='mh'></div>"+
"<div style='padding:0 16px 16px'>"+
"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px'>MATERIAL-KATALOG</div>"+
"<h2 style='font-size:18px;font-weight:700;color:#1e3a5f;margin-bottom:16px'>Preisanpassung</h2>"+
"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px'>GELTUNGSBEREICH</div>"+
"<div style='display:flex;gap:8px;margin-bottom:12px'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='mpAll'>Alle Materialien</button>"+
"<select id='mpKat' class='ang-input' style='flex:1'>"+katOpts+"</select>"+
"</div>"+
"<div style='font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px'>ANPASSUNG</div>"+
"<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'>"+
"<input id='mpProz' class='ang-input ang-input-sm' type='number' step='0.5' placeholder='z.B. 5' style='width:80px'>"+
"<span style='font-size:14px;font-weight:700'>%</span>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='mpVorschau'>Vorschau anzeigen</button>"+
"</div>"+
"<div style='font-size:11px;color:#94a3b8;margin-bottom:12px'>Positiv (+) = Erhoehung · Negativ (−) = Senkung des Einkaufspreises</div>"+
"<div id='mpVorschauBox' style='display:none;background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:12px;max-height:200px;overflow-y:auto'></div>"+
"<div style='display:flex;gap:10px'>"+
"<button class='ang-btn ang-btn-sec ang-btn-full' id='mpAbbr'>Abbrechen</button>"+
"<button class='ang-btn ang-btn-pri ang-btn-full ang-save-main' id='mpAnw'>Anwenden</button>"+
"</div></div>";

mo("m-matpreis");
document.getElementById("mpAbbr").onclick=function(){ mc("m-matpreis"); };
document.getElementById("mpAll").onclick=function(){ document.getElementById("mpKat").value="alle"; };
document.getElementById("mpVorschau").onclick=function(){
var proz=parseFloat(document.getElementById("mpProz").value)||0;
var kat=document.getElementById("mpKat").value;
var M2=DB.material().filter(function(m){ return kat==="alle"||m.kategorie===kat; });
var html=M2.map(function(m){
var neu=Math.round((parseFloat(m.preisGebinde)||0)*(1+proz/100)*100)/100;
return "<div style='display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid #f1f5f9'>"+
"<span>"+esc(m.name||"")+"</span>"+
"<span>"+eur(m.preisGebinde||0)+" → <strong>"+eur(neu)+"</strong></span></div>";
}).join("");
var vb=document.getElementById("mpVorschauBox");
vb.innerHTML=html||"Keine Materialien"; vb.style.display="block";
};
document.getElementById("mpAnw").onclick=function(){
var proz=parseFloat(document.getElementById("mpProz").value)||0;
if(!proz){ toast("Prozentsatz eingeben",true); return; }
var kat=document.getElementById("mpKat").value;
iosConfirmNeutral("Preise anpassen um "+proz+"%?", "Anpassen", function(){
var M2=DB.material().map(function(m){
if(kat!=="alle"&&m.kategorie!==kat) return m;
var neu=Math.round((parseFloat(m.preisGebinde)||0)*(1+proz/100)*100)/100;
return Object.assign({},m,{preisGebinde:neu});
});
DB.sMaterial(M2); mc("m-matpreis"); toast("Preise angepasst"); renderMaterial();
}); // iosConfirmNeutral
};
}

function renderGeraete(){
var G = DB.geraete();
var P = DB.projekte();
var projOpts = "<option value=''>– Keinem Projekt –</option>"+
P.map(function(p){ return "<option value='"+p.id+"'>"+esc(p.name)+"</option>"; }).join("");

var zeilen = G.length===0
? "<div class='ang-pos-empty'>Noch keine Geraete/Werkzeuge erfasst.</div>"
: G.map(function(g){
var p=g.pid?P.find(function(x){ return x.id===g.pid; }):null;
var statusCls={verfuegbar:"ang-badge-grn",im_einsatz:"ang-badge-blu",wartung:"ang-badge-yel",defekt:"ang-badge-red"}[g.status]||"ang-badge-yel";
var statusLbl={verfuegbar:"Verfuegbar",im_einsatz:"Im Einsatz",wartung:"Wartung",defekt:"Defekt"}[g.status]||"Unbekannt";
return "<div class='ang-karte'>"+
"<div class='ang-karte-top'>"+
"<div class='ang-karte-left'>"+
"<div class='ang-karte-nr'>"+esc(g.name||"Geraet")+"</div>"+
(g.seriennr?"<div class='ang-karte-kunde'>S/N: "+esc(g.seriennr)+"</div>":"")+
(p?"<div class='ang-karte-obj'>Projekt: "+esc(p.name)+"</div>":"")+
(g.naechsteWartung?"<div class='ang-karte-dat'>Wartung: "+fdat(g.naechsteWartung)+"</div>":"")+
"</div>"+
"<div class='ang-karte-right'>"+
"<span class='ang-badge "+statusCls+"'>"+statusLbl+"</span>"+
"</div>"+
"</div>"+
"<div class='ang-karte-btns'>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-editg='"+g.id+"'>Bearbeiten</button>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' data-delg='"+g.id+"'>Loeschen</button>"+
"</div>"+
"</div>";
}).join("");

el("s-ger").innerHTML =
"<div class='ph'><h1>Geraete & Werkzeug</h1></div>"+
"<div class='sb'>"+
"<div class='ang-card'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe' style='background:#0891b2'></span><span class='ang-card-title'>Geraet / Werkzeug</span></div>"+
"<div class='ang-form-grid'>"+
"<div class='ang-fg'><label class='ang-lbl'>Bezeichnung</label>"+
"<input id='gerNm' class='ang-input' type='text' placeholder='z.B. Flex, Leiter, Kompressor' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Seriennummer</label>"+
"<input id='gerSN' class='ang-input' type='text' autocomplete='off'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Status</label>"+
"<select id='gerStatus' class='ang-input'>"+
"<option value='verfuegbar'>Verfuegbar</option>"+
"<option value='im_einsatz'>Im Einsatz</option>"+
"<option value='wartung'>Wartung</option>"+
"<option value='defekt'>Defekt</option>"+
"</select></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Zugewiesen an Projekt</label>"+
"<select id='gerPrj' class='ang-input'>"+projOpts+"</select></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Naechste Wartung</label>"+
"<input id='gerWartung' class='ang-input' type='date'></div>"+
"<div class='ang-fg'><label class='ang-lbl'>Notiz</label>"+
"<input id='gerNote' class='ang-input' type='text' autocomplete='off'></div>"+
"</div>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='gerAddBtn' style='margin-top:6px'>+ Geraet speichern</button>"+
"</div>"+
zeilen+
"</div>";

var ba=el("gerAddBtn");
if(ba) ba.onclick=function(){
var nm=gv("gerNm"); if(!nm){ toast("Bezeichnung eingeben",true); return; }
var G2=DB.geraete();
G2.push({id:uid(),name:nm,seriennr:gv("gerSN"),status:gv("gerStatus")||"verfuegbar",
pid:gv("gerPrj"),naechsteWartung:gv("gerWartung"),note:gv("gerNote")});
DB.sGeraete(G2); toast("Geraet gespeichert"); renderGeraete();
};

el("s-ger").querySelectorAll("[data-delg]").forEach(function(b){
b.onclick=function(){
var G2=DB.geraete().filter(function(g){ return g.id!==this.getAttribute("data-delg"); },this);
DB.sGeraete(G2); renderGeraete();
};
});
}

// ============================================================
// KUNDEN - Umsatzhistorie (renderKunden erweitern)
// ============================================================
function kundeUmsatz(kid){
var A=DB.ang2().filter(function(a){ return a.kundeId===kid; });
var R=DB.rech2().filter(function(r){ return r.kundeId===kid; });
var bz=R.filter(function(r){ return r.status==="bezahlt"; }).reduce(function(s,r){ return s+(r.brutto||0); },0);
var of=R.filter(function(r){ return r.status!=="bezahlt"&&r.status!=="storniert"; }).reduce(function(s,r){ return s+(r.brutto||0); },0);
return {angebote:A.length,rechnungen:R.length,bezahlt:bz,offen:of};
}

// ============================================================
// BACKUP / RESTORE
// ============================================================
function openBackup(){
var bkpHtml =
"<div class='ang-card' style='margin:16px'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe'></span><span class='ang-card-title'>Backup & Restore</span></div>"+
"<p style='font-size:13px;color:#475569;margin-bottom:14px;line-height:1.6'>Alle Daten als JSON exportieren oder eine gespeicherte Datei wiederherstellen. <strong>Achtung:</strong> Restore überschreibt alle vorhandenen Daten.</p>"+
"<div style='display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px'>"+
"<button class='ang-btn ang-btn-pri ang-btn-sm' id='bkpExport'>⇓ Backup herunterladen</button>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' id='bkpImportBtn'>↑ Backup laden (Restore)</button>"+
"</div>"+
"<input id='bkpFileInput' type='file' accept='.json' style='display:none'>"+
"<div id='bkpStatus' style='font-size:12px;color:#16a34a;min-height:20px'></div>"+
"</div>";

var m=el("m-bkp");
if(!m){
var div=document.createElement("div");
div.id="m-bkp"; div.className="mov";
div.innerHTML="<div class='modal' style='max-width:500px'>"+bkpHtml+"<button class='btn bg2' id='bkpClose' style='margin:0 16px 16px'>Schliessen</button></div>";
document.body.appendChild(div);
} else {
m.querySelector(".modal").innerHTML=bkpHtml+"<button class='btn bg2' id='bkpClose' style='margin:0 16px 16px'>Schliessen</button>";
}
mo("m-bkp");

el("bkpClose").onclick=function(){ mc("m-bkp"); };

el("bkpExport").onclick=function(){
var d={
ts:new Date().toISOString(),v:2,
kunden:DB.kunden(), projekte:DB.projekte(),
angebote:DB.angebote(), ang2:DB.ang2(),
rechnungen:DB.rechnungen(), rech2:DB.rech2(),
notizen:DB.notizen(), katalog:DB.katalog(),
settings:DB.settings(), vorlagen:DB.vorlagen(),
zeiten:DB.zeiten(), material:DB.material(),
geraete:DB.geraete(), sig:DB.sig(), texte:DB.texte()
};
try{
var b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
var u=URL.createObjectURL(b);
var a=document.createElement("a");
a.href=u; a.download="Workbase-Backup-"+new Date().toISOString().slice(0,10)+".json";
document.body.appendChild(a); a.click();
setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u); },500);
el("bkpStatus").textContent="Backup erfolgreich heruntergeladen.";
toast("Backup gespeichert");
}catch(e){ toast("Fehler: "+e.message,true); }
};

el("bkpImportBtn").onclick=function(){ el("bkpFileInput").click(); };

el("bkpFileInput").onchange=function(){
var f=this.files[0]; if(!f) return;
var rd=new FileReader();
rd.onload=function(e){
try{
var d=JSON.parse(e.target.result);
if(!d.ts){ toast("Ungueltige Backup-Datei",true); return; }
iosConfirmNeutral("Alle Daten werden ueberschrieben. Fortfahren?", "Fortfahren", function(){
if(d.kunden)   DB.s("mp_kunden",d.kunden);
if(d.projekte) DB.s("mp_projekte",d.projekte);
if(d.angebote) DB.s("mp_angebote",d.angebote);
if(d.ang2)     DB.s("mp_ang2",d.ang2);
if(d.rechnungen) DB.s("mp_rechnungen",d.rechnungen);
if(d.rech2)    DB.s("mp_rech2",d.rech2);
if(d.notizen)  DB.s("mp_notizen",d.notizen);
if(d.settings) DB.s("mp_settings",d.settings);
if(d.vorlagen) DB.s("mp_vorl",d.vorlagen);
if(d.zeiten)   DB.s("mp_zeiten",d.zeiten);
if(d.material) DB.s("mp_mat",d.material);
if(d.geraete)  DB.s("mp_geraete",d.geraete);
if(d.sig)      DB.s("mp_sig",d.sig);
if(d.texte)    DB.s("mp_texte",d.texte);
el("bkpStatus").textContent="Restore erfolgreich! Bitte App neu laden.";
toast("Restore erfolgreich");
setTimeout(function(){ location.reload(); },1500);
});
}catch(e){ toast("Fehler beim Lesen: "+e.message,true); }
};
rd.readAsText(f);
};
}

// ============================================================
// UNTERSCHRIFTEN-VERWALTUNG (global)
// ============================================================
function openSigVerwaltung(){
var sig = DB.sig();
var sigHTML = sig
? "<div style='margin-bottom:12px'>"+
"<p style='font-size:12px;color:#475569;margin-bottom:8px'>Gespeicherte Unterschrift:</p>"+
"<img src='"+sig+"' style='max-width:100%;max-height:100px;border:1px solid #e2e8f0;border-radius:8px'>"+
"<br><button class='ang-btn ang-btn-del ang-btn-sm' id='sigDelBtn' style='margin-top:8px'>Unterschrift loeschen</button>"+
"</div>"
: "<p style='font-size:13px;color:#94a3b8;margin-bottom:12px'>Noch keine globale Unterschrift gespeichert.</p>";

var panel=el("m-sig");
if(panel){
var inner=panel.querySelector(".modal");
if(inner) inner.innerHTML=
"<div class='mh'></div>"+
"<h2>Unterschrift verwalten</h2>"+
"<p style='font-size:13px;color:var(--mut);margin-bottom:12px'>Einmal speichern – wird in allen PDFs verwendet.</p>"+
sigHTML+
"<div style='border:2px solid var(--bdr);border-radius:10px;background:#fafafa;margin-bottom:10px;position:relative;min-height:160px'>"+
"<canvas id='sigCanvas' style='display:block;width:100%;height:160px;touch-action:none;cursor:crosshair;border-radius:8px'></canvas>"+
"<div id='sigPh' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#cbd5e1;font-size:13px;pointer-events:none;white-space:nowrap'>Hier unterschreiben…</div>"+
"</div>"+
"<div class='row' style='gap:8px;margin-bottom:12px'>"+
"<button class='btn bg2' id='sigClearBtn'>Loeschen</button>"+
"<button class='btn bp' id='sigSaveBtn'>Global speichern</button>"+
"</div>"+
"<button class='btn bg2' id='sigCancelBtn'>Schliessen</button>";
}
mo("m-sig");

if(el("sigDelBtn")) el("sigDelBtn").onclick=function(){
DB.sSig(""); toast("Unterschrift geloescht"); openSigVerwaltung();
};

// Canvas neu initialisieren
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
function getP(e){ var r=cv.getBoundingClientRect(); var s=e.touches?e.touches[0]:e; return {x:s.clientX-r.left,y:s.clientY-r.top}; }
cv.onmousedown=function(e){ cv._has=true; cv._draw=true; var p2=el("sigPh"); if(p2)p2.style.display="none"; var p=getP(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
cv.onmousemove=function(e){ if(!cv._draw)return; var p=getP(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
cv.onmouseup=cv.onmouseleave=function(){ cv._draw=false; };
cv.ontouchstart=function(e){ e.preventDefault(); cv._has=true; cv._draw=true; var p2=el("sigPh"); if(p2)p2.style.display="none"; var p=getP(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
cv.ontouchmove=function(e){ e.preventDefault(); if(!cv._draw)return; var p=getP(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
cv.ontouchend=function(){ cv._draw=false; };
},250);
}

// ============================================================
// TEXTBAUSTEINE (Globale Vorlagen)
// ============================================================
function renderTextbausteine(){
var V = DB.vorlagen();
var T = DB.texte(); // Freie Textbausteine (kein Anschreiben/Schlusstext)
var alle = V.concat(T.map(function(t){ return Object.assign({},t,{isTexte:true}); }));

var anschreiben = alle.filter(function(v){ return v.typ==="anschreiben"; });
var schluss     = alle.filter(function(v){ return v.typ==="schlusstext"; });
var frei        = T;

function vorlSection(title, items, typ){
return "<div class='ang-card' style='margin-bottom:10px'>"+
"<div class='ang-card-hd'><span class='ang-card-stripe'></span><span class='ang-card-title'>"+title+"</span>"+
"<button class='ang-btn ang-btn-sec ang-btn-sm' data-vorlneu='"+typ+"' style='margin-left:auto'>+ Neu</button>"+
"</div>"+
(items.length===0
? "<div style='color:#94a3b8;font-size:13px;padding:8px 0'>Noch keine Vorlagen.</div>"
: items.map(function(v){
return "<div style='background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid #f1f5f9'>"+
"<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'>"+
"<strong style='font-size:13px;flex:1'>"+esc(v.name)+"</strong>"+
"<button class='ang-btn ang-btn-del ang-btn-sm' data-vorldelv='"+esc(v.id)+"' style='padding:4px 9px;min-height:28px;font-size:11px'>Loeschen</button>"+
"</div>"+
"<div style='font-size:12px;color:#475569;line-height:1.5;white-space:pre-wrap'>"+esc((v.text||"").slice(0,120))+(v.text&&v.text.length>120?"…":"")+"</div>"+
"</div>";
}).join(""))+
"</div>";
}

el("s-txt").innerHTML =
"<div class='ph'><h1>Textbausteine</h1></div>"+
"<div class='sb'>"+
vorlSection("Anschreiben-Vorlagen", anschreiben, "anschreiben")+
vorlSection("Schlusstext-Vorlagen", schluss, "schlusstext")+
"</div>";

el("s-txt").querySelectorAll("[data-vorlneu]").forEach(function(b){
b.onclick=function(){
var typ=this.getAttribute("data-vorlneu");
var nm=prompt("Name der Vorlage:"); if(!nm) return;
var txt=prompt("Text der Vorlage:"); if(txt===null) return;
var V2=DB.vorlagen();
V2.push({id:uid(),typ:typ,name:nm,text:txt});
DB.sVorlagen(V2); renderTextbausteine(); toast("Vorlage gespeichert");
};
});

el("s-txt").querySelectorAll("[data-vorldelv]").forEach(function(b){
b.onclick=function(){
var _vid=this.getAttribute("data-vorldelv");
iosConfirm("Vorlage loeschen?", function(){
DB.sVorlagen(DB.vorlagen().filter(function(v){ return v.id!==_vid; }));
renderTextbausteine(); toast("Vorlage geloescht");
});
};
});
}

// ============================================================
// RENDERS AKTUALISIEREN
// ============================================================
RENDERS["zeit"] = renderZeiterfassung;
RENDERS["mat"]  = renderMaterial;
RENDERS["ger"]  = renderGeraete;
RENDERS["txt"]  = renderTextbausteine;

// ============================================================
// NOTIZEN
// ============================================================
function renderNotizen(){
var N=DB.notizen();
var h = N.length===0 ?
"<div class='empty'><svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg><p>Keine Notizen</p></div>" :
N.slice().reverse().map(function(n){
var im=n.img?"<img src='"+n.img+"' style='width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block' loading='lazy'>":"";
return "<div class='nc'>" +
"<div style='display:flex;align-items:flex-start;gap:10px'>" +
"<div style='flex:1;cursor:pointer' data-en='"+n.id+"'>" + im +
"<div style='font-weight:600;font-size:14px;margin-bottom:3px'>"+esc(n.tit||"Notiz")+"</div>" +
"<div style='font-size:13px;color:var(--mut);white-space:pre-wrap;line-height:1.5'>"+esc(n.txt)+"</div>" +
"<div style='font-size:11px;color:#475569;margin-top:5px'>"+fdat(n.datum)+"</div>" +
"</div>" +
"<button class='dbt' data-dn='"+n.id+"'>"+icoTrash()+"</button>" +
"</div>" +
"</div>";
}).join("");
el("s-n").innerHTML =
"<div class='ph'><h1>Notizen</h1></div>" +
"<div class='sb'><button class='btn bp' id='nAddBtn' style='margin-bottom:12px'>+ Neue Notiz</button>"+h+"</div>";
var b=el("nAddBtn"); if(b) b.onclick=function(){ oNotiz(); };
}

function oNotiz(id){
sv("nId",id||""); sv("nTit",""); sv("nTxt",""); sv("nImgData","");
var t=el("m-n-t"); if(t) t.textContent=id?"Notiz bearbeiten":"Neue Notiz";
var nf=el("nFil"); if(nf) nf.value="";
var np=el("nImgPrv"); if(np) np.src="";
var nw=el("nImgWrap"); if(nw) nw.style.display="none";
if(id){
var n=DB.notizen().find(function(x){ return x.id===id; });
if(n){ sv("nId",id); sv("nTit",n.tit||""); sv("nTxt",n.txt||"");
if(n.img){ sv("nImgData",n.img); if(np) np.src=n.img; if(nw) nw.style.display="block"; } }
}
mo("m-n");
setTimeout(function(){ var f=el("nTxt"); if(f) f.focus(); },300);
}
el("nFil").onchange=function(){
var f=this.files[0]; if(!f) return;
resizeImg(f,function(d){ sv("nImgData",d); var p=el("nImgPrv"); if(p) p.src=d; var w=el("nImgWrap"); if(w) w.style.display="block"; });
};
el("nImgRm").onclick=function(){ sv("nImgData",""); var p=el("nImgPrv"); if(p) p.src=""; var w=el("nImgWrap"); if(w) w.style.display="none"; var f=el("nFil"); if(f) f.value=""; };
el("nCan").onclick=function(){ mc("m-n"); };
el("nSav").onclick=function(){
var txt=gv("nTxt"); if(!txt){ toast("Text erforderlich",true); return; }
var id=gv("nId")||uid();
var N=DB.notizen(); var idx=N.findIndex(function(x){ return x.id===id; });
var n={id:id,tit:gv("nTit"),txt:txt,img:gv("nImgData"),datum:Date.now()};
if(idx>=0) N[idx]=n; else N.push(n);
DB.sN(N); mc("m-n"); toast("Notiz gespeichert");
if(CS==="n") renderNotizen();
};

// ============================================================
// EINSTELLUNGEN
// ============================================================
function openSettings(){
var s=DB.settings();
var ku=el("setKU"); if(ku) ku.checked=!!s.ku;
sv("setFirma",s.firma||"Workbase");
sv("setInhaber",s.inhaber||"Boller");
sv("setAdr",s.adr||"Musterstrasse 12, 80333 Muenchen");
sv("setTel",s.tel||"0170 123 4567");
sv("setMail",s.mail||"info@Workbase.de");
sv("setUst",s.ust||"DE123456789");
sv("setIban",s.iban||"DE12 3456 7890 1234 5678 90");
sv("setBic",s.bic||"MUBKDE12XXX");
mo("m-set");
}
function renderSettings(){ openSettings(); }
el("setCan").onclick=function(){ mc("m-set"); };
// Unterschrift-Button in Settings
function openSigBtnCheck(){
var b=el("setSigBtn"); if(b) b.onclick=function(){ openSigVerwaltung(); };
}

el("setSav").onclick=function(){
var s=DB.settings();
var ku=el("setKU"); s.ku=ku?ku.checked:false;
s.firma=gv("setFirma"); s.inhaber=gv("setInhaber"); s.adr=gv("setAdr");
s.tel=gv("setTel"); s.mail=gv("setMail"); s.ust=gv("setUst");
s.iban=gv("setIban"); s.bic=gv("setBic");
DB.sSet(s); mc("m-set"); toast("Einstellungen gespeichert");
};

// ============================================================
// PDF / VORSCHAU
// ============================================================
function buildDocHTML(d){
var s=DB.settings();
var firma=esc(s.firma||"Workbase");
var inhaber=esc(s.inhaber||"Boller");
var adr=esc(s.adr||"Musterstrasse 12, 80333 Muenchen");
var tel=esc(s.tel||"0170 123 4567");
var mail=esc(s.mail||"info@Workbase.de");
var ust=esc(s.ust||"DE123456789");
var iban=esc(s.iban||"DE12 3456 7890 1234 5678 90");
var bic=esc(s.bic||"MUBKDE12XXX");
var rows=(d.items||[]).map(function(item,i){
return "<tr><td style='padding:8px 10px;border-bottom:1px solid #f0f0f0;color:#9ca3af;font-size:10px'>"+(i+1)+"</td>" +
"<td style='padding:8px 10px;border-bottom:1px solid #f0f0f0'>"+esc(item.name)+"</td>" +
"<td style='padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center'>"+parseFloat(item.m2||0).toFixed(2)+"</td>" +
"<td style='padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center'>"+esc(item.einh||"m2")+"</td>" +
"<td style='padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right'>"+eur((item.einzelpreis||0)/Math.max(item.m2||1,0.01))+"</td>" +
"<td style='padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right'><strong>"+eur(item.einzelpreis||0)+"</strong></td></tr>";
}).join("");
var gb=new Date((d.datumTs||Date.now())+30*864e5).toLocaleDateString("de-DE");
var zt=d.isR&&d.von?"<div style='background:#eff6ff;border-left:4px solid #38bdf8;padding:9px 13px;font-size:11px;color:#1d4ed8;margin-bottom:16px;border-radius:0 6px 6px 0'>Leistungszeitraum: <strong>"+d.von+(d.bis?" bis "+d.bis:"")+"</strong></div>":"";
var ziel=d.zahlungsziel||14;
var sko=(d.skoProz>0)?" Bei Zahlung innerhalb "+d.skoTage+" Tagen "+d.skoProz+"% Skonto.":"";
var kuHinw=d.ku?"<p style='margin-top:5px;font-size:9px;color:#6b7280'>Gemaess Par.19 UStG wird keine Umsatzsteuer berechnet.</p>":"";
var hw=d.isR?
"<strong>Zahlungsbedingungen:</strong> Zahlbar innerhalb <strong>"+ziel+" Tagen</strong> ohne Abzug."+sko+"<br>IBAN: "+iban+" · BIC: "+bic:
"<strong>Angebotsbedingungen:</strong> Gueltig bis "+gb+". "+(d.ku?"Endpreise gemaess Par.19 UStG.":"Alle Preise zzgl. gesetzl. MwSt.");
var sigBlock="<table style='width:100%;margin-top:32px;border-top:1px solid #f0f0f0;padding-top:16px'><tr>" +
"<td style='width:50%;padding-right:20px'><div style='font-size:9px;color:#9ca3af;margin-bottom:36px'>Ort, Datum</div><div style='border-top:1px solid #1a1a2e;padding-top:5px;font-size:9px;color:#6b7280'>Unterschrift Auftragnehmer / "+inhaber+"</div></td>" +
"<td style='width:50%;padding-left:20px'><div style='font-size:9px;color:#9ca3af;margin-bottom:36px'>Ort, Datum</div><div style='border-top:1px solid #1a1a2e;padding-top:5px;font-size:9px;color:#6b7280'>Unterschrift Auftraggeber / "+esc(d.kundeName||"")+"</div></td>" +
"</tr></table>";
return "<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px'>" +
"<div><div style='font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#1a1a2e'>"+firma+"</div>" +
"<div style='margin-top:6px;font-size:10px;color:#6b7280;line-height:1.8'>"+inhaber+"<br>"+adr+"<br>Tel: "+tel+" · "+mail+"<br>"+(d.ku?"Kleinunternehmer gemaess Par.19 UStG":"USt-IdNr.: "+ust)+"</div></div>" +
"<div style='text-align:right'>" +
"<div style='font-size:26px;font-weight:900;color:#1a1a2e;letter-spacing:-1px'>"+d.typ+"</div>" +
"<div style='font-size:10px;color:#6b7280;line-height:1.8;margin-top:5px'><strong>Nr.:</strong> "+esc(d.num)+"<br><strong>Datum:</strong> "+d.datum+"<br>"+(d.isR?"<strong>Faellig:</strong> "+ziel+" Tage":"<strong>Gueltig bis:</strong> "+gb)+"</div>" +
"</div>" +
"</div>" +
"<div style='height:3px;background:linear-gradient(90deg,#38bdf8,#1a1a2e);margin-bottom:22px'></div>" +
"<div style='display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px'>" +
"<div><div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700;margin-bottom:6px'>Auftraggeber</div>" +
"<div style='font-size:11px;line-height:1.8'><strong>"+esc(d.kundeName||"-")+"</strong></div></div>" +
"<div><div style='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700;margin-bottom:6px'>Projekt</div>" +
"<div style='font-size:11px'><strong>"+esc(d.projName||"-")+"</strong></div></div>" +
"</div>" +
zt +
"<table style='width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px'>" +
"<thead><tr style='background:#1a1a2e;color:#fff'>" +
"<th style='padding:9px 10px;text-align:left;font-weight:600;width:28px'>Pos.</th>" +
"<th style='padding:9px 10px;text-align:left;font-weight:600'>Leistung</th>" +
"<th style='padding:9px 10px;text-align:center;font-weight:600'>Menge</th>" +
"<th style='padding:9px 10px;text-align:center;font-weight:600'>Einh.</th>" +
"<th style='padding:9px 10px;text-align:right;font-weight:600'>EP</th>" +
"<th style='padding:9px 10px;text-align:right;font-weight:600'>Gesamt</th>" +
"</tr></thead><tbody>"+rows+"</tbody>" +
"</table>" +
"<div style='margin-left:auto;width:280px;margin-bottom:16px'>" +
"<div style='display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #f0f0f0'><span>Netto</span><span>"+eur(d.netto)+"</span></div>" +
(d.ku?"<div style='display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #f0f0f0'><span>MwSt. (Par.19)</span><span>0,00 EUR</span></div>":
"<div style='display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #f0f0f0'><span>MwSt. 19%</span><span>"+eur(d.mwst)+"</span></div>") +
"<div style='display:flex;justify-content:space-between;padding:9px 0;font-size:15px;font-weight:900;border-top:2px solid #1a1a2e;margin-top:3px'><span>GESAMT</span><span>"+eur(d.brutto)+"</span></div>" +
"</div>" +
kuHinw +
"<div style='background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #38bdf8;padding:12px 14px;font-size:10px;line-height:1.7;margin-bottom:16px'>"+hw+"</div>" +
sigBlock +
"<div style='padding-top:12px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af;margin-top:12px'>" +
"<span>"+firma+" · "+inhaber+" · "+adr+"</span>" +
"<span>"+d.typ+" "+esc(d.num)+" · Seite 1/1</span>" +
"</div>";
}

function pdfDoc(type, id){
var doc = type==="a" ? DB.angebote().find(function(x){ return x.id===id; }) :
DB.rechnungen().find(function(x){ return x.id===id; });
if(!doc){ toast("Nicht gefunden",true); return; }
var typ = type==="r" ? "RECHNUNG" : "ANGEBOT";
var num = doc.nummer||doc.titel||"-";
var P = doc.projektId ? DB.projekte().find(function(x){ return x.id===doc.projektId; }) : null;
var K = P ? DB.kunden().find(function(x){ return x.id===P.kid; }) : null;
var html = buildDocHTML({
typ:typ, num:num, datum:fdat(doc.datum), datumTs:doc.datum,
items:doc.items, netto:doc.netto, mwst:doc.mwst, brutto:doc.brutto,
ku:doc.ku, isR:type==="r",
kundeName:K?K.name:(doc.kundeName||""),
projName:doc.projName||"",
von:doc.von, bis:doc.bis,
zahlungsziel:doc.zahlungsziel||14,
skoProz:doc.skoProz||0, skoTage:doc.skoTage||0,
rtyp:doc.typ||"schluss", abp:doc.abproz||0.3
});
openPDF("<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'><title>"+typ+" "+esc(num)+"</title>" +
"<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#1a1a2e;background:#fff;max-width:820px;margin:0 auto}" +
".tb{background:#f4f4f8;padding:10px 36px;display:flex;align-items:center;gap:12px}" +
".tb button{background:#1a1a2e;color:#fff;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}" +
".pg{padding:36px 44px}@media print{.tb{display:none!important}.pg{padding:24px 32px}}</style>" +
"</head><body><div class='tb'><button onclick='window.print()'>Drucken / Als PDF speichern</button></div>" +
"<div class='pg'>"+html+"</div></body></html>");
}

// Preview modal
el("prevCl").onclick=function(){ mc("m-prev"); };
el("prevPrint").onclick=function(){
var content=el("prevContent");
if(!content)return;
var blob=new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Georgia,serif;padding:20px;max-width:820px;margin:0 auto}</style></head><body>'+content.innerHTML+'</body></html>'],{type:'text/html;charset=utf-8'});
var url=URL.createObjectURL(blob);
var a=document.createElement('a');
a.href=url;
a.download='Vorschau.html';
document.body.appendChild(a);
a.click();
setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
};

// ============================================================
// DELEGATES fuer Listen (einmalig)
// ============================================================
dlg("k","data-ek",function(id){ oKunde(id); });
dlg("k","data-dk",function(id){
iosConfirm("Kunde loeschen?", function(){ DB.sK(DB.kunden().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderKunden(); });
});
dlg("p","data-ep",function(id){ oProjekt(id); });
dlg("p","data-dp",function(id){
iosConfirm("Projekt loeschen?", function(){ DB.sP(DB.projekte().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderProjekte(); });
});
dlg("a","data-pda",function(id){ pdfDoc("a",id); });
dlg("a","data-a2r",function(id){
var a=DB.angebote().find(function(x){ return x.id===id; });
if(a){ oRechnung(a); navTo("r"); }
});
dlg("a","data-dela",function(id){
iosConfirm("Angebot loeschen?", function(){ DB.sA(DB.angebote().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderAngebote(); });
});
dlg("r","data-pdr",function(id){ pdfDoc("r",id); });
dlg("r","data-bz",function(id){
var R=DB.rechnungen(); var i=R.findIndex(function(x){ return x.id===id; });
if(i>=0){ R[i].status="bezahlt"; DB.sR(R); toast("Als bezahlt markiert"); renderRechnungen(); }
});
dlg("r","data-delr",function(id){
iosConfirm("Rechnung loeschen?", function(){ DB.sR(DB.rechnungen().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderRechnungen(); });
});
dlg("kat","data-eki",function(id){ oKatItem(id); });
dlg("kat","data-dki",function(id){
iosConfirm("Leistung loeschen?", function(){ DB.sKat(DB.katalog().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderKatalog(); });
});
dlg("kat","data-kai",function(id){ katToAngebot(id); });
dlg("n","data-en",function(id){ oNotiz(id); });
dlg("n","data-dn",function(id){
iosConfirm("Notiz loeschen?", function(){ DB.sN(DB.notizen().filter(function(x){ return x.id!==id; })); haptic("error"); toast("Geloescht"); renderNotizen(); });
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
// PDF OEFFNEN - iOS kompatibel (kein window.open / kein Popup)
// ============================================================
function openPDF(htmlContent, title){
try{
var blob=new Blob([htmlContent],{type:'text/html;charset=utf-8'});
var url=URL.createObjectURL(blob);
var a=document.createElement('a');
a.href=url;
a.download=(title||'Dokument')+'.html';
document.body.appendChild(a);
a.click();
setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
}catch(e){toast('Fehler: '+e.message,true);}
}


// ============================================================
// DESIGN HELPERS
// ============================================================

// Avatar Farben
var AV_COLORS = [
{bg:'rgba(56,189,248,.2)',  color:'#38bdf8'},
{bg:'rgba(34,197,94,.2)',   color:'#22c55e'},
{bg:'rgba(167,139,250,.2)', color:'#a78bfa'},
{bg:'rgba(249,115,22,.2)',  color:'#f97316'},
{bg:'rgba(236,72,153,.2)',  color:'#ec4899'},
{bg:'rgba(245,158,11,.2)',  color:'#f59e0b'},
];

function avColor(name){
var idx = (name||"?").charCodeAt(0) % AV_COLORS.length;
return AV_COLORS[idx];
}

function avInitials(name){
var parts = (name||"?").trim().split(/\s+/);
if(parts.length >= 2) return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
return (name||"?").slice(0,2).toUpperCase();
}

function avHTML(name, size){
var c = avColor(name);
var s = size || 42;
return "<div class='av-circle' style='width:"+s+"px;height:"+s+"px;background:"+c.bg+";color:"+c.color+"'>"+
esc(avInitials(name))+"</div>";
}

// Status Badge einheitlich
function statusBadge(lbl, cls){
return "<span class='status-badge "+cls+"'>"+lbl+"</span>";
}

function angStatusBadge(s){
var map = {
entwurf:   {l:"Entwurf",    c:"sb-gry"},
versendet: {l:"Versendet",  c:"sb-blu"},
angenommen:{l:"Angenommen", c:"sb-grn"},
abgelehnt: {l:"Abgelehnt",  c:"sb-red"}
};
var d = map[s]||{l:s||"Entwurf", c:"sb-gry"};
return statusBadge(d.l, d.c);
}

function rechStatusBadge(s){
var map = {
offen:     {l:"Offen",      c:"sb-yel"},
versendet: {l:"Versendet",  c:"sb-blu"},
bezahlt:   {l:"Bezahlt",    c:"sb-grn"},
gemahnt:   {l:"Gemahnt",    c:"sb-red"},
storniert: {l:"Storniert",  c:"sb-red"}
};
var d = map[s]||{l:"Offen", c:"sb-yel"};
return statusBadge(d.l, d.c);
}

// Haptic Feedback
