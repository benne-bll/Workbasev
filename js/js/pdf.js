// ======================
// PDF.JS - Professionelle Dokumente
// ======================

const PDF = {
    settings() {
        return DB.settings() || { firma: "Deine Firma", inhaber: "Max Mustermann", adr: "", tel: "", mail: "", ust: "" };
    },

    // ==================== ANGEBOT ====================
    angPDF(angebot) {
        if (!angebot) return alert("Kein Angebot gefunden");

        const s = this.settings();
        const sum = this.berechneSumme(angebot.positionen || []);

        let html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>Angebot ${angebot.nummer || ''}</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 40px; line-height: 1.5; color: #1e3a5f; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .logo { font-size: 28px; font-weight: bold; color: #1e3a5f; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #1e3a5f; color: white; }
                .sum { font-weight: bold; font-size: 1.1em; }
                .tot { background: #1e3a5f; color: white; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo">${s.firma || 'Workbase'}</div>
                    <div>${s.inhaber}<br>${s.adr}<br>${s.tel} • ${s.mail}</div>
                </div>
                <div style="text-align:right">
                    <h2>Angebot</h2>
                    Nr. ${angebot.nummer || 'AN-' + Date.now()}<br>
                    Datum: ${new Date().toLocaleDateString('de-DE')}
                </div>
            </div>

            <h3>${angebot.kundeName || 'Kunde'}</h3>
            <p>${angebot.objekt || 'Objekt'}</p>

            <table>
                <thead>
                    <tr><th>Pos.</th><th>Leistung</th><th>Menge</th><th>EP €</th><th>Gesamt €</th></tr>
                </thead>
                <tbody>
                    ${(angebot.positionen || []).map((p,i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td>${p.name}</td>
                            <td>${p.menge} ${p.einh || 'Stk'}</td>
                            <td>${parseFloat(p.ep||0).toFixed(2)}</td>
                            <td>${(p.menge * p.ep).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align:right; margin-top:30px;">
                <div class="sum">Netto: ${sum.netto.toFixed(2)} €</div>
                <div class="sum">MwSt. 19%: ${sum.mwst.toFixed(2)} €</div>
                <div class="sum tot">Brutto: ${sum.brutto.toFixed(2)} €</div>
            </div>

            <p style="margin-top:50px;">Vielen Dank für Ihr Vertrauen!</p>
        </body>
        </html>`;

        this.openPDF(html, `Angebot_${angebot.nummer || ''}`);
    },

    // ==================== RECHNUNG ====================
    rechPDF(rechnung) {
        // Ähnliche Funktion wie oben, nur mit Rechnungs-Layout
        alert("Rechnungs-PDF wird vorbereitet...");
        // Hier später die volle Rechnungs-Vorlage
    },

    berechneSumme(positionen) {
        let netto = 0;
        positionen.forEach(p => netto += (p.menge || 0) * (p.ep || 0));
        const mwst = netto * 0.19;
        return { netto, mwst, brutto: netto + mwst };
    },

    openPDF(html, title = "Dokument") {
        const win = window.open("", "_blank");
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }
};

// Export
window.PDF = PDF;
console.log("%cPDF-Modul geladen", "color:#38bdf8");