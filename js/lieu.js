/* Mon école Bénin — lieu de l'école (commune, circonscription, département) pour les documents.
   Les textes des documents officiels, écrits au départ pour une seule circonscription, prennent ici le lieu inscrit à la
   première ouverture. Conception : Maître Aimé FACHOLA */
(function (global) {
  'use strict';
  const sans = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const maj = s => String(s == null ? '' : s).toLocaleUpperCase('fr-FR');
  function ecole() {
    try { const d = global.AppBridge && global.AppBridge.data; return ((d && d.ecoles) || []).filter(e => e.posteLocal)[0] || null; } catch (e) { return null; }
  }
  const brut = (champ) => { const e = ecole(); return (e && e[champ]) || ''; };
  const BJ = {
    commune: () => brut('commune') || 'votre commune',
    communeMaj: () => maj(brut('commune') || 'VOTRE COMMUNE'),
    departement: () => brut('departement') || '',
    departementMaj: () => maj(brut('departement')),
    arrondissement: () => brut('arrondissement') || '',
    cs: () => 'Circonscription Scolaire de ' + BJ.commune(),
    csMaj: () => 'CIRCONSCRIPTION SCOLAIRE DE ' + BJ.communeMaj(),
    csCourt: () => 'CS ' + BJ.commune(),
    csCode: () => 'CS-' + maj(sans(brut('commune') || 'COMMUNE')).replace(/[^A-Z0-9]+/g, '-'),
    ddemp: () => 'DDEMP ' + (BJ.departementMaj() || '…'),
    depCom: () => (BJ.departementMaj() || '…') + ' / ' + BJ.communeMaj()
  };
  global.BJ = BJ;
})(window);
