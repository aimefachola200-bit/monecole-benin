/* Mon école Bénin — comptes de l'école : un identifiant et un mot de passe pour chaque acteur (directeur, adjoint, secrétaire,
   enseignants, bureau de l'APE). Chaque utilisateur reçoit un identifiant de DÉPART qu'il peut modifier, et un mot de passe
   provisoire qu'il doit changer à sa première connexion. Les comptes sont gardés sur l'appareil de l'école (mots de passe
   mémorisés sous forme d'empreinte PBKDF2, jamais en clair). Cette protection règle l'usage courant de l'application partagée ;
   elle ne remplace pas un serveur : les parents et les élèves ont leur espace dans GESCOL / Scolaris.
   Conception : Maître Aimé FACHOLA */
(function (global) {
  'use strict';
  if (global.Comptes) return;
  const CLE = 'monecole:comptes', SESSION = 'monecole:session';
  const ROLES = { directeur: 'Directeur / directrice', adjoint: 'Directeur adjoint / adjointe', secretaire: 'Secrétaire / économe', enseignant: 'Enseignant(e)', ape: 'Bureau de l’APE' };
  const PREFIXE = { directeur: 'dir', adjoint: 'adj', secretaire: 'sec', enseignant: 'ens', ape: 'ape' };
  const SANS = { adjoint: ['comptes'], secretaire: ['comptes', 'backup', 'importation'] };
  const SEULEMENT = {
    enseignant: ['dashboard', 'alertes', 'listesClasse', 'presenceApprenants', 'notes', 'registres', 'apprenants', 'docsref', 'evaluations', 'pedagogie', 'fiches', 'secondaire', 'monCompte'],
    ape: ['dashboard', 'docsref', 'effectifs', 'ape', 'monCompte']
  };
  const enc = new TextEncoder();
  const A = () => global.AppBridge, esc = s => (A() ? A().echapper(s) : String(s));
  const $ = id => document.getElementById(id);
  const dispo = !!(global.crypto && global.crypto.subtle);

  const lire = () => { try { const o = JSON.parse(localStorage.getItem(CLE) || 'null'); return o && Array.isArray(o.comptes) ? o : { v: 1, comptes: [] }; } catch (e) { return { v: 1, comptes: [] }; } };
  const ecrire = o => { try { localStorage.setItem(CLE, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const alea = n => { const b = new Uint8Array(n); global.crypto.getRandomValues(b); return b; };
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  const deHex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
  async function empreinte(mdp, selHex) {
    const sel = selHex ? deHex(selHex) : alea(16);
    const cle = await crypto.subtle.importKey('raw', enc.encode(mdp), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: 150000 }, cle, 256);
    return { sel: hex(sel), h: hex(bits) };
  }
  const verifier = async (mdp, c, champ) => { const e = await empreinte(mdp, c[champ || 'sel']); return e.h === c[(champ === 'selS' ? 'hS' : 'h')]; };
  const norm = s => String(s || '').trim().toLowerCase();
  const identifiantValide = s => /^[a-z0-9][a-z0-9._-]{2,29}$/.test(s);
  function motDePasseProvisoire() {
    const L = 'abcdefghjkmnpqrstuvwxyz', N = '23456789';
    let m = ''; const b = alea(8);
    for (let i = 0; i < 6; i++) m += L[b[i] % L.length];
    return m + N[b[6] % N.length] + N[b[7] % N.length];
  }
  function codeSecours() { const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const b = alea(12); let s = ''; for (let i = 0; i < 12; i++) { s += L[b[i] % L.length]; if (i % 4 === 3 && i < 11) s += '-'; } return s; }
  function identifiantDepart(role, o) {
    let id; do { id = PREFIXE[role] + '-' + String(1000 + (alea(2)[0] * 256 + alea(2)[1]) % 9000); } while (o.comptes.some(c => c.identifiant === id));
    return id;
  }
  const courant = () => { try { const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); return s ? lire().comptes.find(c => c.id === s.id && c.actif !== false) || null : null; } catch (e) { return null; } };
  const peutVoir = (c, page) => {
    if (!c || c.role === 'directeur') return true;
    if (SEULEMENT[c.role]) return SEULEMENT[c.role].indexOf(page) >= 0;
    return (SANS[c.role] || []).indexOf(page) < 0;
  };

  /* ---------- restriction des menus selon le rôle ---------- */
  function appliquerRole() {
    const c = courant(), st = $('stylePermissions') || Object.assign(document.createElement('style'), { id: 'stylePermissions' });
    document.head.appendChild(st);
    const toutes = new Set();
    document.querySelectorAll('[data-page]').forEach(e => toutes.add(e.dataset.page));
    document.querySelectorAll('[onclick*="showPage("]').forEach(e => { const m = (e.getAttribute('onclick') || '').match(/showPage\('([^']+)'/); if (m) toutes.add(m[1]); });
    const cache = [...toutes].filter(p => !peutVoir(c, p));
    st.textContent = cache.map(p => '[data-page="' + p + '"],[onclick*="showPage(\'' + p + '\'"]{display:none!important}').join('\n');
    const b = $('btnMonCompte');
    if (b) b.textContent = c ? c.nom + ' · ' + ROLES[c.role].split(' ')[0] : 'Comptes';
    const menu = $('menuComptes'); if (menu) menu.classList.toggle('hidden', !!(c && c.role !== 'directeur'));
  }

  /* ---------- connexion ---------- */
  function ecran(titre, corps) {
    let ov = $('ovComptes'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'ovComptes';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#f0f2f5;display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto';
    ov.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:20px;box-shadow:0 6px 24px rgba(0,0,0,.15)"><h2 style="margin:0 0 6px;color:#006633">' + titre + '</h2>' + corps + '</div>';
    document.body.appendChild(ov); return ov;
  }
  function connexion() {
    const o = lire();
    if (!o.comptes.length || courant()) { appliquerRole(); return Promise.resolve(); }
    return new Promise(resolve => {
      const ov = ecran('Mon école — connexion',
        '<p class="aide" style="margin:0 0 10px;color:#555">' + esc(A().nomEcole ? A().nomEcole() : 'Mon école') + '</p>'
        + '<form id="fCnx"><label>Identifiant</label><input id="cnxId" autocomplete="username" autocapitalize="none" required style="width:100%;margin-bottom:8px">'
        + '<label>Mot de passe</label><input id="cnxMdp" type="password" autocomplete="current-password" required style="width:100%;margin-bottom:8px">'
        + '<p id="cnxErr" style="color:#b3261e;min-height:18px;margin:4px 0"></p>'
        + '<button class="btn btn-primary" style="width:100%">Se connecter</button></form>'
        + '<p style="text-align:center;margin:10px 0 0"><a href="#" id="cnxOubli">Directeur : mot de passe oublié</a></p>');
      $('cnxId').focus();
      $('fCnx').onsubmit = async ev => {
        ev.preventDefault();
        const id = norm($('cnxId').value), S = global.Securite, app = 'monecole';
        if (S && S.blocage(app, id)) { $('cnxErr').textContent = S.texteBlocage(S.blocage(app, id)); return; }
        const c = lire().comptes.find(x => x.identifiant === id && x.actif !== false);
        if (c && await verifier($('cnxMdp').value, c)) {
          if (S) S.reussite(app, id);
          sessionStorage.setItem(SESSION, JSON.stringify({ id: c.id }));
          ov.remove();
          if (c.doitChanger) await changerMotDePasse(c, true);
          appliquerRole(); surveiller(); resolve();
        } else {
          const r = S ? S.echec(app, id) : { bloqueMs: 0 };
          $('cnxErr').textContent = r.bloqueMs ? S.texteBlocage(r.bloqueMs) : 'Identifiant ou mot de passe incorrect.';
        }
      };
      $('cnxOubli').onclick = e => { e.preventDefault(); oubli(); };
    });
  }
  function oubli() {
    ecran('Mot de passe du directeur oublié',
      '<p style="margin:0 0 8px">Saisissez le <b>code de secours</b> remis lors de la création du compte du directeur, puis un nouveau mot de passe.</p>'
      + '<form id="fOubli"><label>Code de secours</label><input id="obCode" autocapitalize="characters" required style="width:100%;margin-bottom:8px">'
      + '<label>Nouveau mot de passe</label><input id="obMdp" type="password" required style="width:100%;margin-bottom:8px">'
      + '<p id="obErr" style="color:#b3261e;min-height:18px"></p><button class="btn btn-primary" style="width:100%">Réinitialiser</button>'
      + ' <button type="button" class="btn" id="obRetour" style="width:100%;margin-top:6px">Retour</button></form>');
    $('obRetour').onclick = () => location.reload();
    $('fOubli').onsubmit = async ev => {
      ev.preventDefault();
      const o = lire(), d = o.comptes.find(c => c.role === 'directeur');
      const code = $('obCode').value.trim().toUpperCase();
      if (!d || !d.hS || !(await verifier(code, d, 'selS'))) { $('obErr').textContent = 'Code de secours incorrect.'; return; }
      const raison = global.Securite && global.Securite.faible($('obMdp').value, d.identifiant);
      if (raison) { $('obErr').textContent = raison; return; }
      const e = await empreinte($('obMdp').value); d.sel = e.sel; d.h = e.h; d.doitChanger = false;
      const nouveau = codeSecours(), es = await empreinte(nouveau); d.selS = es.sel; d.hS = es.h;
      ecrire(o);
      ecran('Mot de passe réinitialisé', '<p>Notez votre <b>nouveau code de secours</b> (l’ancien ne sert plus) :</p><p style="font:700 20px monospace;text-align:center;margin:12px 0">' + nouveau + '</p><button class="btn btn-primary" style="width:100%" onclick="location.reload()">J’ai noté le code — Continuer</button>');
    };
  }
  function changerMotDePasse(c, obligatoire) {
    return new Promise(resolve => {
      const ov = ecran(obligatoire ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe',
        (obligatoire ? '<p style="margin:0 0 8px">Le mot de passe provisoire ne sert qu’à la première connexion.</p>' : '')
        + '<form id="fMdp">' + (obligatoire ? '' : '<label>Mot de passe actuel</label><input id="mpAct" type="password" required style="width:100%;margin-bottom:8px">')
        + '<label>Nouveau mot de passe</label><input id="mpNv" type="password" autocomplete="new-password" required style="width:100%;margin-bottom:4px">'
        + '<small style="color:#555">' + esc(global.Securite ? global.Securite.regle : '') + '</small>'
        + '<label style="display:block;margin-top:8px">Confirmer</label><input id="mpCf" type="password" required style="width:100%;margin-bottom:8px">'
        + '<p id="mpErr" style="color:#b3261e;min-height:18px"></p><button class="btn btn-primary" style="width:100%">Enregistrer</button>'
        + (obligatoire ? '' : ' <button type="button" class="btn" id="mpNon" style="width:100%;margin-top:6px">Annuler</button>') + '</form>');
      if ($('mpNon')) $('mpNon').onclick = () => { ov.remove(); resolve(false); };
      $('fMdp').onsubmit = async ev => {
        ev.preventDefault();
        if (!obligatoire && !(await verifier($('mpAct').value, c))) { $('mpErr').textContent = 'Mot de passe actuel incorrect.'; return; }
        if ($('mpNv').value !== $('mpCf').value) { $('mpErr').textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
        const raison = global.Securite && global.Securite.faible($('mpNv').value, c.identifiant);
        if (raison) { $('mpErr').textContent = raison; return; }
        const o = lire(), x = o.comptes.find(k => k.id === c.id), e = await empreinte($('mpNv').value);
        x.sel = e.sel; x.h = e.h; x.doitChanger = false; ecrire(o); ov.remove(); resolve(true);
      };
    });
  }

  /* ---------- déconnexion après inactivité ---------- */
  function surveiller() {
    if (global.Securite && global.Securite.inactivite && courant()) global.Securite.inactivite(20, () => { deconnecter(); });
  }
  function deconnecter() { try { sessionStorage.removeItem(SESSION); } catch (e) { /* rien */ } location.reload(); }

  /* ---------- gestion des comptes (directeur) ---------- */
  function classesChoix() {
    try { const O = global.ClassesOrg; const l = (O && O.COURS) || ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']; return Array.isArray(l) ? l.map(x => (typeof x === 'string' ? x : x.cours || x.nom)).filter(Boolean) : ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']; }
    catch (e) { return ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']; }
  }
  function pageComptes() {
    let p = $('comptes');
    if (!p) { p = document.createElement('div'); p.id = 'comptes'; p.className = 'page hidden'; $('dashboard').parentNode.appendChild(p); }
    const o = lire(), moi = courant();
    const lignes = o.comptes.map(c => '<tr><td>' + esc(c.nom) + '</td><td><b>' + esc(c.identifiant) + '</b></td><td>' + esc(ROLES[c.role]) + (c.classes && c.classes.length ? '<br><small>' + esc(c.classes.join(', ')) + '</small>' : '') + '</td><td>' + (c.actif === false ? 'Désactivé' : c.doitChanger ? 'Mot de passe provisoire' : 'Actif') + '</td><td>'
      + (c.role === 'directeur' ? '' : '<button class="btn btn-sm" data-act="reset" data-id="' + c.id + '">Nouveau mot de passe</button> <button class="btn btn-sm" data-act="bascule" data-id="' + c.id + '">' + (c.actif === false ? 'Réactiver' : 'Désactiver') + '</button> <button class="btn btn-sm btn-danger" data-act="suppr" data-id="' + c.id + '">Supprimer</button>') + '</td></tr>').join('');
    p.innerHTML = '<div class="page-title">Comptes de l’école</div>'
      + '<div class="card"><p>Chaque acteur de l’école a <b>son identifiant et son mot de passe</b>. Vous lui remettez l’identifiant de départ et un mot de passe provisoire ; il les change dès sa première connexion (l’identifiant se modifie dans « Mon compte »). '
      + 'Les comptes sont gardés sur cet appareil. Les parents et les élèves se connectent dans GESCOL / Scolaris.</p>'
      + (o.comptes.length ? '' : '<p><b>Aucun compte n’existe encore : l’application s’ouvre sans mot de passe.</b> Créez d’abord le compte du directeur.</p>')
      + '<p><button class="btn btn-primary" id="cpAjout">+ ' + (o.comptes.length ? 'Ajouter un compte' : 'Créer le compte du directeur') + '</button></p>'
      + (o.comptes.length ? '<div style="overflow:auto"><table class="table"><thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle et classes</th><th>État</th><th></th></tr></thead><tbody>' + lignes + '</tbody></table></div>' : '') + '</div>';
    $('cpAjout').onclick = () => formulaireCompte(!o.comptes.length);
    p.querySelectorAll('[data-act]').forEach(b => b.onclick = () => actionCompte(b.dataset.act, b.dataset.id));
  }
  function remise(titre, c, mdp, code) {
    A().openModal(titre, '<p>À remettre à <b>' + esc(c.nom) + '</b> (notez-le maintenant : le mot de passe provisoire ne sera plus affiché) :</p>'
      + '<table class="table"><tr><th>Identifiant</th><td><b>' + esc(c.identifiant) + '</b></td></tr><tr><th>Mot de passe provisoire</th><td><code style="font-size:18px">' + esc(mdp) + '</code></td></tr>'
      + (code ? '<tr><th>Code de secours</th><td><code style="font-size:18px">' + esc(code) + '</code><br><small>À garder en lieu sûr : il permet de retrouver l’accès si le mot de passe est oublié.</small></td></tr>' : '') + '</table>'
      + '<p class="text-center"><button class="btn" onclick="window.print()">Imprimer</button> <button class="btn btn-primary" onclick="closeModal()">Fermer</button></p>');
  }
  function formulaireCompte(premier) {
    const roles = premier ? ['directeur'] : Object.keys(ROLES).filter(r => r !== 'directeur');
    A().openModal(premier ? 'Compte du directeur' : 'Nouveau compte',
      '<form id="fNv"><label>Nom et prénoms *</label><input id="nvNom" required style="width:100%;margin-bottom:8px">'
      + '<label>Rôle</label><select id="nvRole" style="width:100%;margin-bottom:8px">' + roles.map(r => '<option value="' + r + '">' + ROLES[r] + '</option>').join('') + '</select>'
      + '<div id="nvCl" class="hidden"><label>Classes tenues (plusieurs choix possibles)</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
      + classesChoix().map(c => '<label><input type="checkbox" name="cl" value="' + esc(c) + '"> ' + esc(c) + '</label>').join('') + '</div></div>'
      + '<p style="text-align:center"><button class="btn btn-primary">Créer</button></p></form>');
    const maj = () => $('nvCl').classList.toggle('hidden', $('nvRole').value !== 'enseignant'); $('nvRole').onchange = maj; maj();
    $('fNv').onsubmit = async ev => {
      ev.preventDefault();
      const o = lire(), role = $('nvRole').value, mdp = motDePasseProvisoire(), e = await empreinte(mdp);
      const c = { id: A().uid(), nom: $('nvNom').value.trim(), role, identifiant: identifiantDepart(role, o), sel: e.sel, h: e.h, doitChanger: true, actif: true,
        classes: role === 'enseignant' ? [...document.querySelectorAll('#fNv [name=cl]:checked')].map(x => x.value) : [] };
      let code = '';
      if (role === 'directeur') { code = codeSecours(); const es = await empreinte(code); c.selS = es.sel; c.hS = es.h; }
      o.comptes.push(c); ecrire(o); A().closeModal(); remise('Compte créé', c, mdp, code);
      if (role === 'directeur') sessionStorage.setItem(SESSION, JSON.stringify({ id: c.id }));
      pageComptes(); appliquerRole();
    };
  }
  async function actionCompte(act, id) {
    const o = lire(), c = o.comptes.find(x => x.id === id); if (!c) return;
    if (act === 'reset') { const mdp = motDePasseProvisoire(), e = await empreinte(mdp); c.sel = e.sel; c.h = e.h; c.doitChanger = true; ecrire(o); remise('Nouveau mot de passe', c, mdp); }
    if (act === 'bascule') { c.actif = c.actif === false; ecrire(o); }
    if (act === 'suppr') { if (!confirm('Supprimer le compte de ' + c.nom + ' ?')) return; o.comptes = o.comptes.filter(x => x.id !== id); ecrire(o); }
    pageComptes();
  }

  /* ---------- Mon compte ---------- */
  function monCompte() {
    const c = courant(); if (!c) { global.showPage('comptes', $('menuComptes')); return; }
    A().openModal('Mon compte', '<p><b>' + esc(c.nom) + '</b> — ' + esc(ROLES[c.role]) + '</p>'
      + '<form id="fId"><label>Mon identifiant</label><input id="idNv" value="' + esc(c.identifiant) + '" required minlength="3" maxlength="30" autocapitalize="none" style="width:100%;margin-bottom:8px">'
      + '<label>Mot de passe actuel (pour confirmer)</label><input id="idMdp" type="password" required style="width:100%;margin-bottom:8px">'
      + '<p id="idErr" style="color:#b3261e;min-height:18px"></p><button class="btn btn-primary">Changer l’identifiant</button></form>'
      + '<p style="margin-top:12px"><button class="btn" id="mcMdp">Changer le mot de passe</button> <button class="btn btn-danger" id="mcSortir">Me déconnecter</button></p>');
    $('mcMdp').onclick = () => { A().closeModal(); changerMotDePasse(c, false); };
    $('mcSortir').onclick = deconnecter;
    $('fId').onsubmit = async ev => {
      ev.preventDefault();
      const nv = norm($('idNv').value), o = lire(), x = o.comptes.find(k => k.id === c.id);
      if (!(await verifier($('idMdp').value, x))) { $('idErr').textContent = 'Mot de passe incorrect.'; return; }
      if (!identifiantValide(nv)) { $('idErr').textContent = 'Identifiant : 3 à 30 caractères (lettres sans accent, chiffres, point, tiret).'; return; }
      if (o.comptes.some(k => k.id !== c.id && k.identifiant === nv)) { $('idErr').textContent = 'Cet identifiant est déjà pris.'; return; }
      x.identifiant = nv; ecrire(o); A().closeModal(); alert('Identifiant modifié : connectez-vous désormais avec « ' + nv + ' ».');
    };
  }

  /* ---------- installation ---------- */
  function installer() {
    if (!A() || !dispo) return;
    const entete = $('btnEcolePoste');
    if (entete && !$('btnMonCompte')) { const b = document.createElement('button'); b.id = 'btnMonCompte'; b.className = 'btn btn-sm'; b.textContent = 'Comptes'; b.onclick = monCompte; entete.parentNode.insertBefore(b, entete); }
    const guide = $('menuGuide');
    if (guide && !$('menuComptes')) {
      const m = document.createElement('div'); m.className = 'menu-item'; m.id = 'menuComptes'; m.dataset.page = 'comptes'; m.setAttribute('role', 'button'); m.tabIndex = 0;
      m.innerHTML = '<span class="icon">\u{1F464}</span> Comptes de l’école'; m.onclick = () => global.showPage('comptes', m);
      guide.parentNode.insertBefore(m, guide);
    }
    const original = global.showPage;
    global.showPage = function (id, el, retour) {
      if (!peutVoir(courant(), id)) return;
      if (id === 'comptes') pageComptes();
      return original.call(this, id, el, retour);
    };
    connexion().then(() => {
      appliquerRole(); surveiller();
      if (!lire().comptes.length && A().ecoleDuPoste && A().ecoleDuPoste() && !sessionStorage.getItem('monecole:rappel')) {
        sessionStorage.setItem('monecole:rappel', '1');
        setTimeout(() => A().openModal('Protéger l’application', '<p>Pour que chaque acteur de l’école (adjoint, secrétaire, enseignants, bureau de l’APE) ait <b>son identifiant et son mot de passe</b>, commencez par créer le compte du <b>directeur</b>.</p><p class="text-center"><button class="btn btn-primary" id="rpOui">Créer les comptes</button> <button class="btn" onclick="closeModal()">Plus tard</button></p>') || ($('rpOui') && ($('rpOui').onclick = () => { A().closeModal(); global.showPage('comptes', $('menuComptes')); })), 1200);
      }
    });
  }
  global.Comptes = { installer, courant, ROLES, peutVoir, _identifiantValide: identifiantValide };
  document.addEventListener('DOMContentLoaded', () => setTimeout(installer, 600));
  if (document.readyState !== 'loading') setTimeout(installer, 600);
})(window);
