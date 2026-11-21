/* Mon école — Bénin : espace du BUREAU DE L'APE (Association des Parents d'Élèves), du primaire au secondaire.
   Trois niveaux : bureau de l'école, union communale, union départementale. Membres et postes, réunions avec procès-verbal,
   caisse (cotisations, recettes, dépenses, solde) et rapport imprimable. Données sur l'appareil (AppBridge.data : apeBureaux, apeMembres, apeReunions, apeCaisse).
   Conception : Maître Aimé FACHOLA */
(function (global) {
  'use strict';
  if (global.Ape) return;
  const A = () => global.AppBridge, $ = id => document.getElementById(id), esc = s => A().echapper(s);
  const NIVEAUX = [['ecole', 'Bureau de l’école'], ['commune', 'Union communale des APE'], ['departement', 'Union départementale des APE']];
  const POSTES = ['Président(e)', 'Vice-président(e)', 'Secrétaire général(e)', 'Secrétaire adjoint(e)', 'Trésorier(ère)', 'Trésorier(ère) adjoint(e)', 'Commissaire aux comptes', 'Conseiller(ère)', 'Membre'];
  const CATS_REC = ['Cotisation', 'Don', 'Subvention', 'Activité', 'Autre'];
  const CATS_DEP = ['Entretien / réparations', 'Achat de fournitures', 'Prime / motivation', 'Construction', 'Frais de réunion', 'Autre'];
  const etat = { onglet: 'bureau', niveau: 'ecole' };
  const D = () => { const d = A().data; ['apeBureaux', 'apeMembres', 'apeReunions', 'apeCaisse'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; }); return d; };
  const ec = () => A().ecoleDuPoste() || {};
  const entite = n => n === 'ecole' ? (ec().nom || 'École') : n === 'commune' ? (ec().commune || 'Commune') : (ec().departement || 'Département');
  const cle = n => n + '|' + entite(n);
  const bureau = n => D().apeBureaux.find(b => b.cle === cle(n));
  const membres = n => bureau(n) ? D().apeMembres.filter(m => m.bureauId === bureau(n).id) : [];
  const caisse = n => bureau(n) ? D().apeCaisse.filter(c => c.bureauId === bureau(n).id).sort((a, b) => String(a.date).localeCompare(b.date)) : [];
  const reunions = n => bureau(n) ? D().apeReunions.filter(r => r.bureauId === bureau(n).id).sort((a, b) => String(b.date).localeCompare(a.date)) : [];
  const fcfa = v => (Math.round(v) || 0).toLocaleString('fr-FR') + ' FCFA';
  const nombre = v => { const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const sel = (n, o, v) => '<select data-f="' + n + '">' + o.map(x => { const a = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(a) + '"' + (a === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
  const ONGLETS = [['bureau', 'Bureau'], ['reunions', 'Réunions et PV'], ['caisse', 'Caisse'], ['rapport', 'Rapport']];
  const sec = () => /^(SEC|TECH)/.test(ec().type || '');

  function vue() {
    const p = $('ape'); if (!p) return;
    const b = bureau(etat.niveau);
    p.innerHTML = '<div class="page-title">Bureau de l’APE</div>'
      + '<div class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label>Niveau ' + sel('niveau', NIVEAUX, etat.niveau) + '</label><div><b>' + esc(entite(etat.niveau)) + '</b>'
      + (b ? '<br><small>Mandat : ' + esc(b.debut || '…') + ' → ' + esc(b.fin || '…') + (b.cycle ? ' · ' + esc(b.cycle) : '') + '</small>' : '<br><small>Aucun bureau enregistré à ce niveau.</small>') + '</div></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">' + ONGLETS.map(o => '<button class="btn ' + (o[0] === etat.onglet ? 'btn-primary' : '') + '" data-onglet="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>'
      + '<div id="apeCorps">' + (b || etat.onglet === 'bureau' ? ({ bureau: vBureau, reunions: vReunions, caisse: vCaisse, rapport: vRapport }[etat.onglet])() : '<p class="aide">Créez d’abord le bureau (onglet Bureau).</p>') + '</div>';
  }
  function vBureau() {
    const b = bureau(etat.niveau), m = membres(etat.niveau);
    let h = '<div class="card"><h3>' + (b ? 'Mandat du bureau' : 'Créer le bureau') + '</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">'
      + '<label>Début du mandat <input type="date" data-f="bDebut" value="' + esc(b ? b.debut : '') + '"></label><label>Fin du mandat <input type="date" data-f="bFin" value="' + esc(b ? b.fin : '') + '"></label>'
      + (etat.niveau === 'ecole' && sec() ? '' : '<label>Cycle ' + sel('bCycle', ['Primaire', 'Secondaire', 'Primaire et secondaire'], b ? b.cycle : (sec() ? 'Secondaire' : 'Primaire')) + '</label>')
      + '<button class="btn btn-primary" data-act="saveBureau">' + (b ? 'Enregistrer' : 'Créer le bureau') + '</button></div></div>';
    if (!b) return h;
    h += '<div class="card"><h3>Ajouter un membre</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end"><label>Nom et prénoms <input data-f="mNom" style="width:14em"></label><label>Poste ' + sel('mPoste', POSTES, 'Membre') + '</label><label>Téléphone <input data-f="mTel" style="width:9em" inputmode="tel"></label><label>Profession <input data-f="mProf" style="width:9em"></label><button class="btn btn-primary" data-act="addMembre">Ajouter</button></div></div>';
    return h + '<div class="card"><h3>' + m.length + ' membre(s)</h3>' + (m.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>Poste</th><th>Nom</th><th>Téléphone</th><th>Profession</th><th></th></tr></thead><tbody>'
      + m.slice().sort((a, c) => POSTES.indexOf(a.poste) - POSTES.indexOf(c.poste)).map(x => '<tr><td>' + esc(x.poste) + '</td><td>' + esc(x.nom) + '</td><td>' + esc(x.tel || '') + '</td><td>' + esc(x.profession || '') + '</td><td><button class="btn btn-sm btn-danger" data-act="delMembre" data-id="' + x.id + '">Supprimer</button></td></tr>').join('') + '</tbody></table></div>' : '') + '</div>';
  }
  function vReunions() {
    const l = reunions(etat.niveau);
    return '<div class="card"><h3>Nouvelle réunion</h3><div style="display:flex;flex-wrap:wrap;gap:8px"><label>Date <input type="date" data-f="rDate"></label><label>Lieu <input data-f="rLieu" style="width:10em"></label><label>Participants (nombre) <input type="number" min="0" data-f="rNb" style="width:6em"></label></div>'
      + '<label style="display:block;margin-top:6px">Ordre du jour<textarea data-f="rOdj" rows="3" style="width:100%"></textarea></label><label style="display:block">Décisions et résolutions<textarea data-f="rDec" rows="4" style="width:100%"></textarea></label>'
      + '<button class="btn btn-primary" data-act="addReunion">Enregistrer le procès-verbal</button></div>'
      + '<div class="card"><h3>' + l.length + ' réunion(s)</h3>' + l.map(r => '<div style="border-top:1px solid #ddd;padding:8px 0"><b>' + esc(r.date) + '</b> — ' + esc(r.lieu || '') + ' — ' + esc(r.nb || 0) + ' participant(s)<br><small><b>Ordre du jour :</b> ' + esc(r.odj || '') + '</small><br><small><b>Décisions :</b> ' + esc(r.dec || '') + '</small><br>'
        + '<button class="btn btn-sm" data-act="imprPV" data-id="' + r.id + '">Imprimer le PV</button> <button class="btn btn-sm btn-danger" data-act="delReunion" data-id="' + r.id + '">Supprimer</button></div>').join('') + '</div>';
  }
  const totaux = n => { const c = caisse(n); const rec = c.filter(x => x.type === 'recette').reduce((s, x) => s + x.montant, 0), dep = c.filter(x => x.type === 'depense').reduce((s, x) => s + x.montant, 0); return { rec, dep, solde: rec - dep }; };
  function vCaisse() {
    const c = caisse(etat.niveau), t = totaux(etat.niveau);
    return '<div class="card"><h3>Nouvelle opération</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end"><label>Date <input type="date" data-f="cDate"></label><label>Type ' + sel('cType', [['recette', 'Recette'], ['depense', 'Dépense']], 'recette') + '</label>'
      + '<label>Catégorie <select data-f="cCat">' + CATS_REC.concat(CATS_DEP).filter((x, i, a) => a.indexOf(x) === i).map(x => '<option>' + esc(x) + '</option>').join('') + '</select></label>'
      + '<label>Libellé <input data-f="cLib" style="width:14em"></label><label>Montant (FCFA) <input data-f="cMt" inputmode="numeric" style="width:8em"></label><button class="btn btn-primary" data-act="addCaisse">Ajouter</button></div></div>'
      + '<div class="card"><h3>Solde : ' + fcfa(t.solde) + '</h3><p class="aide">Recettes ' + fcfa(t.rec) + ' · Dépenses ' + fcfa(t.dep) + '</p>' + (c.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Montant</th><th></th></tr></thead><tbody>'
        + c.map(x => '<tr><td>' + esc(x.date) + '</td><td>' + (x.type === 'recette' ? 'Recette' : 'Dépense') + '</td><td>' + esc(x.cat) + '</td><td>' + esc(x.lib) + '</td><td style="text-align:right">' + fcfa(x.montant) + '</td><td><button class="btn btn-sm btn-danger" data-act="delCaisse" data-id="' + x.id + '">Supprimer</button></td></tr>').join('') + '</tbody></table></div>' : '') + '</div>';
  }
  function corpsRapport() {
    const b = bureau(etat.niveau), m = membres(etat.niveau), t = totaux(etat.niveau), r = reunions(etat.niveau), c = caisse(etat.niveau);
    return '<h2>Rapport d’activités et situation financière — ' + esc(NIVEAUX.find(x => x[0] === etat.niveau)[1]) + ' : ' + esc(entite(etat.niveau)) + '</h2><p>Mandat : ' + esc(b.debut || '…') + ' → ' + esc(b.fin || '…') + '</p>'
      + '<h3>Membres du bureau</h3><table><tr><th>Poste</th><th>Nom</th><th>Téléphone</th></tr>' + m.map(x => '<tr><td>' + esc(x.poste) + '</td><td>' + esc(x.nom) + '</td><td>' + esc(x.tel || '') + '</td></tr>').join('') + '</table>'
      + '<h3>Réunions tenues : ' + r.length + '</h3><table><tr><th>Date</th><th>Décisions</th></tr>' + r.map(x => '<tr><td>' + esc(x.date) + '</td><td>' + esc(x.dec || '') + '</td></tr>').join('') + '</table>'
      + '<h3>Situation de la caisse</h3><table><tr><th>Date</th><th>Libellé</th><th>Recette</th><th>Dépense</th></tr>' + c.map(x => '<tr><td>' + esc(x.date) + '</td><td>' + esc(x.cat + ' — ' + x.lib) + '</td><td>' + (x.type === 'recette' ? fcfa(x.montant) : '') + '</td><td>' + (x.type === 'depense' ? fcfa(x.montant) : '') + '</td></tr>').join('')
      + '<tr><th colspan="2">Totaux</th><th>' + fcfa(t.rec) + '</th><th>' + fcfa(t.dep) + '</th></tr></table><p><b>Solde en caisse : ' + fcfa(t.solde) + '</b></p><p>Le Président : ____________________ &nbsp; Le Trésorier : ____________________ &nbsp; Le Commissaire aux comptes : ____________________</p>';
  }
  const vRapport = () => '<div class="card"><p>Rapport imprimable : membres, réunions, caisse et solde.</p><button class="btn btn-primary" data-act="imprRapport">Imprimer le rapport</button></div>';
  function imprimer(corps) {
    const w = global.open('', '_blank'); if (!w) { alert('Autorisez l’ouverture de fenêtres pour imprimer.'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>APE</title><style>body{font:13px Arial,sans-serif;margin:18px}h1{font-size:16px;text-align:center}h2{font-size:15px;text-align:center}h3{font-size:13px;margin:12px 0 4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:3px 5px;text-align:left}.pied{font-size:10px;color:#555;text-align:center;margin-top:14px}</style><h1>RÉPUBLIQUE DU BÉNIN</h1>' + corps + '<div class="pied">Mon école — Bénin</div>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  }
  const champ = n => { const e = document.querySelector('#ape [data-f="' + n + '"]'); return e ? e.value.trim() : ''; };
  function agir(act, id) {
    const d = D(), uid = A().uid, b = bureau(etat.niveau);
    if (act === 'saveBureau') { if (b) { b.debut = champ('bDebut'); b.fin = champ('bFin'); if (champ('bCycle')) b.cycle = champ('bCycle'); } else d.apeBureaux.push({ id: uid(), cle: cle(etat.niveau), niveau: etat.niveau, entite: entite(etat.niveau), debut: champ('bDebut'), fin: champ('bFin'), cycle: champ('bCycle') || (sec() ? 'Secondaire' : 'Primaire') }); }
    else if (act === 'addMembre') { if (!champ('mNom')) { alert('Le nom est obligatoire.'); return; } d.apeMembres.push({ id: uid(), bureauId: b.id, nom: champ('mNom'), poste: champ('mPoste'), tel: champ('mTel'), profession: champ('mProf') }); }
    else if (act === 'delMembre') d.apeMembres = d.apeMembres.filter(x => x.id !== id);
    else if (act === 'addReunion') { if (!champ('rDate')) { alert('La date est obligatoire.'); return; } d.apeReunions.push({ id: uid(), bureauId: b.id, date: champ('rDate'), lieu: champ('rLieu'), nb: nombre(champ('rNb')), odj: champ('rOdj'), dec: champ('rDec') }); }
    else if (act === 'delReunion') d.apeReunions = d.apeReunions.filter(x => x.id !== id);
    else if (act === 'imprPV') { const r = d.apeReunions.find(x => x.id === id); imprimer('<h2>Procès-verbal de réunion — ' + esc(entite(etat.niveau)) + '</h2><p>Date : ' + esc(r.date) + ' · Lieu : ' + esc(r.lieu || '') + ' · Participants : ' + esc(r.nb || 0) + '</p><h3>Ordre du jour</h3><p>' + esc(r.odj || '').replace(/\n/g, '<br>') + '</p><h3>Décisions et résolutions</h3><p>' + esc(r.dec || '').replace(/\n/g, '<br>') + '</p><p>Le Président : ____________________ &nbsp; Le Secrétaire : ____________________</p>'); return; }
    else if (act === 'addCaisse') { const mt = nombre(champ('cMt')); if (!champ('cDate') || mt <= 0) { alert('Indiquez la date et un montant positif.'); return; } d.apeCaisse.push({ id: uid(), bureauId: b.id, date: champ('cDate'), type: champ('cType'), cat: champ('cCat'), lib: champ('cLib'), montant: mt }); }
    else if (act === 'delCaisse') d.apeCaisse = d.apeCaisse.filter(x => x.id !== id);
    else if (act === 'imprRapport') { imprimer(corpsRapport()); return; }
    A().saveData(); vue();
  }
  function installer() {
    if (!A() || !$('dashboard') || !A().ecoleDuPoste || !A().ecoleDuPoste()) return;
    if (!$('ape')) {
      const p = document.createElement('div'); p.id = 'ape'; p.className = 'page hidden'; $('dashboard').parentNode.appendChild(p);
      p.addEventListener('click', e => { const o = e.target.closest('[data-onglet]'); if (o) { etat.onglet = o.dataset.onglet; vue(); return; } const b = e.target.closest('[data-act]'); if (b) agir(b.dataset.act, b.dataset.id); });
      p.addEventListener('change', e => { if (e.target.dataset.f === 'niveau') { etat.niveau = e.target.value; vue(); } });
    }
    if (!document.querySelector('.menu-item[data-page="ape"]')) {
      const ref = document.querySelector('.menu-item[data-page="docsref"]') || document.querySelector('.menu-item[data-page="dashboard"]'), m = document.createElement('div');
      m.className = 'menu-item'; m.dataset.page = 'ape'; m.setAttribute('role', 'button'); m.tabIndex = 0; m.innerHTML = '<span class="icon">\u{1F91D}</span> Bureau de l’APE'; m.onclick = () => global.showPage('ape', m);
      ref.parentNode.insertBefore(m, ref.nextSibling);
    }
    const fn = global.showPage; if (!fn.__ape) { const w = function (id, el, r) { if (id === 'ape') vue(); return fn.call(this, id, el, r); }; w.__ape = true; global.showPage = w; }
  }
  global.Ape = { installer, _etat: etat };
  setInterval(installer, 1500);   // l'école du poste peut être choisie après le chargement : on réessaie, sans effet une fois installé
})(window);
