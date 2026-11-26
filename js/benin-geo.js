/* Mon école Bénin — géographie et écoles du pays (conception : Maître Aimé FACHOLA).
   Départements, communes, arrondissements, villages / quartiers (data/referentiel_villages.json, chargé à la demande)
   et écoles maternelles et primaires (data/benin-ecoles.js). Le secondaire et le technique se saisissent librement. */
(function (global) {
  'use strict';
  const cle = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let geo = null, promesse = null;
  function charger() {
    if (geo) return Promise.resolve(geo);
    if (!promesse) {
      promesse = fetch('data/referentiel_villages.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(j => { geo = j.d; return geo; }).catch(e => { promesse = null; throw e; });
    }
    return promesse;
  }
  const deps = () => (geo || []).map(d => d[0]);
  const dep = d => (geo || []).find(x => cle(x[0]) === cle(d));
  const communes = d => ((dep(d) || [, []])[1]).map(c => c[0]);
  const commune = (d, c) => ((dep(d) || [, []])[1]).find(x => cle(x[0]) === cle(c));
  const arrondissements = (d, c) => ((commune(d, c) || [, []])[1]).map(a => a[0]);
  const villages = (d, c, a) => {
    const co = commune(d, c); if (!co) return [];
    const ar = co[1].find(x => cle(x[0]) === cle(a));
    return ar ? ar[1].slice() : [];
  };
  /* Écoles du référentiel pour un département / une commune / un arrondissement (l'arrondissement est facultatif :
     sans lui, toutes les écoles de la commune ; si son nom ne correspond à rien, toutes celles de la commune). */
  function ecoles(d, c, a) {
    const B = (global.BENIN_ECOLES || {}).d || [];
    const dd = B.find(x => cle(x[0]) === cle(d)); if (!dd) return [];
    const cc = dd[1].find(x => cle(x[0]) === cle(c)); if (!cc) return [];
    let arrs = cc[1];
    if (a) { const f = arrs.filter(x => cle(x[0]) === cle(a)); if (f.length) arrs = f; }
    const out = [];
    arrs.forEach(x => x[1].forEach(e => out.push({ nom: e[0], type: e[1] === 'M' ? 'EM' : 'EPP', annee: e[2] || '', arrondissement: x[0] })));
    return out.sort((p, q) => p.nom.localeCompare(q.nom));
  }
  global.BeninGeo = { charger, deps, communes, arrondissements, villages, ecoles, cle };
})(window);
