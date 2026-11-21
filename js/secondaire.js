/* Mon école — Bénin : espace SECONDAIRE ET TECHNIQUE (de la 6e à la Terminale, séries et filières).
   Classes et divisions, élèves, matières avec coefficients, notes, moyennes, rangs, bulletins et statistiques.
   Les données restent sur l'appareil de l'école (AppBridge.data : secClasses, secEleves, secMatieres, secNotes).
   Les coefficients et les formules proposés sont INDICATIFS : chaque établissement les adapte (tout est modifiable).
   Conception : Maître Aimé FACHOLA */
(function (global) {
  'use strict';
  if (global.Secondaire) return;
  const NIVEAUX = ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Tle'];
  const CYCLE1 = ['6e', '5e', '4e', '3e'];
  const SERIES = ['A1', 'A2', 'B', 'C', 'D', 'E', 'F1', 'F2', 'F3', 'F4', 'G1', 'G2', 'G3', 'H', 'Autre'];
  const MAT1 = [['Français', 3], ['Anglais', 2], ['Mathématiques', 3], ['Physique-Chimie-Technologie', 2], ['SVT', 2], ['Histoire-Géographie', 2], ['ECM', 1], ['EPS', 1], ['Allemand / Espagnol', 1]];
  const MAT2 = [['Français', 3], ['Anglais', 2], ['Mathématiques', 3], ['Physique-Chimie', 2], ['SVT', 2], ['Histoire-Géographie', 2], ['Philosophie', 2], ['EPS', 1], ['LV2', 1]];
  const A = () => global.AppBridge, $ = id => document.getElementById(id);
  const esc = s => A().echapper(s);
  const D = () => { const d = A().data; ['secClasses', 'secEleves', 'secMatieres', 'secNotes'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; }); return d; };
  const est = () => { const e = A() && A().ecoleDuPoste && A().ecoleDuPoste(); return !!(e && /^(SEC|TECH)/.test(e.type || '')); };
  const annee = () => A().anneeActive();
  const etat = { onglet: 'classes', classe: '', periode: 'T1', matiere: '' };
  const PERIODES = [['T1', '1er trimestre'], ['T2', '2e trimestre'], ['T3', '3e trimestre']];
  const nombre = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : null; };
  const arr = x => Math.round(x * 100) / 100;
  const classes = () => D().secClasses.filter(c => c.annee === annee()).sort((a, b) => NIVEAUX.indexOf(a.niveau) - NIVEAUX.indexOf(b.niveau) || String(a.serie + a.division).localeCompare(b.serie + b.division));
  const nomClasse = c => c ? [c.niveau, c.serie && c.serie !== 'Autre' ? c.serie : '', c.division].filter(Boolean).join(' ') : '';
  const eleves = cid => D().secEleves.filter(e => e.classeId === cid).sort((a, b) => (a.nom + a.prenoms).localeCompare(b.nom + b.prenoms));
  const matieres = cid => D().secMatieres.filter(m => m.classeId === cid);

  /* ----- calcul des moyennes (formule usuelle : moyenne de classe = moyenne des interrogations et devoirs ; moyenne = (moyenne de classe + composition) / 2) ----- */
  function noteDe(eid, mid, per) { return D().secNotes.find(n => n.eleveId === eid && n.matiereId === mid && n.periode === per) || null; }
  function moyenneMatiere(n) {
    if (!n) return null;
    const l = (n.suivi || []).map(nombre).filter(x => x !== null), c = nombre(n.compo);
    const mc = l.length ? l.reduce((s, x) => s + x, 0) / l.length : null;
    if (mc !== null && c !== null) return arr((mc + c) / 2);
    return mc !== null ? arr(mc) : c !== null ? arr(c) : null;
  }
  function resultats(cid, per) {
    const ms = matieres(cid);
    const l = eleves(cid).map(e => {
      let pts = 0, coef = 0;
      ms.forEach(m => { const mo = moyenneMatiere(noteDe(e.id, m.id, per)); if (mo !== null) { pts += mo * m.coef; coef += m.coef; } });
      return { e, moy: coef ? arr(pts / coef) : null };
    });
    const tri = l.filter(r => r.moy !== null).sort((a, b) => b.moy - a.moy);
    tri.forEach((r, i) => { r.rang = i > 0 && tri[i - 1].moy === r.moy ? tri[i - 1].rang : i + 1; });
    return l;
  }
  const mention = m => m === null ? '' : m >= 16 ? 'Très bien' : m >= 14 ? 'Bien' : m >= 12 ? 'Assez bien' : m >= 10 ? 'Passable' : m >= 8 ? 'Insuffisant' : 'Faible';

  /* ----- affichage ----- */
  const sel = (nom, opts, val, extra) => '<select data-f="' + nom + '" ' + (extra || '') + '>' + opts.map(o => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (v === val ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
  const choixClasse = () => '<label>Classe ' + sel('classe', [['', '— Choisir —']].concat(classes().map(c => [c.id, nomClasse(c)])), etat.classe) + '</label>';
  const choixPeriode = () => '<label>Période ' + sel('periode', PERIODES, etat.periode) + '</label>';
  const ONGLETS = [['classes', 'Classes'], ['eleves', 'Élèves'], ['matieres', 'Matières'], ['notes', 'Notes'], ['resultats', 'Résultats et bulletins'], ['stats', 'Statistiques']];

  function vue() {
    const p = $('secondaire'); if (!p) return;
    const nav = '<div class="tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">' + ONGLETS.map(o => '<button class="btn ' + (o[0] === etat.onglet ? 'btn-primary' : '') + '" data-onglet="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
    const f = { classes: vClasses, eleves: vEleves, matieres: vMatieres, notes: vNotes, resultats: vResultats, stats: vStats }[etat.onglet];
    p.innerHTML = '<div class="page-title">Secondaire et technique — ' + esc(annee()) + '</div>' + nav + '<div id="secCorps">' + f() + '</div>';
  }
  function vClasses() {
    const cl = classes();
    return '<div class="card"><h3>Ajouter une classe</h3><div class="form-row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">'
      + '<label>Niveau ' + sel('nNiveau', NIVEAUX, '6e') + '</label>'
      + '<label>Série / filière <input data-f="nSerie" placeholder="A1, C, D, G2… ou STI" list="secSeries" style="width:9em"></label><datalist id="secSeries">' + SERIES.map(s => '<option>' + s + '</option>').join('') + '</datalist>'
      + '<label>Division <input data-f="nDiv" placeholder="A, B, 1…" style="width:5em"></label>'
      + '<label>Salle <input data-f="nSalle" style="width:6em"></label>'
      + '<label>Professeur principal <input data-f="nPP" style="width:11em"></label>'
      + '<button class="btn btn-primary" data-act="addClasse">Ajouter</button></div></div>'
      + '<div class="card"><h3>Classes de l’année</h3>' + (cl.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>Classe</th><th>Salle</th><th>Professeur principal</th><th>Effectif</th><th></th></tr></thead><tbody>'
        + cl.map(c => '<tr><td><b>' + esc(nomClasse(c)) + '</b></td><td>' + esc(c.salle || '') + '</td><td>' + esc(c.pp || '') + '</td><td>' + eleves(c.id).length + '</td><td><button class="btn btn-sm btn-danger" data-act="delClasse" data-id="' + c.id + '">Supprimer</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="aide">Aucune classe pour cette année. Ajoutez la première ci-dessus.</p>') + '</div>';
  }
  function vEleves() {
    const c = classes().find(x => x.id === etat.classe);
    let h = '<div class="card">' + choixClasse() + '</div>';
    if (!c) return h + '<p class="aide">Choisissez une classe.</p>';
    const l = eleves(c.id);
    h += '<div class="card"><h3>Ajouter un élève — ' + esc(nomClasse(c)) + '</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">'
      + '<label>Matricule <input data-f="eMat" style="width:9em"></label><label>Nom <input data-f="eNom" style="width:10em"></label><label>Prénoms <input data-f="ePre" style="width:11em"></label>'
      + '<label>Sexe ' + sel('eSexe', ['F', 'M'], 'F') + '</label><label>Naissance <input type="date" data-f="eNaiss"></label><label class="case"><input type="checkbox" data-f="eRed"> Redoublant</label>'
      + '<button class="btn btn-primary" data-act="addEleve">Ajouter</button></div>'
      + '<details style="margin-top:10px"><summary>Coller une liste (un élève par ligne : NOM Prénoms ; sexe)</summary><textarea data-f="liste" rows="5" style="width:100%" placeholder="AKPO Marie ; F&#10;DOSSOU Jean-Paul ; M"></textarea><button class="btn" data-act="importEleves">Importer la liste</button></details></div>';
    return h + '<div class="card"><h3>' + l.length + ' élève(s)</h3>' + (l.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>N°</th><th>Matricule</th><th>Nom et prénoms</th><th>Sexe</th><th>Naissance</th><th>Red.</th><th></th></tr></thead><tbody>'
      + l.map((e, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(e.matricule || '') + '</td><td>' + esc(e.nom + ' ' + e.prenoms) + '</td><td>' + esc(e.sexe) + '</td><td>' + esc(e.naissance || '') + '</td><td>' + (e.redoublant ? 'Oui' : '') + '</td><td><button class="btn btn-sm btn-danger" data-act="delEleve" data-id="' + e.id + '">Supprimer</button></td></tr>').join('') + '</tbody></table></div>' : '') + '</div>';
  }
  function vMatieres() {
    const c = classes().find(x => x.id === etat.classe);
    let h = '<div class="card">' + choixClasse() + '</div>';
    if (!c) return h + '<p class="aide">Choisissez une classe.</p>';
    const l = matieres(c.id);
    h += '<div class="card"><h3>Matières de ' + esc(nomClasse(c)) + '</h3>'
      + '<p><button class="btn" data-act="matDefaut">Proposer les matières usuelles</button> <span class="aide">Les coefficients proposés sont indicatifs : modifiez-les selon votre série et le programme en vigueur.</span></p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end"><label>Matière <input data-f="mNom" style="width:14em"></label><label>Coefficient <input type="number" data-f="mCoef" value="1" min="0.5" step="0.5" style="width:5em"></label><label>Professeur <input data-f="mProf" style="width:11em"></label><button class="btn btn-primary" data-act="addMatiere">Ajouter</button></div>'
      + (l.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>Matière</th><th>Coef.</th><th>Professeur</th><th></th></tr></thead><tbody>' + l.map(m => '<tr><td>' + esc(m.nom) + '</td><td><input type="number" min="0.5" step="0.5" style="width:5em" data-coef="' + m.id + '" value="' + m.coef + '"></td><td>' + esc(m.prof || '') + '</td><td><button class="btn btn-sm btn-danger" data-act="delMatiere" data-id="' + m.id + '">Supprimer</button></td></tr>').join('') + '</tbody></table></div>' : '') + '</div>';
    return h;
  }
  function vNotes() {
    const c = classes().find(x => x.id === etat.classe), ms = c ? matieres(c.id) : [];
    let h = '<div class="card" style="display:flex;flex-wrap:wrap;gap:10px">' + choixClasse() + choixPeriode()
      + (c ? '<label>Matière ' + sel('matiere', [['', '— Choisir —']].concat(ms.map(m => [m.id, m.nom])), etat.matiere) + '</label>' : '') + '</div>';
    const m = ms.find(x => x.id === etat.matiere);
    if (!c || !m) return h + '<p class="aide">Choisissez la classe, la période et la matière.</p>';
    const l = eleves(c.id);
    h += '<div class="card"><h3>' + esc(m.nom) + ' — ' + esc(nomClasse(c)) + ' — ' + esc(PERIODES.find(p => p[0] === etat.periode)[1]) + '</h3>'
      + '<p class="aide">Notes sur 20. Moyenne de classe = moyenne des interrogations et devoirs ; moyenne de la matière = (moyenne de classe + composition) ÷ 2. Laissez vide si l’élève était absent.</p>'
      + '<div style="overflow:auto"><table class="table"><thead><tr><th>Élève</th><th>Interro 1</th><th>Interro 2</th><th>Devoir 1</th><th>Devoir 2</th><th>Composition</th><th>Moyenne</th></tr></thead><tbody>'
      + l.map(e => { const n = noteDe(e.id, m.id, etat.periode) || { suivi: [], compo: '' }; const s = n.suivi || [];
        const cell = (k, v) => '<td><input type="number" min="0" max="20" step="0.25" style="width:5.5em" data-note="' + e.id + '" data-k="' + k + '" value="' + (v === undefined || v === null ? '' : esc(v)) + '"></td>';
        return '<tr><td>' + esc(e.nom + ' ' + e.prenoms) + '</td>' + cell(0, s[0]) + cell(1, s[1]) + cell(2, s[2]) + cell(3, s[3]) + cell('c', n.compo)
          + '<td><b id="mo-' + e.id + '">' + (moyenneMatiere(n) === null ? '' : moyenneMatiere(n)) + '</b></td></tr>'; }).join('') + '</tbody></table></div></div>';
    return h;
  }
  function vResultats() {
    const c = classes().find(x => x.id === etat.classe);
    let h = '<div class="card" style="display:flex;flex-wrap:wrap;gap:10px">' + choixClasse() + choixPeriode() + '</div>';
    if (!c) return h + '<p class="aide">Choisissez une classe.</p>';
    const r = resultats(c.id, etat.periode), ms = matieres(c.id);
    if (!r.length) return h + '<p class="aide">Aucun élève dans cette classe.</p>';
    const ok = r.filter(x => x.moy !== null);
    h += '<div class="card"><p><button class="btn" data-act="imprResultats">Imprimer le tableau des résultats</button> <button class="btn" data-act="imprBulletins">Imprimer tous les bulletins</button></p>'
      + '<div style="overflow:auto"><table class="table"><thead><tr><th>Rang</th><th>Élève</th>' + ms.map(m => '<th>' + esc(m.nom) + '<br><small>coef ' + m.coef + '</small></th>').join('') + '<th>Moyenne</th><th>Mention</th></tr></thead><tbody>'
      + r.slice().sort((a, b) => (a.rang || 999) - (b.rang || 999)).map(x => '<tr><td>' + (x.rang || '') + '</td><td>' + esc(x.e.nom + ' ' + x.e.prenoms) + '</td>' + ms.map(m => { const v = moyenneMatiere(noteDe(x.e.id, m.id, etat.periode)); return '<td>' + (v === null ? '' : v) + '</td>'; }).join('')
        + '<td><b>' + (x.moy === null ? '' : x.moy) + '</b></td><td>' + mention(x.moy) + '</td></tr>').join('') + '</tbody></table></div>'
      + '<p class="aide">Moyenne de la classe : ' + (ok.length ? arr(ok.reduce((s, x) => s + x.moy, 0) / ok.length) : '—') + ' · ≥ 10 : ' + ok.filter(x => x.moy >= 10).length + ' / ' + ok.length + '</p></div>';
    return h;
  }
  function vStats() {
    const cl = classes();
    if (!cl.length) return '<p class="aide">Aucune classe pour cette année.</p>';
    let tg = 0, tf = 0, tr = 0;
    const l = cl.map(c => { const e = eleves(c.id), f = e.filter(x => x.sexe === 'F').length, r = e.filter(x => x.redoublant).length; tg += e.length - f; tf += f; tr += r; return [nomClasse(c), e.length - f, f, e.length, r]; });
    return '<div class="card"><h3>Effectifs par classe</h3><div style="overflow:auto"><table class="table"><thead><tr><th>Classe</th><th>Garçons</th><th>Filles</th><th>Total</th><th>Redoublants</th></tr></thead><tbody>'
      + l.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + x[1] + '</td><td>' + x[2] + '</td><td><b>' + x[3] + '</b></td><td>' + x[4] + '</td></tr>').join('')
      + '<tr><th>Total</th><th>' + tg + '</th><th>' + tf + '</th><th>' + (tg + tf) + '</th><th>' + tr + '</th></tr></tbody></table></div>'
      + '<p><button class="btn" data-act="imprStats">Imprimer</button></p></div>';
  }

  /* ----- impressions ----- */
  function imprimer(titre, corps) {
    const e = A().ecoleDuPoste() || {}, w = global.open('', '_blank'); if (!w) { alert('Autorisez l’ouverture de fenêtres pour imprimer.'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(titre) + '</title><style>body{font:13px Arial,sans-serif;margin:18px;color:#111}h1{font-size:17px;text-align:center;margin:2px}h2{font-size:14px;text-align:center;margin:2px 0 10px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #444;padding:3px 5px;text-align:left}.s{page-break-after:always}.pied{font-size:10px;color:#555;text-align:center;margin-top:14px}</style>'
      + '<h1>RÉPUBLIQUE DU BÉNIN</h1><h2>' + esc(e.nom || '') + ' — année ' + esc(annee()) + '</h2>' + corps + '<div class="pied">Mon école — Bénin</div>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  }
  function bulletin(c, x, per, nb) {
    const ms = matieres(c.id), lib = PERIODES.find(p => p[0] === per)[1];
    return '<div class="s"><h2>BULLETIN DE NOTES — ' + esc(lib) + '</h2><p><b>' + esc(x.e.nom + ' ' + x.e.prenoms) + '</b> · Classe : ' + esc(nomClasse(c)) + ' · Matricule : ' + esc(x.e.matricule || '—') + ' · Effectif : ' + nb + '</p>'
      + '<table><tr><th>Matière</th><th>Coef.</th><th>Moyenne /20</th><th>Moy. × coef.</th><th>Professeur</th></tr>'
      + ms.map(m => { const v = moyenneMatiere(noteDe(x.e.id, m.id, per)); return '<tr><td>' + esc(m.nom) + '</td><td>' + m.coef + '</td><td>' + (v === null ? '' : v) + '</td><td>' + (v === null ? '' : arr(v * m.coef)) + '</td><td>' + esc(m.prof || '') + '</td></tr>'; }).join('') + '</table>'
      + '<p><b>Moyenne générale : ' + (x.moy === null ? '—' : x.moy + ' / 20') + '</b> · Rang : ' + (x.rang ? x.rang + ' / ' + nb : '—') + ' · Mention : ' + mention(x.moy) + '</p>'
      + '<p>Appréciation du conseil de classe : ________________________________________________</p><p>Le Chef d’établissement : ______________________ &nbsp; Les parents : ______________________</p></div>';
  }

  /* ----- actions ----- */
  function lireChamp(n) { const el = document.querySelector('#secondaire [data-f="' + n + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; }
  function agir(act, id) {
    const d = D(), uid = A().uid;
    if (act === 'addClasse') { const niv = lireChamp('nNiveau'); d.secClasses.push({ id: uid(), annee: annee(), niveau: niv, serie: CYCLE1.indexOf(niv) >= 0 ? '' : lireChamp('nSerie'), division: lireChamp('nDiv'), salle: lireChamp('nSalle'), pp: lireChamp('nPP') }); }
    else if (act === 'delClasse') { if (!confirm('Supprimer cette classe, ses élèves, ses matières et ses notes ?')) return; const el = d.secEleves.filter(e => e.classeId === id).map(e => e.id); d.secClasses = d.secClasses.filter(c => c.id !== id); d.secEleves = d.secEleves.filter(e => e.classeId !== id); const mm = d.secMatieres.filter(m => m.classeId === id).map(m => m.id); d.secMatieres = d.secMatieres.filter(m => m.classeId !== id); d.secNotes = d.secNotes.filter(n => el.indexOf(n.eleveId) < 0 && mm.indexOf(n.matiereId) < 0); }
    else if (act === 'addEleve') { const nom = lireChamp('eNom'), pre = lireChamp('ePre'); if (!nom) { alert('Le nom est obligatoire.'); return; } d.secEleves.push({ id: uid(), classeId: etat.classe, matricule: lireChamp('eMat'), nom: nom.toUpperCase(), prenoms: pre, sexe: lireChamp('eSexe') || 'F', naissance: lireChamp('eNaiss'), redoublant: !!lireChamp('eRed') }); }
    else if (act === 'importEleves') { lireChamp('liste').split(/\n/).forEach(l => { const p = l.split(/[;\t]/), nomp = (p[0] || '').trim(); if (!nomp) return; const mots = nomp.split(/\s+/); d.secEleves.push({ id: uid(), classeId: etat.classe, matricule: '', nom: mots[0].toUpperCase(), prenoms: mots.slice(1).join(' '), sexe: /^m/i.test((p[1] || '').trim()) ? 'M' : 'F', naissance: '', redoublant: false }); }); }
    else if (act === 'delEleve') { d.secEleves = d.secEleves.filter(e => e.id !== id); d.secNotes = d.secNotes.filter(n => n.eleveId !== id); }
    else if (act === 'addMatiere') { const nom = lireChamp('mNom'); if (!nom) return; d.secMatieres.push({ id: uid(), classeId: etat.classe, nom, coef: nombre(lireChamp('mCoef')) || 1, prof: lireChamp('mProf') }); }
    else if (act === 'matDefaut') { const c = classes().find(x => x.id === etat.classe); if (!c) return; const exist = matieres(c.id).map(m => m.nom); (CYCLE1.indexOf(c.niveau) >= 0 ? MAT1 : MAT2).forEach(m => { if (exist.indexOf(m[0]) < 0) d.secMatieres.push({ id: uid(), classeId: c.id, nom: m[0], coef: m[1], prof: '' }); }); }
    else if (act === 'delMatiere') { d.secMatieres = d.secMatieres.filter(m => m.id !== id); d.secNotes = d.secNotes.filter(n => n.matiereId !== id); }
    else if (act === 'imprResultats') { const c = classes().find(x => x.id === etat.classe), r = resultats(c.id, etat.periode), ms = matieres(c.id);
      imprimer('Résultats', '<h2>Résultats — ' + esc(nomClasse(c)) + ' — ' + esc(PERIODES.find(p => p[0] === etat.periode)[1]) + '</h2><table><tr><th>Rang</th><th>Élève</th>' + ms.map(m => '<th>' + esc(m.nom) + '</th>').join('') + '<th>Moyenne</th><th>Mention</th></tr>'
        + r.slice().sort((a, b) => (a.rang || 999) - (b.rang || 999)).map(x => '<tr><td>' + (x.rang || '') + '</td><td>' + esc(x.e.nom + ' ' + x.e.prenoms) + '</td>' + ms.map(m => { const v = moyenneMatiere(noteDe(x.e.id, m.id, etat.periode)); return '<td>' + (v === null ? '' : v) + '</td>'; }).join('') + '<td>' + (x.moy === null ? '' : x.moy) + '</td><td>' + mention(x.moy) + '</td></tr>').join('') + '</table>'); return; }
    else if (act === 'imprBulletins') { const c = classes().find(x => x.id === etat.classe), r = resultats(c.id, etat.periode); imprimer('Bulletins', r.map(x => bulletin(c, x, etat.periode, r.length)).join('')); return; }
    else if (act === 'imprStats') { imprimer('Effectifs', '<h2>Effectifs par classe</h2>' + document.querySelector('#secCorps table').outerHTML); return; }
    A().saveData(); vue();
  }
  function brancher() {
    const p = $('secondaire');
    p.addEventListener('click', e => { const o = e.target.closest('[data-onglet]'); if (o) { etat.onglet = o.dataset.onglet; vue(); return; } const b = e.target.closest('[data-act]'); if (b) agir(b.dataset.act, b.dataset.id); });
    p.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.f === 'classe') { etat.classe = t.value; etat.matiere = ''; vue(); }
      else if (t.dataset.f === 'periode') { etat.periode = t.value; vue(); }
      else if (t.dataset.f === 'matiere') { etat.matiere = t.value; vue(); }
      else if (t.dataset.coef) { const m = D().secMatieres.find(x => x.id === t.dataset.coef); if (m) { m.coef = nombre(t.value) || 1; A().saveData(); } }
      else if (t.dataset.note) {
        const eid = t.dataset.note, d = D(); let n = noteDe(eid, etat.matiere, etat.periode);
        if (!n) { n = { id: A().uid(), eleveId: eid, matiereId: etat.matiere, periode: etat.periode, suivi: ['', '', '', ''], compo: '' }; d.secNotes.push(n); }
        let v = t.value.trim(); if (v !== '') { const x = nombre(v); if (x === null || x < 0 || x > 20) { alert('La note doit être comprise entre 0 et 20.'); t.value = ''; v = ''; } }
        if (t.dataset.k === 'c') n.compo = v; else { n.suivi = n.suivi || ['', '', '', '']; n.suivi[Number(t.dataset.k)] = v; }
        A().saveData(); const mo = moyenneMatiere(n), cel = $('mo-' + eid); if (cel) cel.textContent = mo === null ? '' : mo;
      }
    });
  }

  /* ----- installation : menu, page, adaptation du tableau de bord ----- */
  const PRIMAIRE_SEUL = ['cep', 'cm2', 'listesClasse', 'apprenants', 'presenceApprenants', 'notes', 'classes', 'educmaster', 'registres', 'evaluations', 'examen'];
  function installer() {
    if (!A() || !$('dashboard')) return;
    const ec = A().ecoleDuPoste && A().ecoleDuPoste(); if (!ec) return;
    let st = $('styleSecondaire'); if (!st) { st = document.createElement('style'); st.id = 'styleSecondaire'; document.head.appendChild(st); }
    if (!est()) { st.textContent = '[data-page="secondaire"]{display:none!important}'; return; }
    st.textContent = PRIMAIRE_SEUL.map(p => '[data-page="' + p + '"],[onclick*="showPage(\'' + p + '\'"]{display:none!important}').join('\n');
    if (!$('secondaire')) { const p = document.createElement('div'); p.id = 'secondaire'; p.className = 'page hidden'; $('dashboard').parentNode.appendChild(p); brancher(); }
    if (!document.querySelector('.menu-item[data-page="secondaire"]')) {
      const premier = document.querySelector('.menu-item[data-page="dashboard"]'), m = document.createElement('div');
      m.className = 'menu-item'; m.dataset.page = 'secondaire'; m.setAttribute('role', 'button'); m.tabIndex = 0; m.innerHTML = '<span class="icon">\u{1F393}</span> Secondaire et technique';
      m.onclick = () => global.showPage('secondaire', m); if (premier && premier.parentNode) premier.parentNode.insertBefore(m, premier.nextSibling);
      if (global.TableauBord) global.TableauBord.render();
    }
    const fn = global.showPage;
    if (!fn.__sec) { const w = function (id, el, r) { if (id === 'secondaire') vue(); return fn.call(this, id, el, r); }; w.__sec = true; global.showPage = w; }
  }
  global.Secondaire = { installer, est, moyenneMatiere, resultats, _etat: etat };
  document.addEventListener('DOMContentLoaded', () => { setTimeout(installer, 700); setTimeout(installer, 2500); });
  if (document.readyState !== 'loading') { setTimeout(installer, 700); setTimeout(installer, 2500); }
})(window);
