// ======================
// PDF.JS - Boller Briefpapier
// Angebot & Rechnung
// ======================

const PDF = {

    // ====================== FIRMEN-DATEN ======================
    firma: {
        name: 'Boller – Oberflächen. Design. Handwerk.',
        inhaber: 'Benedikt Boller',
        strasse: 'Albachstraße 7a',
        ort: '54634 Bitburg',
        tel: '',       // z.B. '06561 123456'
        email: '',     // z.B. 'info@boller-handwerk.de'
        web: '',       // z.B. 'www.boller-handwerk.de'
        steuernr: '',  // z.B. 'St.-Nr. 27/123/45678'
        iban: '',      // z.B. 'DE12 3456 7890 1234 5678 90'
        bic: '',
        bank: '',
    },

    // ====================== LOGO SVG ======================
    logoSVG() {
        return `<svg stroke-miterlimit="10" style="fill-rule:nonzero;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;" version="1.1" viewBox="589.3 856.293 1245.89 251.977" xmlns="http://www.w3.org/2000/svg"><g><g><path d="M589.3 921.668L589.3 1061.74L671.635 1086.1L671.635 959.17Z" fill="#4a5d5e"></path><path d="M671.635 1011.82L724.566 974.225C727.193 972.359 730.183 971.064 733.342 970.423L733.472 970.397C736.325 969.818 739.264 969.801 742.123 970.346C745.732 971.035 749.116 972.6 751.977 974.904L767.553 987.446C768.043 987.841 768.517 988.255 768.974 988.687L786.983 1005.72C787.666 1006.37 788.31 1007.06 788.911 1007.78C789.512 1008.5 794.212 1014.15 794.212 1014.15C798.036 1018.74 799.565 1024.83 798.368 1030.68C798.071 1032.14 797.611 1033.55 796.997 1034.9C796.997 1034.9 786.983 1059.05 779.217 1073.95C771.451 1088.85 770.486 1089.53 762.587 1098.11C754.687 1106.69 747.619 1108.27 747.619 1108.27L671.635 1086.1" fill="#b36a4c"></path><path d="M593.254 860.171C591.037 860.289 589.3 862.121 589.3 864.34L589.3 919.04C589.3 920.646 590.221 922.11 591.669 922.805L671.635 961.161C671.635 961.161 683.294 966.226 694.056 969.953C704.817 973.68 723.705 959.677 739.833 948.372C755.961 937.067 762.82 931.08 762.82 931.08C762.82 931.08 775.303 922.42 770.864 913.479C766.425 904.537 765.674 905.091 755.961 894.1C746.248 883.109 744.346 882.288 735.948 877.374C727.55 872.459 715.349 865.057 701.382 859.965C687.416 854.872 661.25 856.562 661.25 856.562Z" fill="#b8c4bc"></path></g><g><path d="M879.21 1022.84L879.21 861.158L958.209 861.158C978.491 861.158 993.783 865.007 1004.08 872.705C1014.38 880.403 1019.53 890.597 1019.53 903.286C1019.53 911.726 1017.45 919.049 1013.28 925.254C1009.11 931.46 1003.38 936.27 996.107 939.687C988.831 943.104 980.505 944.812 971.129 944.812L975.471 935.266C985.682 935.266 994.695 936.944 1002.51 940.301C1010.32 943.657 1016.46 948.568 1020.9 955.033C1025.35 961.498 1027.57 969.381 1027.57 978.683C1027.57 992.602 1022.11 1003.44 1011.18 1011.2C1000.25 1018.96 984.134 1022.84 962.828 1022.84L879.21 1022.84ZM916.351 994.765L960.157 994.765C969.789 994.765 977.128 993.153 982.175 989.929C987.221 986.705 989.745 981.666 989.745 974.814C989.745 967.962 987.221 962.9 982.175 959.631C977.128 956.361 969.789 954.726 960.157 954.726L913.63 954.726L913.63 927.474L953.603 927.474C962.737 927.474 969.703 925.877 974.503 922.683C979.304 919.489 981.704 914.712 981.704 908.353C981.704 901.934 979.304 897.143 974.503 893.98C969.703 890.817 962.737 889.236 953.603 889.236L916.351 889.236Z" fill="#4a5d5e"></path><path d="M1135.64 1025.56C1122.91 1025.56 1111.14 1023.49 1100.33 1019.33C1089.52 1015.17 1080.15 1009.33 1072.22 1001.8C1064.29 994.267 1058.12 985.426 1053.72 975.272C1049.32 965.119 1047.11 954.014 1047.11 941.957C1047.11 929.9 1049.32 918.816 1053.72 908.705C1058.12 898.594 1064.29 889.76 1072.23 882.204C1080.17 874.648 1089.53 868.797 1100.31 864.653C1111.09 860.509 1122.84 858.436 1135.56 858.436C1148.34 858.436 1160.09 860.5 1170.82 864.628C1181.54 868.755 1190.86 874.582 1198.78 882.108C1206.7 889.634 1212.86 898.469 1217.27 908.613C1221.67 918.757 1223.87 929.876 1223.87 941.971C1223.87 954.067 1221.67 965.202 1217.27 975.379C1212.86 985.555 1206.7 994.4 1198.78 1001.91C1190.86 1009.43 1181.54 1015.25 1170.82 1019.37C1160.09 1023.5 1148.37 1025.56 1135.64 1025.56ZM1135.56 993.852C1142.78 993.852 1149.45 992.596 1155.56 990.084C1161.68 987.572 1167.01 984.01 1171.57 979.397C1176.13 974.785 1179.68 969.312 1182.23 962.978C1184.77 956.644 1186.04 949.637 1186.04 941.957C1186.04 934.279 1184.78 927.292 1182.24 920.994C1179.71 914.696 1176.16 909.239 1171.6 904.621C1167.03 900.004 1161.69 896.438 1155.58 893.922C1149.46 891.407 1142.79 890.149 1135.57 890.149C1128.35 890.149 1121.66 891.408 1115.52 893.926C1109.38 896.444 1104.02 900.014 1099.44 904.638C1094.86 909.261 1091.3 914.725 1088.76 921.03C1086.22 927.335 1084.94 934.309 1084.94 941.953C1084.94 949.6 1086.21 956.589 1088.75 962.922C1091.29 969.255 1094.85 974.744 1099.42 979.388C1103.99 984.033 1109.35 987.605 1115.5 990.104C1121.65 992.602 1128.34 993.852 1135.56 993.852Z" fill="#4a5d5e"></path><path d="M1253.5 1022.84L1253.5 861.158L1291.01 861.158L1291.01 992.282L1371.94 992.282L1371.94 1022.84Z" fill="#4a5d5e"></path><path d="M1394.49 1022.84L1394.49 861.158L1431.99 861.158L1431.99 992.282L1512.93 992.282L1512.93 1022.84Z" fill="#4a5d5e"></path><path d="M1535.48 1022.84L1535.48 861.158L1657.56 861.158L1657.56 891.261L1572.62 891.261L1572.62 992.74L1660.71 992.74L1660.71 1022.84ZM1569.89 955.321L1569.89 926.229L1647.81 926.229L1647.81 955.321Z" fill="#4a5d5e"></path><path d="M1691.91 1022.84L1691.91 861.158L1760.89 861.158C1783.45 861.158 1800.96 866.368 1813.43 876.79C1825.9 887.212 1832.14 901.537 1832.14 919.765C1832.14 931.774 1829.3 942.119 1823.62 950.803C1817.94 959.486 1809.85 966.145 1799.35 970.779C1788.85 975.413 1776.33 977.73 1761.8 977.73L1712.69 977.73L1729.41 961.457L1729.41 1022.84ZM1794.82 1022.84L1754.25 964.084L1794.3 964.084ZM1729.41 965.513L1712.69 947.905L1759.87 947.905C1771.32 947.905 1779.92 945.421 1785.68 940.454C1791.43 935.487 1794.31 928.59 1794.31 919.765C1794.31 910.848 1791.43 903.93 1785.68 899.009C1779.92 894.089 1771.32 891.629 1759.87 891.629L1712.69 891.629Z" fill="#4a5d5e"></path></g></g></svg>`;
    },

    // ====================== GEMEINSAMES CSS ======================
    baseCSS() {
        return `
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Georgia, 'Times New Roman', serif;
            color: #1a2e2f;
            background: #fff;
            font-size: 13px;
            line-height: 1.5;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            position: relative;
        }

        /* ---- HEADER ---- */
        .dh {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 22px 14px;
            border-bottom: 3px solid #4a5d5e;
        }
        .dl svg { height: 38px; width: auto; display: block; }
        .dr { text-align: right; }
        .dt {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #4a5d5e;
            text-transform: uppercase;
        }
        .dm {
            font-size: 11px;
            color: #5a7273;
            margin-top: 3px;
            line-height: 1.6;
        }

        /* ---- ADRESSEN ---- */
        .da {
            display: flex;
            justify-content: space-between;
            padding: 14px 22px 10px;
            gap: 20px;
            border-bottom: 1px solid #d4dede;
        }
        .dal {
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #8aa0a1;
            margin-bottom: 3px;
        }
        .dn { font-weight: 700; font-size: 13px; color: #1a2e2f; }
        .dd { font-size: 11.5px; color: #4a5d5e; }

        /* ---- HAUPTINHALT ---- */
        .db { padding: 18px 22px; flex: 1; }
        .dtb {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .dtb h2 { font-size: 16px; color: #1a2e2f; font-weight: 700; }
        .dtb span { font-size: 11px; color: #8aa0a1; font-style: italic; }
        .danschr {
            font-size: 12px;
            color: #3d5557;
            margin-bottom: 16px;
            line-height: 1.65;
            white-space: pre-line;
        }

        /* ---- POSITIONSTABELLE (EP-Stil) ---- */
        .pt {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 0;
        }
        .pt thead tr th {
            background: #4a5d5e;
            color: #fff;
            font-weight: 600;
            font-size: 10.5px;
            letter-spacing: 0.04em;
            padding: 7px 9px;
            text-align: left;
        }
        .pt thead tr th.r { text-align: right; }
        .pt tbody tr.pe td,
        .pt tbody tr.po td {
            padding: 6px 9px;
            border-bottom: 1px solid #e8eded;
            vertical-align: top;
        }
        .pt tbody tr.po { background: #f7fafa; }
        .pt tbody tr.gh td {
            background: #b36a4c;
            color: #fff;
            font-weight: 700;
            font-size: 11.5px;
            padding: 6px 9px;
            letter-spacing: 0.03em;
        }
        .pnr { color: #8aa0a1; font-size: 11px; }
        .pnm { color: #1a2e2f; }
        .psub {
            display: block;
            font-size: 9.5px;
            color: #8aa0a1;
            margin-top: 1px;
        }
        .pgp { color: #1a2e2f; font-weight: 600; }

        /* ---- PAUSCHAL-BLÖCKE (Heck-Stil) ---- */
        .raum-block { margin-bottom: 14px; }
        .raum-header {
            background: #4a5d5e;
            color: #fff;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 14px;
            border-radius: 4px 4px 0 0;
        }
        .raum-body {
            border: 1px solid #c8d8d8;
            border-top: none;
            padding: 10px 14px 0;
            border-radius: 0 0 4px 4px;
        }
        .raum-body ul { padding-left: 16px; margin: 0 0 10px; }
        .raum-body ul li {
            font-size: 12px;
            color: #2a4142;
            margin-bottom: 3px;
            list-style: none;
        }
        .raum-body ul li::before {
            content: '\2013\00a0';
            color: #4a5d5e;
        }
        .pausch {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #eaf1f1;
            border-top: 1px solid #c8d8d8;
            padding: 7px 14px;
            font-weight: 700;
            font-size: 13px;
            color: #1a2e2f;
        }

        /* ---- SUMMEN ---- */
        .sb {
            min-width: 220px;
            margin-top: 12px;
            border-top: 2px solid #4a5d5e;
            padding-top: 8px;
        }
        .sr {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 3px 0;
            color: #3d5557;
        }
        .sr.mw { color: #8aa0a1; font-size: 11px; }
        .sr.tot {
            font-weight: 700;
            font-size: 14px;
            color: #1a2e2f;
            border-top: 1px solid #c8d8d8;
            margin-top: 4px;
            padding-top: 6px;
        }
        .summen-wrap {
            display: flex;
            justify-content: flex-end;
        }

        /* ---- HINWEISE / KONDITIONEN ---- */
        .ku-hw {
            font-size: 10.5px;
            color: #8aa0a1;
            margin-top: 10px;
            font-style: italic;
        }
        .kond {
            font-size: 11px;
            color: #3d5557;
            margin-top: 6px;
        }

        /* ---- SCHLUSSTEXT / UNTERSCHRIFT ---- */
        .schluss {
            font-size: 12px;
            color: #2a4142;
            margin-top: 18px;
            line-height: 1.7;
            white-space: pre-line;
        }
        .sig {
            display: flex;
            justify-content: space-between;
            margin-top: 28px;
            gap: 30px;
        }
        .sig > div { flex: 1; }
        .sigl {
            border-top: 1px solid #4a5d5e;
            font-size: 10px;
            color: #8aa0a1;
            padding-top: 4px;
        }

        /* ---- FUSSZEILE ---- */
        .stripe {
            height: 4px;
            background: linear-gradient(90deg, #4a5d5e 0%, #b36a4c 60%, #b8c4bc 100%);
            margin-top: auto;
        }
        .df {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 22px;
            font-size: 10px;
            color: #8aa0a1;
            border-top: 1px solid #e0e8e8;
            background: #f7fafa;
        }
        .df .fl svg { height: 18px; width: auto; opacity: 0.35; }

        @media print {
            body { margin: 0; }
            .page { width: 100%; }
        }
        `;
    },

    // ====================== HILFSFUNKTIONEN ======================
    fmt(n) {
        if (n === undefined || n === null) return '0,00';
        const num = typeof n === 'string' ? parseFloat(n.replace(',', '.')) : n;
        return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    heute() {
        return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    datumPlus(tage) {
        const d = new Date();
        d.setDate(d.getDate() + tage);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    // ====================== BRIEFKOPF ======================
    renderHeader(titel, meta) {
        const f = this.firma;
        return `
        <div class="dh">
            <div class="dl">${this.logoSVG()}</div>
            <div class="dr">
                <div class="dt">${titel}</div>
                <div class="dm">${meta}</div>
            </div>
        </div>
        <div class="da">
            <div class="dfr">
                <div class="dal">Auftragnehmer</div>
                <div class="dn">${f.inhaber}</div>
                <div class="dd">${f.strasse ? f.strasse + ', ' + f.ort : f.ort}${f.tel ? '<br>' + f.tel : ''}${f.email ? '<br>' + f.email : ''}</div>
            </div>
        </div>`;
    },

    // ====================== FUSSZEILE ======================
    renderFooter(nummer) {
        const f = this.firma;
        const teile = [f.name];
        if (f.steuernr) teile.push(f.steuernr);
        if (f.iban) teile.push('IBAN: ' + f.iban);
        if (f.bic) teile.push('BIC: ' + f.bic);
        return `
        <div class="stripe"></div>
        <div class="df">
            <span>${teile.join(' &nbsp;|&nbsp; ')}</span>
            <span>${nummer}</span>
            <div class="fl">${this.logoSVG()}</div>
        </div>`;
    },

    // ====================== RAUM-BLÖCKE (Pauschalpreis) ======================
    renderRaumBloecke(raeume) {
        return raeume.map(r => `
            <div class="raum-block">
                <div class="raum-header">${r.name || r.titel || 'Position'}</div>
                <div class="raum-body">
                    <ul>
                        ${(r.leistungen || []).map(l => `<li>${l}</li>`).join('')}
                    </ul>
                    <div class="pausch">
                        <span>Pauschalpreis</span>
                        <span>${this.fmt(r.preis)} €</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ====================== ANGEBOT (Pauschalpreis-Stil) ======================
    createAngebot(data) {
        const f = this.firma;
        const num = data.nummer || ('A-' + new Date().getFullYear() + '-001');
        const datum = data.datum || this.heute();
        const gueltig = data.gueltigBis || this.datumPlus(30);

        // Gesamtpreis berechnen falls nicht übergeben
        let gesamt = data.gesamtpreis;
        if (!gesamt && data.positionen) {
            const sum = data.positionen.reduce((acc, p) => {
                const v = typeof p.preis === 'string' ? parseFloat(p.preis.replace(',', '.')) : (p.preis || 0);
                return acc + v;
            }, 0);
            gesamt = sum;
        }

        const mwstText = data.kleinunternehmer !== false
            ? 'Gem. §19 UStG wird keine Umsatzsteuer berechnet.'
            : '';
        const mwstBetrag = data.kleinunternehmer !== false ? '0,00' : this.fmt((gesamt || 0) * 0.19);

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Angebot ${num}</title>
<style>${this.baseCSS()}</style>
</head>
<body>
<div class="page">

${this.renderHeader('Angebot', `<strong>Nr.:</strong> ${num}<br><strong>Datum:</strong> ${datum}<br><strong>Gültig bis:</strong> ${gueltig}`)}

<div class="da" style="border-top:none;">
    <div class="dto">
        <div class="dal">Auftraggeber</div>
        <div class="dn">${data.kunde || ''}</div>
        <div class="dd">${data.adresse || ''}</div>
    </div>
    ${data.objekt ? `<div style="text-align:right;"><div class="dal">Objekt / Baustelle</div><div class="dd">${data.objekt}</div></div>` : ''}
</div>

<div class="db">
    <div class="dtb">
        <h2>Angebot – ${data.kunde || ''}</h2>
        <span>${num}</span>
    </div>

    <div class="danschr">${data.anschreiben || `Sehr geehrte Damen und Herren,

vielen Dank für Ihr Vertrauen und die Möglichkeit, Ihnen unser Angebot unterbreiten zu dürfen.

Wir führen die genannten Arbeiten fachgerecht, termingerecht und mit hochwertigen Materialien aus. Dabei legen wir besonderen Wert auf saubere Ausführung und einen reibungslosen Ablauf auf Ihrer Baustelle.

Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.`}</div>

    ${this.renderRaumBloecke(data.positionen || [])}

    <div class="summen-wrap">
        <div class="sb">
            <div class="sr"><span>Nettobetrag</span><span>${this.fmt(gesamt)} EUR</span></div>
            ${data.kleinunternehmer !== false
                ? `<div class="sr mw"><span>MwSt. gem. §19 UStG</span><span>0,00 EUR</span></div>`
                : `<div class="sr"><span>MwSt. 19 %</span><span>${mwstBetrag} EUR</span></div>`
            }
            <div class="sr tot">
                <span>Gesamtbetrag</span>
                <span>${this.fmt(data.kleinunternehmer !== false ? gesamt : (gesamt || 0) * 1.19)} EUR</span>
            </div>
        </div>
    </div>

    ${mwstText ? `<div class="ku-hw">${mwstText}</div>` : ''}
    <div class="kond"><strong>Gültig bis:</strong> ${gueltig}</div>

    <div class="schluss">${data.schlusstext || `Wir freuen uns auf eine gute Zusammenarbeit und stehen für Rückfragen jederzeit zur Verfügung.

Mit freundlichen Grüßen

${f.inhaber}
${f.name}`}</div>

    <div class="sig">
        <div>
            <div style="height:50px"></div>
            <div class="sigl">Ort, Datum &nbsp;·&nbsp; ${f.inhaber}</div>
        </div>
        <div>
            <div style="height:50px"></div>
            <div class="sigl">Ort, Datum &nbsp;·&nbsp; ${data.kunde || 'Auftraggeber'}</div>
        </div>
    </div>
</div>

${this.renderFooter(num)}
</div>
</body>
</html>`;

        this.openInNewWindow(html, `Angebot_${num}`);
    },

    // ====================== RECHNUNG ======================
    createRechnung(data) {
        const f = this.firma;
        const num = data.nummer || ('R-' + new Date().getFullYear() + '-001');
        const datum = data.datum || this.heute();
        const faellig = data.faelligAm || this.datumPlus(14);

        let gesamt = data.gesamtpreis;
        if (!gesamt && data.positionen) {
            const sum = data.positionen.reduce((acc, p) => {
                const v = typeof p.preis === 'string' ? parseFloat(p.preis.replace(',', '.')) : (p.preis || 0);
                return acc + v;
            }, 0);
            gesamt = sum;
        }

        const mwstText = data.kleinunternehmer !== false
            ? 'Gem. §19 UStG wird keine Umsatzsteuer berechnet.'
            : '';

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Rechnung ${num}</title>
<style>${this.baseCSS()}</style>
</head>
<body>
<div class="page">

${this.renderHeader('Rechnung', `<strong>Nr.:</strong> ${num}<br><strong>Datum:</strong> ${datum}<br><strong>Fällig bis:</strong> ${faellig}`)}

<div class="da" style="border-top:none;">
    <div class="dto">
        <div class="dal">Rechnungsempfänger</div>
        <div class="dn">${data.kunde || ''}</div>
        <div class="dd">${data.adresse || ''}</div>
    </div>
    ${data.objekt ? `<div style="text-align:right;"><div class="dal">Objekt / Baustelle</div><div class="dd">${data.objekt}</div></div>` : ''}
    ${data.angebotsnummer ? `<div style="text-align:right;"><div class="dal">Bezug Angebot</div><div class="dd">${data.angebotsnummer}</div></div>` : ''}
</div>

<div class="db">
    <div class="dtb">
        <h2>Rechnung – ${data.kunde || ''}</h2>
        <span>${num}</span>
    </div>

    <div class="danschr">${data.anschreiben || `Sehr geehrte Damen und Herren,

für die erbrachten Leistungen erlauben wir uns, folgende Rechnung zu stellen.

Wir bitten um Begleichung des Betrages innerhalb von 14 Tagen nach Rechnungserhalt.

Vielen Dank für Ihr Vertrauen.`}</div>

    ${this.renderRaumBloecke(data.positionen || [])}

    <div class="summen-wrap">
        <div class="sb">
            <div class="sr"><span>Nettobetrag</span><span>${this.fmt(gesamt)} EUR</span></div>
            ${data.kleinunternehmer !== false
                ? `<div class="sr mw"><span>MwSt. gem. §19 UStG</span><span>0,00 EUR</span></div>`
                : `<div class="sr"><span>MwSt. 19 %</span><span>${this.fmt((gesamt || 0) * 0.19)} EUR</span></div>`
            }
            <div class="sr tot">
                <span>Rechnungsbetrag</span>
                <span>${this.fmt(data.kleinunternehmer !== false ? gesamt : (gesamt || 0) * 1.19)} EUR</span>
            </div>
        </div>
    </div>

    ${mwstText ? `<div class="ku-hw">${mwstText}</div>` : ''}

    ${f.iban ? `<div class="kond" style="margin-top:10px;">
        <strong>Bankverbindung:</strong> ${f.bank ? f.bank + ' &nbsp;|&nbsp; ' : ''}IBAN: ${f.iban}${f.bic ? ' &nbsp;|&nbsp; BIC: ' + f.bic : ''}
    </div>` : ''}

    <div class="kond"><strong>Zahlungsziel:</strong> ${faellig} (14 Tage netto)</div>

    <div class="schluss">${data.schlusstext || `Wir danken für Ihren Auftrag und freuen uns auf eine weitere Zusammenarbeit.

Mit freundlichen Grüßen

${f.inhaber}
${f.name}`}</div>
</div>

${this.renderFooter(num)}
</div>
</body>
</html>`;

        this.openInNewWindow(html, `Rechnung_${num}`);
    },

    // ====================== FENSTER ÖFFNEN (WKWebView-kompatibel) ======================
    openInNewWindow(html, title = 'Dokument') {
        const win = window.open('', '_blank');
        if (!win) {
            console.warn('Popup blockiert – bitte Popups erlauben.');
            return;
        }
        win.document.write(html);
        win.document.close();
        setTimeout(() => {
            win.focus();
            // win.print(); // ← aktivieren wenn Druckdialog automatisch starten soll
        }, 600);
    }
};

window.PDF = PDF;
console.log('%c✅ PDF-Modul (Boller) geladen', 'color:#4a5d5e');
