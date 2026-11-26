/* Mon école — Bénin : module « Zone déshéritée » (agents des postes orange et rouge, prime de zone, liste par école). Noyau : zone-core.js.
   Données sur l'appareil : AppBridge.data.zoneData = [{ id:'zone', agents:[…], baremes:{…} }]. Conception : Maître Aimé FACHOLA */
(function (global) {
  'use strict';
  if (global.ZoneMonEcole) return;
  const A = () => global.AppBridge, $ = id => document.getElementById(id);
  const D = () => { const d = A().data; if (!Array.isArray(d.zoneData)) d.zoneData = []; return d; };
  const adaptateur = () => ({
    charger: async () => D().zoneData[0] || null,
    enregistrer: async (e) => { D().zoneData = [Object.assign({ id: 'zone' }, e)]; A().saveData(); },
    ecoles: () => (A().data.ecoles || []).map(e => e.nom).filter(Boolean),
    ecoleFixe: () => { const e = A().ecoleDuPoste && A().ecoleDuPoste(); return e && global.Config && global.Config.estEcole() ? e.nom : ''; },
    annee: () => A().anneeActive ? A().anneeActive() : '',
    uid: () => A().uid(),
    entete: () => '<div style="text-align:center;font:bold 12px Arial">RÉPUBLIQUE DU BÉNIN<br>MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE</div>',
    xlsxEcrire: async (f) => global.XlsxEcrire.classeur(f),
    xlsxLire: async (fichier) => { const l = await global.Tableur.lire(fichier); return l; },
    telecharger: async (nom, blob) => A().telecharger(nom, blob, blob.type),
    imprimer: (titre, corps) => {
      const w = global.open('', '_blank'); if (!w) { alert('Autorisez l’ouverture de fenêtres pour imprimer.'); return; }
      w.document.write('<!doctype html><meta charset="utf-8"><title>' + titre + '</title><style>@page{size:A4 landscape;margin:10mm}body{font:12px Arial,sans-serif;margin:10px}</style>' + corps);
      w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
    }
  });
  function installer() {
    if (!A() || !global.ZoneDesheritee || !$('dashboard')) return;
    if (global.Config && global.Config.estEcole() && !(A().ecoleDuPoste && A().ecoleDuPoste())) return;
    if (!$('zone')) { const p = document.createElement('div'); p.id = 'zone'; p.className = 'page hidden'; $('dashboard').parentNode.appendChild(p); }
    if (!document.querySelector('.menu-item[data-page="zone"]')) {
      const ref = document.querySelector('.menu-item[data-page="docsref"]') || document.querySelector('.menu-item[data-page="dashboard"]'), m = document.createElement('div');
      m.className = 'menu-item'; m.dataset.page = 'zone'; m.setAttribute('role', 'button'); m.tabIndex = 0; m.innerHTML = '<span class="icon">\u{1F4CD}</span> Zone déshéritée'; m.onclick = () => global.showPage('zone', m);
      ref.parentNode.insertBefore(m, ref.nextSibling);
    }
    const fn = global.showPage;
    if (!fn.__zone) {
      const w = function (id, el, r) {
        if (id === 'zone') { const p = $('zone'); p.innerHTML = '<h2>Zone déshéritée</h2><p class="aide">Agents des postes orange et rouge : prime de zone, rendement / gratification, banque — liste par école avec le nombre d’ayants droit.</p><div id="zone-corps"></div>'; global.ZoneDesheritee.monter($('zone-corps'), adaptateur()); }
        return fn.call(this, id, el, r);
      };
      w.__zone = true; global.showPage = w;
    }
  }
  global.ZoneMonEcole = { installer };
  setInterval(installer, 1500);
})(window);
