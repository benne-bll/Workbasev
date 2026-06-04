var AufmassLogik = (function() {
/* VOB-Schwellen je Regelwerk (mm2) */
var VOB = {
"18363": 2500000,  /* Maler: 2.5 m2 */
"18345": 1000000,  /* WDVS:  1.0 m2 */
"18350":  100000   /* Putz:  0.1 m2 */
};
var VOB_LABEL = {
"18363": "DIN 18363: Oeffnungen <= 2,5 m\u00B2 kein Abzug, > 2,5 m\u00B2 voller Abzug",
"18345": "DIN 18345: Oeffnungen <= 1,0 m\u00B2 kein Abzug, > 1,0 m\u00B2 voller Abzug",
"18350": "DIN 18350: Oeffnungen <= 0,1 m\u00B2 kein Abzug, > 0,1 m\u00B2 voller Abzug"
};

function mToMm(v)   { return Math.round(parseFloat(v)*1000)||0; }
function cmToMm(v)  { return Math.round(parseFloat(v)*10)||0; }
function mm2ToM2(v) { return v/1000000; }
function fmt(mm2, d){ return mm2ToM2(mm2).toFixed(d===undefined?2:d); }
function toDisp(mm, u){ return u==="cm" ? (mm/10).toFixed(1) : (mm/1000).toFixed(2); }
function toMm(v, u) { return u==="cm" ? cmToMm(v) : mToMm(v); }
function schraege(br,hL,hR){ return Math.round(br*(hL+hR)/2); }

function vobRelevant(fl_pro, regelwerk) {
return fl_pro > (VOB[regelwerk] || VOB["18363"]);
}

/*

- DATENMODELL Raum:
- { id, name, mode:"gesamt"|"wand"|"fassade", vobRegel:"18363"|"18345"|"18350",
- foto,
- // gesamt: laenge_mm, breite_mm, hoehe_mm, zusatzFlaechen:[{id,nm,l_mm,h_mm}],
- 
       schraege:{br_mm,hL_mm,hR_mm}
  
- // wand:   waende:[{id,nm,l_mm,h_mm}], decke_mm2
- // fassade: seiten:[{id,nm,l_mm,h_mm,giebel:{br_mm,hL_mm,hR_mm}}],
- 
       sockel:{h_mm,umfang_mm}, laibung:{h_mm,t_mm,anz}
  
- abzuege:[{id,nm,typ,b_mm,h_mm,anz,foto}]
- }
  */
  function berechne(raum) {
  var wBrutto=0, decke=0, boden=0, umfang=0;
  var seiten_details=[];

if (raum.mode==="wand") {
var wae=raum.waende||[];
wBrutto=wae.reduce(function(s,w){return s+w.l_mm*w.h_mm;},0);
umfang=wae.reduce(function(s,w){return s+w.l_mm;},0);
decke=raum.decke_mm2||0;
if(!decke&&wae.length>=2) decke=Math.round(wae[0].l_mm*(wae[2]?wae[2].l_mm:wae[1].l_mm));
boden=decke;

} else if (raum.mode==="fassade") {
var seiten=raum.seiten||[];
seiten.forEach(function(s){
var fl=s.l_mm*s.h_mm;
var gi=0;
if(s.giebel&&s.giebel.br_mm>0) gi=schraege(s.giebel.br_mm,s.giebel.hL_mm,s.giebel.hR_mm);
wBrutto+=fl+gi;
umfang+=s.l_mm;
seiten_details.push({nm:s.nm,fl:fl,giebel:gi,gesamt:fl+gi});
});
/* Sockel */
var sok=raum.sockel||{};
var lb=raum.laibung||{};
var sokFl=Math.round((sok.h_mm||0)*(sok.umfang_mm||0));
var lbFl=Math.round((lb.h_mm||0)*(lb.t_mm||0)*2*(lb.anz||0));
/* Sockel und Laibung sind ZUSAETZLICH zur Wandflaeche */
wBrutto+=sokFl+lbFl;
decke=0; boden=0;

} else {
/* gesamt */
var L=raum.laenge_mm||0,B=raum.breite_mm||0,H=raum.hoehe_mm||0;
umfang=2*(L+B); wBrutto=umfang*H; decke=L*B; boden=L*B;
}

/* Zusatzflaechen */
var zfGes=(raum.zusatzFlaechen||[]).reduce(function(s,z){return s+z.l_mm*z.h_mm;},0);
wBrutto+=zfGes;
/* Dachschraege */
var dach=0;
if(raum.schraege&&raum.schraege.br_mm>0){
dach=schraege(raum.schraege.br_mm,raum.schraege.hL_mm,raum.schraege.hR_mm);
wBrutto+=dach;
}
/* Abzuege VOB */
var abzGes=0, regel=raum.vobRegel||"18363";
var abzDet=(raum.abzuege||[]).map(function(a){
var anz=a.anz||1, flPro=(a.b_mm||0)*(a.h_mm||0), flGes=flPro*anz;
var rel=vobRelevant(flPro,regel), abzW=rel?flGes:0;
abzGes+=abzW;
return {abzug:a,flaeche_mm2:flGes,vob_relevant:rel,abzug_mm2:abzW};
});

/* Laufmeter (Fassade) */
var lm=null;
if(raum.mode==="fassade"){
var sok2=raum.sockel||{}, lb2=raum.laibung||{};
lm={
umfang_lfm: Math.round(umfang)/1000,
sockel_lfm: Math.round(sok2.umfang_mm||0)/1000,
sockel_m2:  Math.round((sok2.h_mm||0)*(sok2.umfang_mm||0))/1000000,
laib_m2:    Math.round((lb2.h_mm||0)*(lb2.t_mm||0)*2*(lb2.anz||0))/1000000,
laib_lfm:   ((lb2.anz||0)*2*(lb2.t_mm||0)/1000).toFixed(2)
};
}

return {
wand_brutto:wBrutto, wand_netto:Math.max(0,wBrutto-abzGes),
decke:decke, boden:boden, umfang_mm:umfang,
zf_gesamt:zfGes, schraege:dach, abzug_gesamt:abzGes,
abz_details:abzDet, seiten_details:seiten_details, lm:lm
};

}

return {VOB,VOB_LABEL,mToMm,cmToMm,mm2ToM2,fmt,toDisp,toMm,schraege,vobRelevant,berechne};
})();

/* ============================================================
AUFMASS STORE
============================================================ */
var AufmassStore = (function() {
var _r=[], _e="m", _mem={};
var _ls=(function(){try{localStorage.setItem("_t","1");localStorage.removeItem("_t");return true;}catch(e){return false;}}());
function lsG(k){return _ls?localStorage.getItem(k):(_mem[k]||null);}
function lsS(k,v){if(_ls){try{localStorage.setItem(k,v);}catch(e){}}else _mem[k]=v;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function hydrate(){try{var d=JSON.parse(lsG("amPro2")||"{}");_r=d.r||[];_e=d.e||"m";}catch(e){}}
function persist(){lsS("amPro2",JSON.stringify({r:_r,e:_e}));}
function getE(){return _e;}
function setE(v){_e=v;persist();}
function getAll(){return _r;}
function get(id){return _r.find(function(x){return x.id===id;})||null;}
function save(r){if(!r.id)r.id=uid();var i=_r.findIndex(function(x){return x.id===r.id;});if(i>=0)_r[i]=r;else _r.push(r);persist();return r.id;}
function del(id){_r=_r.filter(function(x){return x.id!==id;});persist();}
function newAbz(){return {id:uid(),nm:"",typ:"offen",b_mm:0,h_mm:0,anz:1,foto:null};}
function newSeite(nm){return {id:uid(),nm:nm||"Seite",l_mm:0,h_mm:0,giebel:{br_mm:0,hL_mm:0,hR_mm:0}};}
hydrate();
return {uid,getE,setE,getAll,get,save,del,newAbz,newSeite};
})();

/* ============================================================
AUFMASS UI
============================================================ */
var AufmassUI = (function() {
function el(id){return document.getElementById(id);}
function esc(s){return String(s||"").replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">");}
function gv(id){var e=el(id);return e?e.value.trim():"";}
function sv(id,v){var e=el(id);if(e)e.value=(v===null||v===undefined)?"":String(v);}
function hide(id){var e=el(id);if(e)e.style.display="none";}
function show(id,d){var e=el(id);if(e)e.style.display=d||"";}

var _tt=null;
function toast(msg,err){
if(_tt)clearTimeout(_tt);
var t=el("toast");t.textContent=msg;t.className=err?"err":"";
void t.offsetWidth;t.classList.add("show");
_tt=setTimeout(function(){t.classList.remove("show");},2500);
}

function U(){return AufmassStore.getE();}
function toMm(v){return AufmassLogik.toMm(v,U());}
function disp(mm){return AufmassLogik.toDisp(mm,U());}
function fm(mm2){return AufmassLogik.fmt(mm2);}

/* Schritt-Indikator aktualisieren */
function updateSteps(form_has_data) {
var L=toMm(gv("fL")),B=toMm(gv("fB")),H=toMm(gv("fH"));
var hasSize = (_mode==="gesamt"&&L>0&&B>0&&H>0)
|| (_mode==="wand"&&_tmpWae.length>0)
|| (_mode==="fassade"&&_tmpSei.length>0);
var hasFoto = !!gv("rFotoData");
var hasAbz  = _tmpAbz.length>0;
var done = [!!gv("fNm"), hasSize, hasFoto, hasAbz, true];
document.querySelectorAll(".step").forEach(function(s,i){
s.classList.toggle("done",   done[i] && i < 4);
s.classList.toggle("active", i===4||(!done[i]&&(i===0||done[i-1])));
});
}

/* Labels je Einheit */
function updateLabels(){
var u=U(), h=u==="cm"?"Eingabe in Zentimeter":"Eingabe in Meter";
var fh=el("fHint"); if(fh)fh.textContent=h;
var map={lL:"Laenge ("+u+")",lB:"Breite ("+u+")",lH:"Hoehe ("+u+")",
lSB:"Br. Schraege ("+u+")",lSL:"H li. ("+u+")",lSR:"H re. ("+u+")",
lSoH:"Sockel H ("+u+")",lLbH:"Laibung H ("+u+")",lLbT:"Tiefe ("+u+")"};
Object.keys(map).forEach(function(id){var e=el(id);if(e)e.textContent=map[id];});
document.querySelectorAll(".abz-lbl-b").forEach(function(e){e.textContent="Breite ("+u+")";});
document.querySelectorAll(".abz-lbl-h").forEach(function(e){e.textContent="Hoehe ("+u+")";});
}

function fotoLoad(file,cb){
var rd=new FileReader();
rd.onload=function(e){
var img=new Image();
img.onload=function(){
var sc=Math.min(1,800/img.width),w=Math.round(img.width*sc),h=Math.round(img.height*sc);
var cv=document.createElement("canvas");cv.width=w;cv.height=h;
cv.getContext("2d").drawImage(img,0,0,w,h);
cb(cv.toDataURL("image/jpeg",.78));
};
img.src=e.target.result;
};
rd.readAsDataURL(file);
}

/* ============================================================
FORMULAR STATE
============================================================ */
var _editId=null,_mode="gesamt";
var _tmpZF=[], _tmpWae=[], _tmpAbz=[], _tmpSei=[];

/* – Tiles farbcodiert – */
function tile(lbl,val,unit,cls){
return "<div class='rt "+(cls||"rt-mut")+"'>" +
"<div class='rl'>"+lbl+"</div><div class='rv'>"+val+"</div><div class='ru'>"+unit+"</div></div>";
}

/* – Abzug-Icon je Typ – */
function abzIcon(typ){
var icons={offen:"□",tuer:"▭",nische:"‸",sonstig:"◇"};
var cls="abz-icon abz-icon-"+(typ||"offen");
return "<div class='"+cls+"'>"+( icons[typ]||"□")+"</div>";
}

/* – Kompakte Abzug-Karte – */
function abzHTML(a,i){
var u=U();
var bVal=a.b_mm?disp(a.b_mm):"", hVal=a.h_mm?disp(a.h_mm):"";
var anz=a.anz||1, flPro=(a.b_mm||0)*(a.h_mm||0);
var fl=fm(flPro*anz);
var regel=gv("fVob")||"18363";
var rel=AufmassLogik.vobRelevant(flPro,regel);
var badge=rel?"<span class='vob-badge vob-ok'>>Schwelle</span>"
:"<span class='vob-badge vob-no'>≤Schwelle</span>";
var fotoInner=a.foto
?"<img src='"+a.foto+"' style='width:100%;height:88px;object-fit:cover;display:block'>" +
"<button class='foto-rm show' data-frm='"+i+"'>x</button>"
:"<div class='foto-ph'><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg><span>Foto Beweis</span></div>" +
"<input type='file' accept='image/*' capture='environment' data-fi='"+i+"'>";
return "<div class='abz-card'>" +
"<div class='abz-head' data-atgl='"+i+"'>"+abzIcon(a.typ)+
"<div class='abz-info'><div class='abz-nm'>"+(esc(a.nm)||"Abzug "+(i+1))+"</div>" +
"<div class='abz-detail'>"+(bVal&&hVal?bVal+" x "+hVal+" "+u+" • "+anz+" Stk":"Masse eingeben")+"</div></div>" +
"<div class='abz-right'><span class='abz-m2 "+(rel?"":"strike")+
"' style='color:"+(rel?"var(--red)":"var(--mut)")+"'>"+fl+" m\u00B2</span>"+badge+"</div>" +
"<button class='vob-i' data-vt='"+i+"' style='margin-left:4px'>i</button>" +
"<button class='abz-del-x' data-delabz='"+i+"' style='background:rgba(239,68,68,.15);border:none;border-radius:50%;width:28px;height:28px;color:#ef4444;cursor:pointer;font-size:18px;line-height:1;flex-shrink:0'>×</button>" +
"</div>" +
"<div class='abz-body' id='ab-"+i+"'>" +
"<div class='vob-tip' id='vt-"+i+"'>"+esc(AufmassLogik.VOB_LABEL[gv("fVob")||"18363"])+"</div>" +
"<div class='row2'><div class='fg'><label>Typ</label>" +
"<select class='az-typ' data-ai='"+i+"'>" +
"<option value='offen'"+(a.typ==="offen"?" selected":"")+">Fenster/Oeffnung</option>" +
"<option value='tuer'"+(a.typ==="tuer"?" selected":"")+">Tuer</option>" +
"<option value='nische'"+(a.typ==="nische"?" selected":"")+">Nische</option>" +
"<option value='sonstig'"+(a.typ==="sonstig"?" selected":"")+">Sonstiges</option>" +
"</select></div>" +
"<div class='fg'><label>Bezeichnung</label>" +
"<input type='text' class='az-nm' data-ai='"+i+"' value='"+esc(a.nm)+"' placeholder='z.B. Fenster 1' autocomplete='off'></div></div>" +
"<div class='row3'>" +
"<div class='fg'><label class='abz-lbl-b'>Breite ("+u+")</label>" +
"<input type='number' class='az-b' data-ai='"+i+"' value='"+bVal+"' min='0' step='any' placeholder='0'></div>" +
"<div class='fg'><label class='abz-lbl-h'>Hoehe ("+u+")</label>" +
"<input type='number' class='az-h' data-ai='"+i+"' value='"+hVal+"' min='0' step='any' placeholder='0'></div>" +
"<div class='fg'><label>Anzahl</label>" +
"<input type='number' class='az-anz' data-ai='"+i+"' value='"+(anz)+"' min='1' step='1'></div></div>" +
"<div class='foto-slot' id='fs-"+i+"'>"+fotoInner+"</div>" +
"</div>" +
"</div>";
}

function renderAbz(){
var c=el("abzListe"); if(!c)return;
c.innerHTML=_tmpAbz.length?_tmpAbz.map(abzHTML).join("")
:"<div style='color:var(--mut);font-size:13px;padding:8px 0;text-align:center'>Keine Abzuege. Per «+ Abzug» hinzufuegen.</div>";
/* Events */
c.querySelectorAll("[data-atgl]").forEach(function(b){
b.onclick=function(){var bd=el("ab-"+this.dataset.atgl);if(bd)bd.classList.toggle("open");};
});
c.querySelectorAll("[data-vt]").forEach(function(b){
b.onclick=function(e){e.stopPropagation();var t=el("vt-"+this.dataset.vt);if(t)t.classList.toggle("show");};
});
c.querySelectorAll(".az-nm,.az-b,.az-h,.az-anz,.az-typ").forEach(function(e){
e.oninput=e.onchange=function(){
var a=_tmpAbz[+this.dataset.ai];
if(this.classList.contains("az-nm"))  a.nm=this.value;
if(this.classList.contains("az-b"))   a.b_mm=toMm(this.value);
if(this.classList.contains("az-h"))   a.h_mm=toMm(this.value);
if(this.classList.contains("az-anz")) a.anz=parseInt(this.value)||1;
if(this.classList.contains("az-typ")) a.typ=this.value;
calcLive();
};
});
c.querySelectorAll("[data-fi]").forEach(function(inp){
inp.onchange=function(){
var f=this.files[0]; if(!f)return;
var idx=+this.dataset.fi;
fotoLoad(f,function(d){_tmpAbz[idx].foto=d;renderAbz();calcLive();});
};
});
c.querySelectorAll("[data-frm]").forEach(function(b){
b.onclick=function(e){e.stopPropagation();_tmpAbz[+this.dataset.frm].foto=null;renderAbz();calcLive();};
});
c.querySelectorAll("[data-delabz]").forEach(function(b){
b.onclick=function(e){e.stopPropagation();
var _abzIdx=+this.getAttribute("data-delabz"); iosConfirm("Abzug loeschen?", function(){_tmpAbz.splice(_abzIdx,1);renderAbz();calcLive();});
};
});
/* Oeffne letzten Abzug automatisch wenn frisch hinzugefuegt */
if(_tmpAbz.length){var last=el("ab-"+(_tmpAbz.length-1));if(last)last.classList.add("open");}
}

/* – Zusatzflaechen – */
function renderZF(){
var c=el("zfListe"); if(!c)return;
c.innerHTML=_tmpZF.map(function(z,i){
return "<div class='row-item'>" +
"<div class='ri-info'><div class='ri-nm'>"+esc(z.nm||"Zusatz")+"</div>" +
"<div class='ri-sub'>"+disp(z.l_mm)+" x "+disp(z.h_mm)+" "+U()+"</div></div>" +
"<span class='ri-val'>"+fm(z.l_mm*z.h_mm)+" m\u00B2</span>" +
"<button class='btn btn-r btn-sm' data-delzf='"+i+"' style='padding:5px 9px;font-size:12px'>x</button>" +
"</div>";
}).join("");
c.querySelectorAll("[data-delzf]").forEach(function(b){
b.onclick=function(){_tmpZF.splice(+this.dataset.delzf,1);renderZF();calcLive();};
});
var tot=_tmpZF.reduce(function(s,z){return s+z.l_mm*z.h_mm;},0);
if(tot>0){el("zfSumV").textContent=fm(tot);show("zfSum");}else hide("zfSum");
}

/* – Waende – */
function renderWL(){
var c=el("wandListe"); if(!c)return;
c.innerHTML=_tmpWae.map(function(w,i){
return "<div class='row-item'>" +
"<div class='ri-info'><div class='ri-nm'>"+esc(w.nm||"Wand "+(i+1))+"</div>" +
"<div class='ri-sub'>"+disp(w.l_mm)+" x "+disp(w.h_mm)+" "+U()+"</div></div>" +
"<span class='ri-val'>"+fm(w.l_mm*w.h_mm)+" m\u00B2</span>" +
"<button class='btn btn-r btn-sm' data-delw='"+i+"' style='padding:5px 9px;font-size:12px'>x</button>" +
"</div>";
}).join("")||"<div style='color:var(--mut);font-size:13px;padding:4px 0'>Noch keine Waende.</div>";
c.querySelectorAll("[data-delw]").forEach(function(b){
b.onclick=function(){_tmpWae.splice(+this.dataset.delw,1);renderWL();calcLive();};
});
}

/* – Fassadenseiten – */
function renderFas(){
var c=el("fasSeiten"); if(!c)return;
c.innerHTML=_tmpSei.map(function(s,i){
var u=U();
var lVal=s.l_mm?disp(s.l_mm):"", hVal=s.h_mm?disp(s.h_mm):"";
var gbr=s.giebel&&s.giebel.br_mm?disp(s.giebel.br_mm):"";
var ghL=s.giebel&&s.giebel.hL_mm?disp(s.giebel.hL_mm):"";
var ghR=s.giebel&&s.giebel.hR_mm?disp(s.giebel.hR_mm):"";
var fl=s.l_mm*s.h_mm;
var gi=s.giebel&&s.giebel.br_mm?AufmassLogik.schraege(s.giebel.br_mm,s.giebel.hL_mm,s.giebel.hR_mm):0;
return "<div class='fas-seite'>" +
"<div class='fas-seite-hd'>" +
"<input type='text' class='fs-nm' data-si='"+i+"' value='"+esc(s.nm)+"' placeholder='Seite' style='flex:1;font-size:14px;padding:7px 10px;background:var(--s2)'>" +
"<span class='fas-seite-badge'>"+fm(fl+gi)+" m\u00B2</span>" +
"<button class='btn btn-r btn-sm' data-delfas='"+i+"' style='padding:5px 9px;font-size:12px;margin-left:4px'>x</button>" +
"</div>" +
"<div class='row3'>" +
"<div class='fg'><label class='fs-lbl-l'>Laenge ("+u+")</label>" +
"<input type='number' class='fs-l' data-si='"+i+"' value='"+lVal+"' min='0' step='any' placeholder='0'></div>" +
"<div class='fg'><label class='fs-lbl-h'>Hoehe ("+u+")</label>" +
"<input type='number' class='fs-h' data-si='"+i+"' value='"+hVal+"' min='0' step='any' placeholder='0'></div>" +
"<div style='display:flex;align-items:flex-end;padding-bottom:11px'>" +
"<button class='btn btn-sm btn-g' data-gbtgl='"+i+"' style='width:100%;font-size:11px;min-height:36px'>" +
(gi>0?"Giebel ✓":"Giebel +") +
"</button></div>" +
"</div>" +
"<div class='tgl-body" +(gi>0?" open":"")+"' id='gb-"+i+"'>" +
"<div class='row3'>" +
"<div class='fg'><label class='fs-lbl-gbr'>Br. ("+u+")</label><input type='number' class='fs-gbr' data-si='"+i+"' value='"+gbr+"' min='0' step='any' placeholder='0'></div>" +
"<div class='fg'><label>H li ("+u+")</label><input type='number' class='fs-ghl' data-si='"+i+"' value='"+ghL+"' min='0' step='any' placeholder='0'></div>" +
"<div class='fg'><label>H re ("+u+")</label><input type='number' class='fs-ghr' data-si='"+i+"' value='"+ghR+"' min='0' step='any' placeholder='0'></div>" +
"</div>" +
"</div>" +
"</div>";
}).join("") || "<div style='color:var(--mut);font-size:13px;padding:8px 0;text-align:center'>Noch keine Fassadenseiten. Per «+ Fassadenseite» hinzufuegen.</div>";

/* Alle Events fuer Fassadenseiten */
c.querySelectorAll(".fs-nm,.fs-l,.fs-h,.fs-gbr,.fs-ghl,.fs-ghr").forEach(function(e){
e.oninput=function(){
var si=+this.dataset.si, s=_tmpSei[si];
if(this.classList.contains("fs-nm"))  s.nm=this.value;
if(this.classList.contains("fs-l"))   s.l_mm=toMm(this.value);
if(this.classList.contains("fs-h"))   s.h_mm=toMm(this.value);
if(this.classList.contains("fs-gbr")) s.giebel.br_mm=toMm(this.value);
if(this.classList.contains("fs-ghl")) s.giebel.hL_mm=toMm(this.value);
if(this.classList.contains("fs-ghr")) s.giebel.hR_mm=toMm(this.value);
calcLive(); renderFas();
};
});
c.querySelectorAll("[data-gbtgl]").forEach(function(b){
b.onclick=function(){var gb=el("gb-"+this.dataset.gbtgl);if(gb)gb.classList.toggle("open");};
});
c.querySelectorAll("[data-delfas]").forEach(function(b){
b.onclick=function(){_tmpSei.splice(+this.dataset.delfas,1);renderFas();calcLive();};
});

}

/* – Sockel Vorschau – */
function calcSockelVors(){
var soH=toMm(gv("soH")), soU=toMm(gv("soU"));
var lbH=toMm(gv("lbH")), lbT=toMm(gv("lbT")), lbAnz=parseInt(gv("lbAnz"))||0;
var sokFl=soH*soU, lbFl=lbH*lbT*2*lbAnz;
if(sokFl>0||lbFl>0){
el("svSockel").textContent=fm(sokFl);
el("svLaib").textContent=fm(lbFl);
el("svLfm").textContent=(soU/1000).toFixed(2);
show("sockelVors");
} else hide("sockelVors");
}

/* – Hauptberechnung Live – */
function calcLive(){
var tmpR=buildTmpRaum();
var res=AufmassLogik.berechne(tmpR);

/* Vorschau Raum-Gesamt */
if(_mode==="gesamt"){
var L=toMm(gv("fL")),B=toMm(gv("fB")),H=toMm(gv("fH"));
if(L>0&&B>0&&H>0){el("pvW").textContent=fm(2*(L+B)*H);el("pvD").textContent=fm(L*B);el("pvB").textContent=fm(L*B);show("vorschau");}
else hide("vorschau");
var sBr=toMm(gv("sBr")),sHL=toMm(gv("sHL")),sHR=toMm(gv("sHR"));
if(sBr>0&&(sHL>0||sHR>0)){el("schM2").textContent=fm(AufmassLogik.schraege(sBr,sHL,sHR));show("schVors");}
else hide("schVors");
}

/* Ergebnis-Grid (farbcodiert) */
var rg=el("resGrid"); if(!rg)return;
if(_mode==="fassade"){
rg.className="res-grid-3";
rg.innerHTML=
tile("Wand Netto",fm(res.wand_netto),"m\u00B2","rt-grn")+
tile("Wand Brutto",fm(res.wand_brutto),"m\u00B2","rt-acc")+
tile("Abzug ges.",fm(res.abzug_gesamt),"m\u00B2","rt-red"||"rt-yel");
} else {
rg.className="res-grid";
rg.innerHTML=
tile("Wand Netto",fm(res.wand_netto),"m\u00B2","rt-grn")+
tile("Wand Brutto",fm(res.wand_brutto),"m\u00B2","rt-acc")+
tile("Decke",fm(res.decke),"m\u00B2","rt-ora")+
tile("Boden",fm(res.boden),"m\u00B2","rt-yel");
}

/* Abzuege Tabelle */
var rt=el("resTbl");
if(rt&&res.abz_details.length){
rt.innerHTML="<thead><tr><th>Position</th><th>Flaeche</th><th>Abzug</th></tr></thead><tbody>"+
res.abz_details.map(function(d){
var badge=d.vob_relevant?"<span class='vob-badge vob-ok'>Abzug</span>":"<span class='vob-badge vob-no'>kein Abzug</span>";
return "<tr><td>"+esc(d.abzug.nm||"Abzug")+" "+badge+
(d.abzug.foto?"<img src='"+d.abzug.foto+"' style='height:22px;width:33px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-left:5px'>":"")+
"</td><td>"+fm(d.flaeche_mm2)+" m\u00B2</td><td class='"+(d.vob_relevant?"":"strike")+"'>-"+fm(d.abzug_mm2)+" m\u00B2</td></tr>";
}).join("")+"</tbody>";
} else if(rt) rt.innerHTML="";

/* Laufmeter Box (Fassade) */
var lb=el("lmBox");
if(lb&&_mode==="fassade"&&res.lm){
show("lmBox");
lb.innerHTML="<div class='sec' style='margin-top:4px'>Laufmeter & Sonderflaechen</div>" +
"<div style='background:var(--s2);border-radius:var(--rs);padding:12px;border:1px solid var(--bdr)'>" +
[["Umfang Fassade",res.lm.umfang_lfm+" lfm"],
["Sockel-Umfang",res.lm.sockel_lfm+" lfm"],
["Sockelflaeche",res.lm.sockel_m2+" m\u00B2"],
["Laibungen",res.lm.laib_m2+" m\u00B2"],
["Laibungen lfm",res.lm.laib_lfm+" lfm"]
].filter(function(r){return parseFloat(r[1])>0;}).map(function(r){
return "<div class='lm-row'><span class='lm-lbl'>"+r[0]+"</span><span class='lm-val'>"+r[1]+"</span></div>";
}).join("")+"</div>";
} else if(lb) hide("lmBox");

updateSteps();

}

function buildTmpRaum(){
var r={id:_editId,name:gv("fNm")||"Raum",mode:_mode,
vobRegel:gv("fVob")||"18363",
abzuege:JSON.parse(JSON.stringify(_tmpAbz)),
foto:gv("rFotoData")||null};
if(_mode==="gesamt"){
r.laenge_mm=toMm(gv("fL"));r.breite_mm=toMm(gv("fB"));r.hoehe_mm=toMm(gv("fH"));
r.zusatzFlaechen=JSON.parse(JSON.stringify(_tmpZF));
var sBr=toMm(gv("sBr")),sHL=toMm(gv("sHL")),sHR=toMm(gv("sHR"));
r.schraege=sBr>0?{br_mm:sBr,hL_mm:sHL,hR_mm:sHR}:null;
} else if(_mode==="wand"){
r.waende=JSON.parse(JSON.stringify(_tmpWae));
var dv=parseFloat(gv("fDecke"));r.decke_mm2=dv>0?Math.round(dv*1000000):0;
} else {
r.seiten=JSON.parse(JSON.stringify(_tmpSei));
r.sockel={h_mm:toMm(gv("soH")),umfang_mm:toMm(gv("soU"))};
r.laibung={h_mm:toMm(gv("lbH")),t_mm:toMm(gv("lbT")),anz:parseInt(gv("lbAnz"))||0};
}
return r;
}

/* ============================================================
MODUS
============================================================ */
function setModus(mode){
_mode=mode;
["modeGesamt","modeWand","modeFassade"].forEach(function(id){ hide(id); });
if(mode==="gesamt") show("modeGesamt");
else if(mode==="wand") show("modeWand");
else show("modeFassade");
document.querySelectorAll(".tab[data-mode]").forEach(function(t){
t.classList.toggle("on",t.dataset.mode===mode);
});
calcLive();
}

/* ============================================================
SCREEN: FORMULAR
============================================================ */
function showForm(id){
_editId=id||null;_tmpZF=[];_tmpWae=[];_tmpAbz=[];_tmpSei=[];
["fNm","fL","fB","fH","sBr","sHL","sHR","rFotoData","fDecke","soH","soU","lbH","lbT","lbAnz"]
.forEach(function(x){sv(x,"");});
var fi=el("rFotoImg");if(fi)fi.src="";
hide("rFotoWrap");hide("vorschau");hide("schVors");hide("zfSum");hide("sockelVors");
var sb=el("schBody"),sa=el("schArr");
if(sb)sb.classList.remove("open");if(sa)sa.classList.remove("open");
el("fTitel").textContent=id?"Raum bearbeiten":"Neuer Raum";

if(id){
var r=AufmassStore.get(id);
if(r){
sv("fNm",r.name);sv("fVob",r.vobRegel||"18363");
_tmpAbz=JSON.parse(JSON.stringify(r.abzuege||[]));
setModus(r.mode||"gesamt");
if(r.mode==="gesamt"){
sv("fL",disp(r.laenge_mm||0));sv("fB",disp(r.breite_mm||0));sv("fH",disp(r.hoehe_mm||0));
_tmpZF=JSON.parse(JSON.stringify(r.zusatzFlaechen||[]));
if(r.schraege&&r.schraege.br_mm>0){
sv("sBr",disp(r.schraege.br_mm));sv("sHL",disp(r.schraege.hL_mm));sv("sHR",disp(r.schraege.hR_mm));
var sb2=el("schBody"),sa2=el("schArr");
if(sb2)sb2.classList.add("open");if(sa2)sa2.classList.add("open");
}
} else if(r.mode==="wand"){
_tmpWae=JSON.parse(JSON.stringify(r.waende||[]));
if(r.decke_mm2>0){
sv("fDecke",AufmassLogik.fmt(r.decke_mm2));
// Decke als Quadrat anzeigen (Seitenkante = sqrt)
var sqrtD=Math.sqrt(r.decke_mm2/1000000);
sv("fDeckeL",sqrtD.toFixed(2));
sv("fDeckeB",sqrtD.toFixed(2));
calcDeckeFromLB();
}
} else {
_tmpSei=JSON.parse(JSON.stringify(r.seiten||[]));
if(r.sockel){sv("soH",disp(r.sockel.h_mm||0));sv("soU",disp(r.sockel.umfang_mm||0));}
if(r.laibung){sv("lbH",disp(r.laibung.h_mm||0));sv("lbT",disp(r.laibung.t_mm||0));sv("lbAnz",r.laibung.anz||0);}
var st=el("sockelBody"),sa3=el("sockelArr");
if(r.sockel&&(r.sockel.h_mm>0||r.sockel.umfang_mm>0)){
if(st)st.classList.add("open");if(sa3)sa3.classList.add("open");
}
}
if(r.foto){sv("rFotoData",r.foto);var fi2=el("rFotoImg");if(fi2)fi2.src=r.foto;show("rFotoWrap");}
}
} else { setModus("gesamt"); }

renderZF();renderWL();renderFas();renderAbz();calcLive();updateLabels();
hide("sL");show("sF");window.scrollTo(0,0);

}

function showList(){hide("sF");show("sL");renderListe();}

/* ============================================================
SCREEN: LISTE
============================================================ */
function renderListe(){
var raeume=AufmassStore.getAll();
var sub=el("lSub"); if(sub)sub.textContent="VOB/C konform \u00B7 "+raeume.length+" Raeume";
var totN=0,totB=0;

var html=raeume.map(function(r){
var res=AufmassLogik.berechne(r);
totN+=res.wand_netto;totB+=res.wand_brutto;
var modeTag={"gesamt":"Raum","wand":"W/W","fassade":"Fassade"}[r.mode]||"";
var vobTag=r.vobRegel||"18363";

/* Foto-Thumbnail */
var thumbHtml=r.foto
?"<div class='rc-thumb'><img src='"+r.foto+"' alt=''></div>"
:"<div class='rc-thumb-ph'><svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='var(--bdr)' stroke-width='1.5'><path d='M3 3h18v18H3z'/><path d='M3 9h18M9 3v18'/></svg></div>";

var chips=
"<span class='rc-chip rt-grn' style='padding:3px 8px'>"+fm(res.wand_netto)+" m\u00B2 netto</span>"+
"<span class='rc-chip rt-mut' style='padding:3px 8px'>"+modeTag+"</span>"+
"<span class='rc-chip rt-acc' style='padding:3px 8px'>DIN "+vobTag+"</span>";

var abzInfo=res.abzug_gesamt>0?" \u00B7 -"+fm(res.abzug_gesamt)+" m\u00B2 Abzug":"";
return "<div class='rc'>"+
"<div class='rc-top'>"+thumbHtml+
"<div class='rc-main'>" +
"<div class='rc-nm'>"+esc(r.name||"Raum")+"</div>"+
"<div class='rc-sub'>Brutto "+fm(res.wand_brutto)+" m\u00B2"+abzInfo+
(r.mode==="fassade"&&res.lm?" \u00B7 "+res.lm.umfang_lfm+" lfm":"")+
"</div>"+
"<div class='rc-m2-row'>"+chips+"</div>"+
"</div>"+
"</div>"+
"<div class='rc-btns'>"+
"<button class='btn btn-sm btn-o' data-edit='"+r.id+"'>Bearbeiten</button>"+
"<button class='btn btn-sm btn-r' data-del='"+r.id+"'>Loeschen</button>"+
"</div>"+
"</div>";
}).join("")||"<div class='empty'><div class='empty-icon'>▣</div><p>Noch keine Flaechen erfasst.<br>Mit «Neuen Raum erfassen» beginnen.</p></div>";

el("rcList").innerHTML=html;

var gb=el("gesamtBox");
if(raeume.length&&gb){
show("gesamtBox");show("btnPDF");show("btnZuAngebot");
gb.innerHTML="<div style='background:var(--s1);border-radius:var(--r);border:1px solid var(--bdr);padding:14px;margin-top:2px'>" +
"<div class='sec' style='margin-top:0;color:var(--acc)'>Gesamtergebnis</div>" +
"<div class='res-grid-3'>"+
tile("Netto ges.",fm(totN),"m\u00B2","rt-grn")+
tile("Brutto ges.",fm(totB),"m\u00B2","rt-acc")+
tile("Raeume",raeume.length,"Stk","rt-mut")+
"</div></div>";
} else {if(gb)hide("gesamtBox");hide("btnPDF");hide("btnZuAngebot");}


el("rcList").querySelectorAll("[data-edit]").forEach(function(b){
b.onclick=function(e){e.stopPropagation();showForm(this.dataset.edit);};
});
el("rcList").querySelectorAll("[data-del]").forEach(function(b){
b.onclick=function(e){e.stopPropagation();
var _amId=this.dataset.del; iosConfirm("Raum loeschen?", function(){AufmassStore.del(_amId);renderListe();haptic("error"); toast("Geloescht");});
};
});

}

/* ============================================================
PDF BERICHT
============================================================ */
function buildPDF(){
var raeume=AufmassStore.getAll();
var dat=new Date().toLocaleDateString("de-DE");
var totN=0,totB=0;
var rows=raeume.map(function(r,i){
var res=AufmassLogik.berechne(r);
totN+=res.wand_netto;totB+=res.wand_brutto;
var abzRows=res.abz_details.map(function(d){
var vTxt=d.vob_relevant?"(abgezogen)":"(\u2264 Schwelle, kein Abzug)";
return "<tr style='background:#f9fafb'><td style='padding:5px 10px;color:#6b7280;font-size:10px'>  "+
esc(d.abzug.nm||"Abzug")+"</td>" +
"<td style='padding:5px 10px;text-align:right;font-size:10px'>"+fm(d.flaeche_mm2)+"</td>" +
"<td style='padding:5px 10px;text-align:right;font-size:10px;color:"+(d.vob_relevant?"#ef4444":"#94a3b8")+"'>"+
(d.vob_relevant?"-"+fm(d.abzug_mm2):"0,00")+" m\u00B2</td>" +
"<td style='padding:5px 10px;font-size:10px;color:#6b7280'>"+vTxt+"</td>" +
(d.abzug.foto?"<td><img src='"+d.abzug.foto+"' style='height:28px;width:42px;object-fit:cover;border-radius:3px'></td>":"<td></td>") +
"</tr>";
}).join("");
var lmRow="";
if(r.mode==="fassade"&&res.lm&&(res.lm.sockel_lfm>0||res.lm.laib_m2>0)){
lmRow="<tr style='background:#f0fdf4'><td colspan='4' style='padding:5px 10px;font-size:10px;color:#059669'>"+
"  Laufmeter: Sockel "+res.lm.sockel_lfm+" lfm • Laibungen "+res.lm.laib_m2+" m\u00B2 / "+res.lm.laib_lfm+" lfm</td><td></td></tr>";
}
var fotoCell=r.foto?"<td rowspan='2' style='padding:8px;width:66px'><img src='"+r.foto+"' style='width:66px;height:52px;object-fit:cover;border-radius:5px'></td>":"<td></td>";
var modeNm={"gesamt":"Raum","wand":"Wand/Wand","fassade":"Fassade"}[r.mode]||"";
return "<tr style='background:#1a1a2e;color:#fff'>" +
"<td style='padding:10px;font-weight:700;font-size:13px'>"+(i+1)+". "+esc(r.name||"Raum")+"</td>" +
"<td style='padding:10px;text-align:right;font-weight:700'>"+fm(res.wand_netto)+" m\u00B2</td>" +
"<td style='padding:10px;text-align:right;color:#38bdf8'>"+fm(res.wand_brutto)+"</td>" +
"<td style='padding:10px;font-size:11px;color:#94a3b8'>"+modeNm+" • DIN "+(r.vobRegel||"18363")+"</td>" +
fotoCell+"</tr>"+abzRows+lmRow;
}).join("");

return "<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'><title>Aufmass Bericht "+dat+"</title>" +
"<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;max-width:820px;margin:0 auto;padding:28px}" +
".tb{background:#f4f4f8;padding:10px 20px;display:flex;gap:12px;margin-bottom:18px}" +
".tb button{background:#1a1a2e;color:#fff;border:none;padding:8px 20px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer}" +
"table{width:100%;border-collapse:collapse;margin-bottom:18px}tr:nth-child(even){background:#f8fafc}" +
"th{background:#1a1a2e;color:#fff;padding:9px 10px;text-align:left;font-weight:600;font-size:11px}" +
"@media print{.tb{display:none}body{padding:18px}}</style></head><body>" +
"<div class='tb'><button onclick='window.print()'>Drucken / Als PDF</button></div>" +
"<div style='display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:3px solid #1a1a2e;padding-bottom:12px'>" +
"<div><div style='font-size:22px;font-weight:900'>Maler<span style='color:#38bdf8'>Pro</span></div>" +
"<div style='font-size:11px;color:#6b7280;margin-top:4px'>Aufmass-Bericht • VOB/C</div></div>" +
"<div style='text-align:right'><div style='font-size:14px;font-weight:700'>"+dat+"</div>" +
"<div style='font-size:11px;color:#6b7280'>"+raeume.length+" Flaechen</div></div>" +
"</div>" +
"<table><thead><tr><th>Raum / Flaeche</th><th style='text-align:right'>Netto</th>" +
"<th style='text-align:right'>Brutto</th><th>Modus / Regelwerk</th><th>Foto</th></tr></thead>" +
"<tbody>"+rows+"</tbody>" +
"<tfoot><tr style='background:#0f172a;color:#fff'>" +
"<td style='padding:10px;font-weight:700'>GESAMT</td>" +
"<td style='padding:10px;text-align:right;font-weight:700;color:#38bdf8'>"+fm(totN)+" m\u00B2</td>" +
"<td style='padding:10px;text-align:right'>"+fm(totB)+" m\u00B2</td>" +
"<td colspan='2' style='padding:10px;font-size:10px;color:#94a3b8'>Erstellt mit Workbase • VOB/C DIN 18363 / 18345 / 18350</td>" +
"</tr></tfoot></table></body></html>";

}

/* ============================================================
EVENTS
============================================================ */
function initEvents(){
/* Unit */
el("btnM").onclick=function(){AufmassStore.setE("m");el("btnM").classList.add("on");el("btnCM").classList.remove("on");updateLabels();calcLive();};
el("btnCM").onclick=function(){AufmassStore.setE("cm");el("btnCM").classList.add("on");el("btnM").classList.remove("on");updateLabels();calcLive();};
if(AufmassStore.getE()==="cm"){el("btnCM").classList.add("on");el("btnM").classList.remove("on");}

/* Modus Tabs */
document.querySelectorAll(".tab[data-mode]").forEach(function(b){
b.onclick=function(){setModus(this.dataset.mode);};
});

/* VOB Auswahl -> Ergebnis aktualisieren */
el("fVob").onchange=function(){calcLive();renderAbz();};

/* Live Felder */
["fL","fB","fH","sBr","sHL","sHR"].forEach(function(id){
var e=el(id);if(e)e.addEventListener("input",calcLive);
});
["soH","soU","lbH","lbT","lbAnz"].forEach(function(id){
var e=el(id);if(e)e.addEventListener("input",function(){calcSockelVors();calcLive();});

/* Decke L x B Rechner */
function calcDeckeLxB(){
var l=parseFloat(el("deckL")?el("deckL").value:0)||0;
var b2=parseFloat(el("deckB")?el("deckB").value:0)||0;
if(l>0&&b2>0){
var m2=(Math.round(l*b2*100)/100).toFixed(2);
var fd=el("fDecke"); if(fd)fd.value=m2;
calcLive();
}
}
[el("deckL"),el("deckB")].forEach(function(e){
if(e) e.addEventListener("input", calcDeckeLxB);
});
if(el("fDecke")) el("fDecke").addEventListener("input", calcLive);
});

/* Zusatzflaeche */
el("btnZF").onclick=function(){
var nm=gv("zfNm")||"Zusatz "+(_tmpZF.length+1);
var l=toMm(gv("zfL")),h=toMm(gv("zfH"));
if(!l||!h){toast("L und H eingeben",true);return;}
_tmpZF.push({id:AufmassStore.uid(),nm:nm,l_mm:l,h_mm:h});
sv("zfNm","");sv("zfL","");sv("zfH","");renderZF();calcLive();
};
/* Wand */
el("btnAddWand").onclick=function(){
var nm=gv("wNm")||"Wand "+(_tmpWae.length+1);
var l=toMm(gv("wL")),h=toMm(gv("wH"));
if(!l||!h){toast("L und H eingeben",true);return;}
_tmpWae.push({id:AufmassStore.uid(),nm:nm,l_mm:l,h_mm:h});
sv("wNm","");sv("wL","");sv("wH","");renderWL();calcLive();
};
/* Fassadenseite */
el("btnAddSeite").onclick=function(){
_tmpSei.push(AufmassStore.newSeite("Seite "+(_tmpSei.length+1)));
renderFas();calcLive();
};
/* Abzug */
el("btnAddAbz").onclick=function(){
_tmpAbz.push(AufmassStore.newAbz());
renderAbz();calcLive();
setTimeout(function(){
var c=document.querySelectorAll(".abz-card");
if(c.length)c[c.length-1].scrollIntoView({behavior:"smooth",block:"nearest"});
},50);
};
/* Toggles */
el("schTgl").onclick=function(){el("schBody").classList.toggle("open");el("schArr").classList.toggle("open");};
el("sockelTgl").onclick=function(){el("sockelBody").classList.toggle("open");el("sockelArr").classList.toggle("open");};
/* Raum Foto */
el("rFotoInput").onchange=function(){
var f=this.files[0];if(!f)return;
fotoLoad(f,function(d){sv("rFotoData",d);var fi=el("rFotoImg");if(fi)fi.src=d;show("rFotoWrap");toast("Foto geladen");});
};
el("rFotoRm").onclick=function(){
sv("rFotoData","");var fi=el("rFotoImg");if(fi)fi.src="";hide("rFotoWrap");
var inp=el("rFotoInput");if(inp)inp.value="";
};
/* Nav */
el("btnNeu").onclick=function(){showForm(null);};
el("btnBack").onclick=function(){showList();};
el("btnCancel").onclick=function(){showList();};
el("btnPDF").onclick=function(){
  el("btnZuAngebot").onclick=function(){
var raeume=AufmassStore.getAll();
if(!raeume.length){toast("Keine Raeume vorhanden",true);return;}
var neu={
id:uid(),
nummer:genAngNr(),
status:"entwurf",
erstellt:Date.now(),
datum:new Date().toISOString().slice(0,10),
positionen:[],
kundeName:"",
kundeId:"",
anschrift:"",
objekt:""
};
raeume.forEach(function(r){
var res=AufmassLogik.berechne(r);
var m2=parseFloat((res.wand_netto/1000000).toFixed(2));
neu.positionen.push({
id:uid(),
name:"Leistung waehlen",
einh:"m2",
menge:m2,
ep:0,
gruppe:r.name||"Raum",
text:"",
aufmassM2:m2
});
});


var alle=DB.ang2();
alle.push(neu);
DB.sAng2(alle);
ANG.current=neu;
haptic("medium");
toast("Angebot erstellt");
navTo("ang-edit");
renderAngEditor();
};

openPDF(buildPDF());
};
el("btnZuAngebot").onclick=function(){
var raeume=AufmassStore.getAll();
if(!raeume.length){toast("Keine Raeume vorhanden",true);return;}
var neu={
id:uid(),
nummer:genAngNr(),
status:"entwurf",
erstellt:Date.now(),
datum:new Date().toISOString().slice(0,10),
positionen:[],
kundeName:"",
kundeId:"",
anschrift:"",
objekt:""
};
raeume.forEach(function(r){
var res=AufmassLogik.berechne(r);
var m2=parseFloat((res.wand_netto/1000000).toFixed(2));
neu.positionen.push({
id:uid(),
name:r.name||"Raum",
einh:"m2",
menge:m2,
ep:0,
gruppe:r.name||"Raum"
});
});
var alle=DB.ang2();
alle.push(neu);
DB.sAng2(alle);
ANG.current=neu;
haptic("medium");
toast("Angebot erstellt");
navTo("ang-edit");
renderAngEditor();
};

/* Speichern */
el("btnSave").onclick=function(){
var r=buildTmpRaum();
if(r.mode==="gesamt"&&(!r.laenge_mm||!r.breite_mm||!r.hoehe_mm)){toast("L, B und H eingeben",true);return;}
if(r.mode==="wand"&&!r.waende.length){toast("Mindestens eine Wand",true);return;}
if(r.mode==="fassade"&&!r.seiten.length){toast("Mindestens eine Fassadenseite",true);return;}
AufmassStore.save(r);haptic("medium"); toast("Gespeichert");showList();
};

}

function init(){initEvents();updateLabels();renderListe();}
return {init:init};
})();

function initAufmassTab(){
if(typeof AufmassUI!=="undefined") AufmassUI.init();
}

// ============================================================
// FAB - Floating Action Button (kontextabhaengig)
// ============================================================
var FAB_TABS = {
k:   function(){ oKunde(); },
p:   function(){ oProjekt(); },
a:   function(){ oAngNeu(); },
r:   function(){ oRechNeu(); },
n:   function(){ oNotiz && oNotiz(); },
mat: function(){ openMatForm(null); },
ger: function(){ /* Geraet */ var e=el("gerAddBtn"); if(e)e.click(); }
};
var FAB_HIDDEN = ["d","kat","am","zeit","txt","set","ang-edit","rech-edit"];

function updateFAB(tab){
var fab = el("fabBtn"); if(!fab) return;
if(FAB_HIDDEN.indexOf(tab) >= 0 || !FAB_TABS[tab]){
fab.classList.add("fab-hidden");
} else {
fab.classList.remove("fab-hidden");
fab.onclick = function(){ haptic("medium"); FAB_TABS[tab](); };
}
}

(function(){
var fab = el("fabBtn"); if(!fab) return;
// Initial
updateFAB(CS || "d");
})();

// ============================================================
// DARK / LIGHT MODE TOGGLE
// ============================================================
(function(){
var btn = el("themeToggleBtn"); if(!btn) return;
// Gespeichertes Theme laden
try {
var saved = localStorage.getItem("mp_theme");
if(saved === "light"){ document.body.classList.add("light-mode"); btn.textContent = "\u2600"; }
} catch(e){}

btn.onclick = function(){
var isLight = document.body.classList.toggle("light-mode");
btn.textContent = isLight ? "\u2600" : "\u263E";
try { localStorage.setItem("mp_theme", isLight ? "light" : "dark"); } catch(e){}
haptic("light");
};
})();

// ============================================================
// ONBOARDING - Erster Start
// ============================================================
(function(){
try {
var shown = localStorage.getItem("mp_ob_done");
if(shown) return;
var ob = el("onboarding"); if(!ob) return;
ob.style.display = "flex";

function finishOnboarding(){
var firma   = (el("ob-firma")   ? el("ob-firma").value.trim()   : "") || "Workbase";
var inhaber = (el("ob-inhaber") ? el("ob-inhaber").value.trim() : "") || "";
if(firma || inhaber){
var s = DB.settings();
if(firma)   s.firma   = firma;
if(inhaber) s.inhaber = inhaber;
DB.sSet(s);
}
ob.style.opacity = "0";
ob.style.transition = "opacity .4s";
setTimeout(function(){ ob.style.display = "none"; ob.style.opacity = ""; }, 400);
try { localStorage.setItem("mp_ob_done","1"); } catch(e){}
}

var sb = el("ob-start"); if(sb) sb.onclick = function(){ haptic("medium"); finishOnboarding(); };
var sk = el("ob-skip");  if(sk) sk.onclick = function(){ finishOnboarding(); };

// Enter-Taste
[el("ob-firma"), el("ob-inhaber")].forEach(function(inp){
if(inp) inp.addEventListener("keydown", function(e){ if(e.key === "Enter") finishOnboarding(); });
});

} catch(e){}
})();

/* ================================================================
SWIPE NAVIGATION
================================================================ */
(function(){
var mainTabs = ['d', 'k', 'p', 'a', 'r', 'kat', 'am', 'n', 'zeit', 'mat', 'ger', 'txt'];
var tx=0, ty=0, swiping=false, THRESH=60;

document.addEventListener("touchstart",function(e){
var tgt=e.target;
if(tgt.tagName==="INPUT"||tgt.tagName==="TEXTAREA"||tgt.tagName==="SELECT") return;
var el2=tgt; while(el2&&el2!==document.body){
var st=window.getComputedStyle(el2);
if((st.overflowX==="auto"||st.overflowX==="scroll")&&el2.scrollWidth>el2.clientWidth) return;
el2=el2.parentElement;
}
tx=e.touches[0].clientX; ty=e.touches[0].clientY; swiping=true;
},{passive:true});

document.addEventListener("touchend",function(e){
if(!swiping) return; swiping=false;
var dx=e.changedTouches[0].clientX-tx;
var dy=e.changedTouches[0].clientY-ty;
if(Math.abs(dy)>Math.abs(dx)*1.5) return;
if(Math.abs(dx)<THRESH) return;
var cur=mainTabs.indexOf(CS);
if(cur<0) return;
if(dx<0 && cur<mainTabs.length-1) navToAnim(mainTabs[cur+1],"left");
else if(dx>0 && cur>0) navToAnim(mainTabs[cur-1],"right");
},{passive:true});

window.navToAnim = function(target, dir){
var fromScr=document.getElementById("s-"+CS);
var toScr=document.getElementById("s-"+target);
if(!fromScr||!toScr) return;
var w=window.innerWidth;
toScr.style.transform="translateX("+(dir==="left"?w:-w)+"px)";
toScr.style.transition="none";
toScr.classList.add("act");
if(RENDERS[target]) RENDERS[target]();
document.querySelectorAll(".nb").forEach(function(b){ b.classList.remove("on"); });
var btn=document.querySelector(".nb[data-s='"+target+"']");
if(btn) btn.classList.add("on");
CS=target;
requestAnimationFrame(function(){
requestAnimationFrame(function(){
fromScr.style.transition="transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)";
fromScr.style.transform="translateX("+(dir==="left"?-w:w)+"px)";
toScr.style.transition="transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)";
toScr.style.transform="translateX(0)";
setTimeout(function(){
fromScr.classList.remove("act");
fromScr.style.transform="";
fromScr.style.transition="";
toScr.style.transform="";
toScr.style.transition="";
},290);
});
});
};
})();

// ============================================================
// SWIPE TO DELETE (.li Elemente)
// ============================================================
(function(){
var startX=0, startY=0, swipeEl=null, swipeWrap=null, currentX=0, swiping=false;
var THRESH = 60;

function wrapLi(li){
// li bereits gewrappt?
if(li.parentElement && li.parentElement.classList.contains("li-wrap")) return li.parentElement;
var wrap = document.createElement("div");
wrap.className = "li-wrap";
var bg = document.createElement("div");
bg.className = "li-swipe-bg";
bg.innerHTML = "<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6M14 11v6'/><path d='M9 6V4h6v2'/></svg>";
li.parentNode.insertBefore(wrap, li);
wrap.appendChild(bg);
wrap.appendChild(li);
li.style.position = "relative";
li.style.zIndex = "1";
return wrap;
}

document.addEventListener("touchstart", function(e){
var li = e.target.closest(".li");
if(!li) return;
// Nicht bei Buttons
if(e.target.closest("button")) return;
startX = e.touches[0].clientX;
startY = e.touches[0].clientY;
swipeEl = li;
swipeWrap = wrapLi(li);
swiping = false; currentX = 0;
}, {passive:true});

document.addEventListener("touchmove", function(e){
if(!swipeEl) return;
var dx = e.touches[0].clientX - startX;
var dy = e.touches[0].clientY - startY;
if(!swiping && Math.abs(dy) > Math.abs(dx)) { swipeEl=null; return; }
if(dx > 0){ swipeEl=null; return; } // nur nach links
swiping = true;
currentX = Math.max(dx, -90);
swipeEl.style.transform = "translateX("+currentX+"px)";
swipeEl.style.transition = "none";
}, {passive:true});

document.addEventListener("touchend", function(){
if(!swipeEl) return;
if(Math.abs(currentX) > THRESH){
// Loeschen ausloesen: klick auf den dbt Button
var dbt = swipeEl.querySelector("[data-dk],[data-dp],[data-da],[data-dr]");
swipeEl.style.transform = "translateX(-100%)";
swipeEl.style.transition = "transform .2s";
setTimeout(function(){
if(dbt) dbt.click();
}, 180);
} else {
swipeEl.style.transform = "";
swipeEl.style.transition = "transform .25s";
}
swipeEl = null; swipeWrap = null; currentX = 0; swiping = false;
}, {passive:true});
})();
 var BOLLER_SVG='<svg stroke-miterlimit="10" style="fill-rule:nonzero;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;" version="1.1" viewBox="589.3 856.293 1245.89 251.977" xmlns="http://www.w3.org/2000/svg"><g><g><path d="M589.3 921.668L589.3 1061.74L671.635 1086.1L671.635 959.17Z" fill="#4a5d5e"/><path d="M671.635 1011.82L724.566 974.225C727.193 972.359 730.183 971.064 733.342 970.423L733.472 970.397C736.325 969.818 739.264 969.801 742.123 970.346C745.732 971.035 749.116 972.6 751.977 974.904L767.553 987.446C768.043 987.841 768.517 988.255 768.974 988.687L786.983 1005.72C787.666 1006.37 788.31 1007.06 788.911 1007.78C789.512 1008.5 794.212 1014.15 794.212 1014.15C798.036 1018.74 799.565 1024.83 798.368 1030.68C798.071 1032.14 797.611 1033.55 796.997 1034.9C796.997 1034.9 786.983 1059.05 779.217 1073.95C771.451 1088.85 770.486 1089.53 762.587 1098.11C754.687 1106.69 747.619 1108.27 747.619 1108.27L671.635 1086.1" fill="#b36a4c"/><path d="M593.254 860.171C591.037 860.289 589.3 862.121 589.3 864.34L589.3 919.04C589.3 920.646 590.221 922.11 591.669 922.805L671.635 961.161C671.635 961.161 683.294 966.226 694.056 969.953C704.817 973.68 723.705 959.677 739.833 948.372C755.961 937.067 762.82 931.08 762.82 931.08C762.82 931.08 775.303 922.42 770.864 913.479C766.425 904.537 765.674 905.091 755.961 894.1C746.248 883.109 744.346 882.288 735.948 877.374C727.55 872.459 715.349 865.057 701.382 859.965C687.416 854.872 661.25 856.562 661.25 856.562Z" fill="#b8c4bc"/></g><g><path d="M879.21 1022.84L879.21 861.158L958.209 861.158C978.491 861.158 993.783 865.007 1004.08 872.705C1014.38 880.403 1019.53 890.597 1019.53 903.286C1019.53 911.726 1017.45 919.049 1013.28 925.254C1009.11 931.46 1003.38 936.27 996.107 939.687C988.831 943.104 980.505 944.812 971.129 944.812L975.471 935.266C985.682 935.266 994.695 936.944 1002.51 940.301C1010.32 943.657 1016.46 948.568 1020.9 955.033C1025.35 961.498 1027.57 969.381 1027.57 978.683C1027.57 992.602 1022.11 1003.44 1011.18 1011.2C1000.25 1018.96 984.134 1022.84 962.828 1022.84L879.21 1022.84ZM916.351 994.765L960.157 994.765C969.789 994.765 977.128 993.153 982.175 989.929C987.221 986.705 989.745 981.666 989.745 974.814C989.745 967.962 987.221 962.9 982.175 959.631C977.128 956.361 969.789 954.726 960.157 954.726L913.63 954.726L913.63 927.474L953.603 927.474C962.737 927.474 969.703 925.877 974.503 922.683C979.304 919.489 981.704 914.712 981.704 908.353C981.704 901.934 979.304 897.143 974.503 893.98C969.703 890.817 962.737 889.236 953.603 889.236L916.351 889.236Z" fill="#4a5d5e"/><path d="M1135.64 1025.56C1122.91 1025.56 1111.14 1023.49 1100.33 1019.33C1089.52 1015.17 1080.15 1009.33 1072.22 1001.8C1064.29 994.267 1058.12 985.426 1053.72 975.272C1049.32 965.119 1047.11 954.014 1047.11 941.957C1047.11 929.9 1049.32 918.816 1053.72 908.705C1058.12 898.594 1064.29 889.76 1072.23 882.204C1080.17 874.648 1089.53 868.797 1100.31 864.653C1111.09 860.509 1122.84 858.436 1135.56 858.436C1148.34 858.436 1160.09 860.5 1170.82 864.628C1181.54 868.755 1190.86 874.582 1198.78 882.108C1206.7 889.634 1212.86 898.469 1217.27 908.613C1221.67 918.757 1223.87 929.876 1223.87 941.971C1223.87 954.067 1221.67 965.202 1217.27 975.379C1212.86 985.555 1206.7 994.4 1198.78 1001.91C1190.86 1009.43 1181.54 1015.25 1170.82 1019.37C1160.09 1023.5 1148.37 1025.56 1135.64 1025.56ZM1135.56 993.852C1142.78 993.852 1149.45 992.596 1155.56 990.084C1161.68 987.572 1167.01 984.01 1171.57 979.397C1176.13 974.785 1179.68 969.312 1182.23 962.978C1184.77 956.644 1186.04 949.637 1186.04 941.957C1186.04 934.279 1184.78 927.292 1182.24 920.994C1179.71 914.696 1176.16 909.239 1171.6 904.621C1167.03 900.004 1161.69 896.438 1155.58 893.922C1149.46 891.407 1142.79 890.149 1135.57 890.149C1128.35 890.149 1121.66 891.408 1115.52 893.926C1109.38 896.444 1104.02 900.014 1099.44 904.638C1094.86 909.261 1091.3 914.725 1088.76 921.03C1086.22 927.335 1084.94 934.309 1084.94 941.953C1084.94 949.6 1086.21 956.589 1088.75 962.922C1091.29 969.255 1094.85 974.744 1099.42 979.388C1103.99 984.033 1109.35 987.605 1115.5 990.104C1121.65 992.602 1128.34 993.852 1135.56 993.852Z" fill="#4a5d5e"/><path d="M1253.5 1022.84L1253.5 861.158L1291.01 861.158L1291.01 992.282L1371.94 992.282L1371.94 1022.84Z" fill="#4a5d5e"/><path d="M1394.49 1022.84L1394.49 861.158L1431.99 861.158L1431.99 992.282L1512.93 992.282L1512.93 1022.84Z" fill="#4a5d5e"/><path d="M1535.48 1022.84L1535.48 861.158L1657.56 861.158L1657.56 891.261L1572.62 891.261L1572.62 992.74L1660.71 992.74L1660.71 1022.84ZM1569.89 955.321L1569.89 926.229L1647.81 926.229L1647.81 955.321Z" fill="#4a5d5e"/><path d="M1691.91 1022.84L1691.91 861.158L1760.89 861.158C1783.45 861.158 1800.96 866.368 1813.43 876.79C1825.9 887.212 1832.14 901.537 1832.14 919.765C1832.14 931.774 1829.3 942.119 1823.62 950.803C1817.94 959.486 1809.85 966.145 1799.35 970.779C1788.85 975.413 1776.33 977.73 1761.8 977.73L1712.69 977.73L1729.41 961.457L1729.41 1022.84ZM1794.82 1022.84L1754.25 964.084L1794.3 964.084ZM1729.41 965.513L1712.69 947.905L1759.87 947.905C1771.32 947.905 1779.92 945.421 1785.68 940.454C1791.43 935.487 1794.31 928.59 1794.31 919.765C1794.31 910.848 1791.43 903.93 1785.68 899.009C1779.92 894.089 1771.32 891.629 1759.87 891.629L1712.69 891.629Z" fill="#4a5d5e"/></g></g></svg>';
 function _bCSS(){
var C={p:'#4a5d5e',pd:'#2e4a4f',t:'#4a7c80',tr:'#b36a4c',s:'#b8c4bc',sm:'#a8bcba',sl:'#edf1f0',ow:'#f7f5f2',td:'#333',tm:'#555',tl:'#888'};
return '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;font-size:11px;color:'+C.td+';background:#fff;max-width:820px;margin:0 auto}.tb{background:#f4f4f0;padding:10px 32px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e8e4de}.tb button{background:'+C.p+';color:#fff;border:none;padding:9px 22px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}.dh{background:'+C.p+';padding:24px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px}.dl{width:190px;flex-shrink:0;filter:brightness(0) invert(1)}.dl svg{width:100%;height:auto}.dr{text-align:right;color:rgba(255,255,255,.7)}.dr .dt{font-size:21px;font-weight:700;color:#fff;letter-spacing:1px;font-style:italic}.dr .dm{font-size:9px;line-height:2;margin-top:4px}.dr .dm strong{color:#fff}.da{display:grid;grid-template-columns:1fr 1fr;border-bottom:3px solid '+C.sm+'}.dfr{background:'+C.ow+';padding:18px 36px;border-right:1px solid #e8e4de}.dto{background:#fff;padding:18px 36px}.dal{font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:'+C.t+';font-weight:700;margin-bottom:7px}.dn{font-size:13px;font-weight:700;color:'+C.p+';margin-bottom:3px}.dd{font-size:9.5px;color:'+C.tm+';line-height:1.9}.db{padding:26px 36px}.dtb{background:'+C.pd+';padding:11px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}.dtb h2{font-size:12px;font-weight:700;color:#fff;letter-spacing:.5px;font-style:italic}.dtb span{font-size:9.5px;color:rgba(255,255,255,.6)}.danschr{font-size:11px;line-height:1.8;color:'+C.tm+';margin-bottom:18px;white-space:pre-wrap;font-style:italic}table.pt{width:100%;border-collapse:collapse}table.pt thead tr{background:'+C.p+';color:#fff}table.pt thead th{padding:9px 10px;text-align:left;font-size:9px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}table.pt th.r,table.pt td.r{text-align:right}table.pt tr.gh td{background:'+C.t+';color:#fff;padding:7px 10px;font-size:10px;font-weight:700}table.pt tr.pe td{background:#fff;padding:7px 10px;font-size:10px;border-bottom:1px solid #f0ede8}table.pt tr.po td{background:'+C.sl+';padding:7px 10px;font-size:10px;border-bottom:1px solid #e8e4de}table.pt td.pnr{color:'+C.tl+';font-size:9px;width:26px}table.pt td.pnm{font-weight:600;color:'+C.p+'}table.pt td.psub{font-size:9px;color:'+C.tl+';display:block;margin-top:1px}table.pt td.pgp{font-weight:700;color:'+C.pd+'}.sb{margin-left:auto;width:272px;border:1px solid #e8e4de}.sr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11px;border-bottom:1px solid #f0ede8}.sr.mw{background:'+C.ow+'}.sr.tot{background:'+C.tr+';color:#fff;font-size:13px;font-weight:700;border:none}.sr.tot span{color:#fff}.sr.rab{background:'+C.ow+';color:'+C.tr+'}.sr.zah{background:#f0fdf4}.ku-hw{background:'+C.sl+';border-left:3px solid '+C.t+';padding:10px 14px;font-size:9.5px;color:'+C.tm+';margin-top:16px;line-height:1.7}.kond{background:'+C.ow+';border-top:2px solid '+C.sm+';padding:13px 18px;margin-top:16px;font-size:9.5px;color:'+C.tm+';line-height:1.8}.kond strong{color:'+C.p+'}.schluss{margin-top:16px;font-size:11px;line-height:1.8;color:'+C.tm+';white-space:pre-wrap}.sig{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:32px;padding-top:14px;border-top:2px solid '+C.sm+'}.sigl{border-top:1px solid '+C.p+';padding-top:5px;font-size:8.5px;color:'+C.tl+';margin-top:48px}.stripe{height:4px;background:linear-gradient(90deg,'+C.p+' 0%,'+C.t+' 40%,'+C.tr+' 70%,'+C.s+' 100%)}.df{background:'+C.p+';padding:11px 36px;display:flex;justify-content:space-between;align-items:center}.df span{font-size:8px;color:rgba(255,255,255,.55)}.df .fl{width:55px;opacity:.45;filter:brightness(0) invert(1)}.df .fl svg{width:100%;height:auto}.mb{background:'+C.tr+';padding:13px 36px;color:#fff;display:flex;justify-content:space-between;align-items:center}.mb h3{font-size:13px;font-weight:700;font-style:italic}.mb span{font-size:10px;opacity:.8}.mw2{background:#fef2ec;border:1.5px solid '+C.tr+';padding:13px 18px;margin-bottom:16px;font-size:10.5px;line-height:1.7;color:'+C.pd+'}.mw2 strong{color:'+C.tr+'}.mkond{background:#fef2ec;border-left:3px solid '+C.tr+';padding:11px 14px;margin-top:8px;font-size:9.5px;line-height:1.8;color:'+C.tm+'}.mkond strong{color:'+C.tr+'}@media print{.tb{display:none!important}body{max-width:none}}';
}
function renderAufmass(){
var sc=el("s-am"); if(!sc) return;
if(!sc.dataset.amInited){
var tpl=document.getElementById("am-tpl");
if(tpl){
sc.innerHTML='<div style="height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#0f172a">' + tpl.innerHTML + '</div>';
sc.dataset.amInited="1";
setTimeout(initAufmassTab, 80);
}
}
}

function aufmassZuProjekt(){
if(!curAmProjId) return;
var AM=DB.aufmass().filter(function(a){return a.projId===curAmProjId;});
var tot=AM.reduce(function(s,a){return s+(a.m2netto||0);},0);
var P=DB.projekte(); var idx=P.findIndex(function(x){return x.id===curAmProjId;});
if(idx<0) return;
var raeume=(P[idx].raeume||[]).filter(function(r){return !r.fromAufmass;});
raeume.push({nm:"Aufmass gesamt",b:tot,h:1,m2:parseFloat(tot.toFixed(3)),fromAufmass:true});
P[idx].raeume=raeume; DB.sP(P);
toast("Aufmass ("+tot.toFixed(2)+" m2) in Projekt uebernommen");
navTo("p");
}

function buildFormelInputs(){
var fId=(el("amFormel")||{}).value||"rechteck";
var f=FORMELN[fId]; if(!f) return;
var h=f.felder.map(function(lbl,i){
return "<div class='fg'><label>"+lbl+"</label>"+
"<input type='number' id='amF"+i+"' min='0' step='0.01' placeholder='0' class='amFinp'></div>";
}).join("");
var c2=el("amInputs"); if(c2){
c2.innerHTML=h;
c2.querySelectorAll(".amFinp").forEach(function(inp){inp.addEventListener("input",calcAufPos);});
}
}

function calcAufPos(){
var fId=(el("amFormel")||{}).value||"rechteck";
var f=FORMELN[fId]; if(!f) return;
var vals=f.felder.map(function(_,i){var e=el("amF"+i);return e?parseFloat(e.value)||0:0;});
var brutto=f.calc(vals);
var abzug=parseFloat((el("amAbzug")||{}).value||0)||0;
var netto=Math.max(0,brutto-abzug);
var box=el("amErgebnis"); var m2el=el("amM2");
if(box) box.style.display=brutto>0?"block":"none";
if(m2el) m2el.textContent=netto.toFixed(3);
}

function oAufPos(id){
sv("amId",id||""); sv("amBez",""); sv("amAbzug","0"); sv("amImgData","");
var af=el("amFil"); if(af) af.value="";
var ap=el("amImgPrv"); if(ap) ap.src="";
var aw=el("amImgWrap"); if(aw) aw.style.display="none";
var ae=el("amErgebnis"); if(ae) ae.style.display="none";
var t=el("m-am-t"); if(t) t.textContent=id?"Position bearbeiten":"Neue Aufmassposition";
var psel=el("amProj");
if(psel){
psel.innerHTML="<option value=''>Kein Projekt</option>"+
DB.projekte().map(function(p){return "<option value='"+p.id+"'"+(p.id===curAmProjId?" selected":"")+">"+esc(p.name)+"</option>";}).join("");
}
var fsel=el("amFormel"); if(fsel) fsel.value="rechteck";
buildFormelInputs();
if(id){
var a=DB.aufmass().find(function(x){return x.id===id;});
if(a){
sv("amId",id); sv("amBez",a.bez||""); sv("amAbzug",a.abzug||0);
if(fsel) fsel.value=a.formel||"rechteck";
buildFormelInputs();
(a.formelWerte||[]).forEach(function(v,i){var e=el("amF"+i);if(e)e.value=v;});
if(psel) psel.value=a.projId||"";
if(a.img){sv("amImgData",a.img);if(ap)ap.src=a.img;if(aw)aw.style.display="block";}
calcAufPos();
}
}
mo("m-am");
setTimeout(function(){var f=el("amBez");if(f)f.focus();},300);
}

el("amFormel").onchange=function(){buildFormelInputs();calcAufPos();};
el("amAbzug").oninput=calcAufPos;
el("amFil").onchange=function(){
var f=this.files[0]; if(!f) return;
resizeImg(f,function(d){sv("amImgData",d);var p=el("amImgPrv");if(p)p.src=d;var w=el("amImgWrap");if(w)w.style.display="block";toast("Foto geladen");});
};
el("amImgRm").onclick=function(){
sv("amImgData","");var p=el("amImgPrv");if(p)p.src="";
var w=el("amImgWrap");if(w)w.style.display="none";
var f=el("amFil");if(f)f.value="";
};
el("amCan").onclick=function(){mc("m-am");};
el("amSav").onclick=function(){
var fId=(el("amFormel")||{}).value||"rechteck";
var f=FORMELN[fId]; if(!f){toast("Formel auswaehlen",true);return;}
var vals=f.felder.map(function(_,i){var e=el("amF"+i);return e?parseFloat(e.value)||0:0;});
var brutto=f.calc(vals);
if(brutto<=0){toast("Masse eingeben",true);return;}
var abzug=parseFloat((el("amAbzug")||{}).value||0)||0;
var netto=Math.max(0,brutto-abzug);
var detail=f.felder.map(function(lbl,i){return lbl+": "+vals[i];}).join(", ")+" = "+brutto.toFixed(3)+" m2";
var psel=el("amProj"); var projId=psel?psel.value:"";
var id=gv("amId")||uid();
var AM=DB.aufmass(); var idx=AM.findIndex(function(x){return x.id===id;});
var entry={id:id,bez:gv("amBez"),formel:fId,formelWerte:vals,formelDetail:detail,
m2brutto:brutto,abzug:abzug,m2netto:netto,projId:projId,img:gv("amImgData"),datum:Date.now()};
if(idx>=0) AM[idx]=entry; else AM.push(entry);
DB.sAM(AM); mc("m-am"); toast("Position gespeichert");
if(CS==="am") renderAufmass();
};
el("vobCl").onclick=function(){mc("m-vob");};

dlg("am","data-eam",function(id){oAufPos(id);});
dlg("am","data-dam",function(id){
if(confirm("Position loeschen?")){DB.sAM(DB.aufmass().filter(function(x){return x.id!==id;}));haptic("error"); toast("Geloescht");renderAufmass();}
});

// ============================================================
// ANGEBOTSMODUL v2 - Screenshot-konformes Design
// Einzelne scrollbare Seite, Action-Bar oben, Zahlungsbedingungen
// ============================================================

DB.ang2        = function(){ return this.g("mp_ang2"); };
DB.sAng2       = function(v){ this.s("mp_ang2",v); };
DB.vorlagen    = function(){ return this.g("mp_vorl"); };
DB.sVorlagen   = function(v){ this.s("mp_vorl",v); };

