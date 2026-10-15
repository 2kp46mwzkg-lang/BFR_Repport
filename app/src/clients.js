/* =========================================================================
   clients.js — Liste clients BFR et recherche pendant la saisie
   -------------------------------------------------------------------------
   - La liste de référence est embarquée dans l'application (clients-data.js,
     généré depuis le classeur « COORDONNÉES CLIENTS » par outils/extraire_clients.py).
     Elle est donc disponible HORS CONNEXION.
   - Le technicien tape 3 ou 4 lettres : l'application propose les
     correspondances (nom + ville + contact).
   - Tout ce qui est saisi et qui manque au classeur (téléphone du client,
     e-mail, logo, contact, corrections) est mémorisé dans le téléphone et
     reproposé aux interventions suivantes.
   ========================================================================= */
(function (global) {
  'use strict';

  const CLE_MEMO = 'sav3.clients';

  function norm(txt) {
    return String(txt == null ? '' : txt)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accents
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');                        // espaces, _, ., -, etc.
  }
  function joli(txt) {
    return String(txt == null ? '' : txt).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const CLIENTS_EMBARQUES = Array.isArray(global.CLIENTS_BFR) ? global.CLIENTS_BFR.slice() : [];
  const TECHNICIENS_EMBARQUES = Array.isArray(global.TECHNICIENS_BFR) ? global.TECHNICIENS_BFR.slice() : [];

  const Clients = {
    /* ---------- Lecture ---------------------------------------------------- */
    base: function () {
      return Array.isArray(global.CLIENTS_BFR) ? global.CLIENTS_BFR : [];
    },
    embarques: function () { return CLIENTS_EMBARQUES; },
    utiliseListeImportee: function () { return this.base() !== CLIENTS_EMBARQUES; },
    listeTechniciens: function () {
      return (Array.isArray(global.TECHNICIENS_BFR) ? global.TECHNICIENS_BFR : []).map(t => ({
        nom: t.nom || t,
        reference: t.reference || t.nom || t
      }));
    },
    memo: function () {
      try { return JSON.parse(global.localStorage.getItem(CLE_MEMO) || '{}') || {}; } catch (e) { return {}; }
    },
    /* Liste de référence + tout ce que les techniciens ont saisi en plus.
       Les données locales complètent la liste (et non l'inverse). */
    liste: function () {
      const memo = this.memo();
      const vus = {};
      const out = [];
      this.base().forEach(c => {
        const cle = norm(c.nom);
        const dejaVu = vus[cle] || 0;
        vus[cle] = dejaVu + 1;
        out.push(Object.assign({}, c, memo[cle] || {}));
      });
      /* Clients saisis sur le terrain et absents du classeur : on les garde. */
      Object.keys(memo).forEach(k => {
        const m = memo[k];
        if (!m || !m.nom || vus[k]) return;
        if (Clients.base().some(c => norm(c.nom) === k)) return;
        vus[k] = 1;
        out.push(Object.assign({ contact: '', fonction: '', tel: '', adresse: '', ville: '', logo: '' }, m));
      });
      return out;
    },
    /* ---------- Recherche « 3 ou 4 lettres » ------------------------------- */
    /* Classement : d'abord les noms qui COMMENCENT par la saisie, puis ceux
       qui la contiennent ; à égalité, le nom le plus court est proposé avant.
       Si la saisie contient un espace (« Cremo Si »), on cherche aussi sur les
       mots suivants. */
    chercher: function (saisie, limite) {
      const q = norm(saisie);
      limite = limite || 8;
      if (q.length < 3) return [];                  // les propositions commencent à 3 lettres
      const large = q.length >= 4;                  // avant 4 lettres : seulement le début du nom
      const trouves = [];
      this.liste().forEach(c => {
        const n = norm(c.nom);
        const motsNom = String(c.nom || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean).map(norm);
        let score = -1;
        if (n.indexOf(q) === 0) score = 0;                                  // commence par
        else if (motsNom.some(m => m.indexOf(q) === 0)) score = 1;          // un mot commence par
        else if (large && n.indexOf(q) > 0) score = 2;                      // contient le nom
        else if (large && norm(c.ville).indexOf(q) === 0) score = 3;        // ville
        else if (large && norm(c.contact).indexOf(q) === 0) score = 4;      // contact
        if (score >= 0) trouves.push({ score: score, c: c });
      });
      trouves.sort((a, b) => a.score - b.score || norm(a.c.nom).length - norm(b.c.nom).length ||
                             String(a.c.nom).localeCompare(String(b.c.nom), 'fr'));
      return trouves.slice(0, limite).map(x => x.c);
    },
    /* Recherche exacte par nom (pour retrouver les données mémorisées). */
    parNom: function (nom) {
      const n = norm(nom);
      if (!n) return null;
      const candidats = this.liste().filter(c => norm(c.nom) === n || norm(c.reference) === n);
      if (!candidats.length) return this.memo()[n] || null;
      return candidats[0];
    },
    /* ---------- Mémorisation ---------------------------------------------- */
    /* Ce que le technicien a saisi et qui n'est pas au classeur (tél., e-mail,
       logo, contact…) est conservé dans le téléphone pour la prochaine fois. */
    retenir: function (client) {
      if (!client || !client.nom) return;
      const memo = this.memo();
      const cle = norm(client.nom);
      const avant = memo[cle] || {};
      const apres = {
        nom: joli(client.nom),
        ville: client.lieu !== undefined ? client.lieu : (client.ville !== undefined ? client.ville : (avant.ville || '')),
        adresse: client.adresse !== undefined ? client.adresse : (avant.adresse || ''),
        contact: client.contact !== undefined ? client.contact : (avant.contact || ''),
        fonction: client.fonction !== undefined ? client.fonction : (avant.fonction || ''),
        tel: client.tel !== undefined ? client.tel : (avant.tel || ''),
        email: client.email !== undefined ? client.email : (avant.email || ''),
        logo: client.logo !== undefined ? client.logo : (avant.logo || ''),
        numeroClient: client.numeroClient !== undefined ? client.numeroClient : (avant.numeroClient || ''),
        /* Langue retenue pour ce client : le rapport bilingue est reproposé
           à l'intervention suivante (le technicien garde la main). */
        langue: client.langue !== undefined ? client.langue : (avant.langue || ''),
        maj: new Date().toISOString()
      };
      memo[cle] = apres;
      try {
        global.localStorage.setItem(CLE_MEMO, JSON.stringify(memo));
        return true;
      } catch (e) { return false; }
    },
    oublier: function (nom) {
      const memo = this.memo();
      delete memo[norm(nom)];
      try { global.localStorage.setItem(CLE_MEMO, JSON.stringify(memo)); } catch (e) {}
    },
    /* ---------- Remplacement complet de la liste (import CSV/JSON) --------- */
    /* Le technicien peut charger la dernière version du classeur sans
       reconstruire l'application : le contenu est conservé dans le téléphone. */
    importer: function (texte, surMesure, aUnProbleme) {
      const lignes = Array.isArray(texte) ? texte : this.analyser(texte);
      if (!lignes.length) { if (aUnProbleme) aUnProbleme(); return 0; }
      try {
        global.localStorage.setItem('sav3.clientsListe', JSON.stringify(lignes));
        global.CLIENTS_BFR = lignes;              // prise en compte immédiate
        if (lignes.techniciens && lignes.techniciens.length) {
          global.localStorage.setItem('sav3.techniciensListe', JSON.stringify(lignes.techniciens));
          global.TECHNICIENS_BFR = lignes.techniciens;
        }
      } catch (e) { return 0; }
      if (surMesure) surMesure(lignes.length);
      return lignes.length;
    },
    listeImportee: function () {
      try { return JSON.parse(global.localStorage.getItem('sav3.clientsListe') || 'null'); } catch (e) { return null; }
    },
    /* Analyse d'un CSV (export du classeur) ou d'un tableau JSON. */
    analyser: function (texte) {
      texte = String(texte || '').trim();
      if (!texte) return [];
      if (texte[0] === '[' || texte[0] === '{') {
        try {
          const d = JSON.parse(texte);
          const arr = Array.isArray(d) ? d : (d.clients || []);
          const liste = arr.map(c => ({
            nom: joli(c.nom || c.Client || ''), reference: c.reference || '',
            adresse: String(c.adresse || '').trim(), ville: c.ville || '',
            contact: c.contact || '', fonction: c.fonction || '', tel: c.tel || '',
            email: c.email || '', logo: c.logo || '', autresContacts: c.autresContacts || '',
            /* Téléphone du client ({numero_client}) : il est saisi sur le terrain,
               il doit donc survivre à un export puis import sur un autre téléphone. */
            numeroClient: c.numeroClient || ''
          })).filter(c => c.nom);
          // liste des techniciens, si le fichier vient de « Exporter la liste actuelle »
          liste.techniciens = (Array.isArray(d.techniciens) ? d.techniciens : [])
            .map(t => ({ nom: joli((t && t.nom) || t || '') })).filter(t => t.nom);
          return liste;
        } catch (e) { return []; }
      }
      // un fichier binaire lu comme du texte (classeur, image…) ne donne que des clients illisibles
      if (/\u0000/.test(texte) || (texte.match(/\uFFFD/g) || []).length > 20) return [];
      return this.depuisLignes(this.decouperCSV(texte));
    },
    /* Lignes du classeur (CSV ou feuille .xlsx) → fiches clients.
       Colonnes du classeur « COORDONNÉES CLIENTS » : Client | Adresse | Contact | Logo.
       Si une ligne d'en-tête est trouvée, les colonnes sont reconnues par leur titre
       (l'ordre peut donc changer). logos : { n° de ligne : image } pour un .xlsx. */
    depuisLignes: function (lignes, logos) {
      logos = logos || {};
      let col = { nom: 0, adresse: 1, contact: 2, logo: 3 };
      for (let k = 0; k < Math.min(lignes.length, 10); k++) {
        const titres = (lignes[k] || []).map(x => norm(x));
        const trouve = (mots) => titres.findIndex(t => mots.some(m => t === m || t.indexOf(m) === 0));
        const iNom = trouve(['CLIENT', 'NOMDUCLIENT', 'SOCIETE', 'RAISONSOCIALE']);
        const iAdr = trouve(['ADRESSE']);
        if (iNom >= 0 && iAdr >= 0) {
          const iCont = trouve(['CONTACT']), iLogo = trouve(['LOGO']);
          col = { nom: iNom, adresse: iAdr, contact: iCont, logo: iLogo };
          break;
        }
      }
      const prendre = (cols, i) => (i >= 0 ? String(cols[i] == null ? '' : cols[i]) : '');
      const out = [];
      /* Rubrique « Techniciens » du classeur : les noms qui suivent (une ligne chacun,
         sans adresse) alimentent la liste des collègues proposés sur le terrain. */
      const techniciens = [];
      let dansTechniciens = false, lignePrec = 0;
      lignes.forEach((cols, k) => {
        cols = cols || [];
        const numLigne = cols.ligne || (k + 1);
        const sauteLigne = numLigne !== lignePrec + 1;
        lignePrec = numLigne;
        const brut = prendre(cols, col.nom).trim();
        const vide = !cols.some(x => String(x == null ? '' : x).trim());
        if (dansTechniciens) {
          if (vide || sauteLigne || !/[A-Za-zÀ-ÿ]/.test(brut) ||
              prendre(cols, col.adresse).trim() || prendre(cols, col.contact).trim()) dansTechniciens = false;
          else { techniciens.push({ nom: joli(brut) }); return; }
        }
        if (/^techniciens?$/i.test(brut)) { dansTechniciens = true; return; }
        const nom = joli(brut);
        const adresse = prendre(cols, col.adresse).replace(/\r/g, '').split('\n').map(x => x.trim()).join('\n').trim();
        const contactBrut = prendre(cols, col.contact).trim();
        const image = logos[cols.ligne || (k + 1)] || '';
        const logo = image || prendre(cols, col.logo).trim();
        if (!nom || /^client$/i.test(nom) || /^coordonn/i.test(nom) || /^technicien/i.test(nom)) return;
        if (!adresse && !contactBrut && !logo) return;
        const pc = this.decouperContact(contactBrut);
        out.push({
          nom: nom, reference: prendre(cols, col.nom).trim(), adresse: adresse,
          ville: this.ville(adresse), contact: pc.contact, fonction: pc.fonction,
          tel: pc.tel, autresContacts: pc.autres, logo: logo
        });
      });
      out.techniciens = techniciens;
      return out;
    },
    /* Import d'un fichier choisi sur le téléphone ou l'ordinateur, quel que soit son
       format : classeur Excel (.xlsx, y compris l'export de Google Sheets), CSV
       (UTF-8 ou l'encodage Windows d'Excel) ou JSON exporté par l'application.
       octets : ArrayBuffer. Renvoie une promesse { n, logos } ou { n: 0, erreur }. */
    importerFichier: async function (octets) {
      const b = new Uint8Array(octets || []);
      if (!b.length) return { n: 0, erreur: 'Fichier vide' };
      let lignes;
      if (b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) {
        // classeur .xlsx (une archive zip)
        let classeur;
        try { classeur = await Classeur.lire(b); }
        catch (e) { return { n: 0, erreur: 'Classeur illisible : ' + ((e && e.message) || e) }; }
        lignes = this.depuisLignes(classeur.lignes, classeur.logos);
        if (!lignes.length) return { n: 0, erreur: 'Aucun client trouvé dans le classeur (colonnes attendues : Client, Adresse, Contact, Logo)' };
      } else if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) {
        return { n: 0, erreur: 'Ancien format Excel (.xls) : enregistrez le classeur au format .xlsx ou CSV' };
      } else {
        let texte;
        try { texte = new TextDecoder('utf-8', { fatal: true }).decode(b); }
        catch (e) { texte = new TextDecoder('windows-1252').decode(b); }   // CSV enregistré par Excel sous Windows
        lignes = this.analyser(texte.replace(/^﻿/, ''));
        if (!lignes.length) return { n: 0, erreur: 'Fichier illisible : attendu le classeur Excel (.xlsx), un CSV ou un JSON' };
      }
      const n = this.importer(lignes);
      if (!n) return { n: 0, erreur: 'Liste trop lourde pour la mémoire du téléphone' };
      return { n: n, logos: lignes.filter(c => /^data:image\//.test(c.logo || '')).length,
        techniciens: (lignes.techniciens || []).length };
    },
    decouperCSV: function (texte) {
      const lignes = [];
      let champ = '', ligne = [], dansGuillemets = false, i = 0;
      while (i < texte.length) {
        const c = texte[i];
        if (dansGuillemets) {
          if (c === '"' && texte[i + 1] === '"') { champ += '"'; i += 2; continue; }
          if (c === '"') { dansGuillemets = false; i++; continue; }
          champ += c; i++; continue;
        }
        if (c === '"') { dansGuillemets = true; i++; continue; }
        if (c === ',' || c === ';' || c === '\t') { ligne.push(champ); champ = ''; i++; continue; }
        if (c === '\n') { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; i++; continue; }
        champ += c; i++;
      }
      if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
      return lignes;
    },
    ville: function (adresse) {
      const l = String(adresse || '').split('\n').map(x => x.trim()).filter(Boolean);
      if (!l.length) return '';
      const d = l[l.length - 1].replace(/^(?:\d{4,6}|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\s*/i, '').trim();
      return d || l[l.length - 1];
    },
    /* Découpage du champ « Contact » du classeur : nom seul d'un côté,
       fonction et téléphone de l'autre (mêmes règles que le script Python). */
    decouperContact: function (brut) {
      brut = String(brut || '').replace(/\r/g, '');
      if (!brut.trim()) return { contact: '', fonction: '', tel: '', autres: '' };
      const t = brut.match(/(?:\+\d{1,3}[\s.\-/]*)?(?:\(?\d[\d\s.\-/]{7,}\d\)?)/g) || [];
      const tels = t.map(x => x.trim().replace(/\s+/g, ' ')).filter(x => (x.match(/\d/g) || []).length >= 9);
      const reste = brut.replace(/(?:\+\d{1,3}[\s.\-/]*)?(?:\(?\d[\d\s.\-/]{7,}\d\)?)/g, ' ')
        .replace(/[ \t]{2,}/g, ' ').replace(/\n/g, ' | ').replace(/([A-Za-zÀ-ÿ])-\s+/g, '$1 - ');
      const morceaux = reste.split(/\s+[-–—]\s+|\s*\|\s*|\s*:\s*|\s+\/\s+/).map(x => x.replace(/^[\s\-–:;,]+|[\s\-–:;,]+$/g, '')).filter(Boolean);
      let contact = morceaux[0] || '';
      let queue = morceaux.slice(1).join(' ');
      let autres = '';
      const m = queue.match(/\s+(?:ou|et)\s+(?=(?:M\.|Mr|Mme|Mlle)\b)/i);
      if (m) { autres = queue.slice(m.index + m[0].length).trim(); queue = queue.slice(0, m.index).trim(); }
      let fonction = queue.replace(/[\s.]+$/, '').replace(/(?:\s*\d[\d,.\-/\s]*)+$/, '').trim();
      const MOTS = ['respons', 'mainten', 'technic', 'chef', 'directeur', 'dirigeant', 'gérant', 'service',
        'magasin', 'approvision', 'adjoint', 'condition', 'production', 'qualit', 'achat', 'secteur',
        'atelier', 'usine', 'exploit', 'travaux', 'groupe', 'bureau', 'conducteur'];
      const estNom = /^(M\.|Mr|Mme|Mlle)\b/i.test(fonction) ||
        (fonction && !MOTS.some(x => fonction.toLowerCase().indexOf(x) >= 0) &&
         fonction.split(/\s+/).length <= 4 && fonction.split(/\s+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).length >= 2);
      if (estNom) { autres = (fonction + (autres ? ' / ' + autres : '')).trim(); fonction = ''; }
      const mobile = tels.find(x => /^(06|07|\+?33\s?[67])/.test(x.replace(/\D/g, '').replace(/^33/, '0')));
      const tel = mobile || tels[0] || '';
      const restants = tels.filter(x => x !== tel);
      autres = [autres, restants.join(' / ')].filter(Boolean).join(' / ');
      return { contact: contact, fonction: fonction, tel: tel, autres: autres };
    }
  };

  /* ===================== Lecture d'un classeur .xlsx ===================
     Un .xlsx est une archive zip de fichiers XML. On lit l'archive (répertoire
     central, car Google Sheets et Excel ne mettent pas toujours les tailles dans
     les en-têtes locaux), on décompresse chaque fichier (DecompressionStream du
     navigateur, ou à défaut le décompresseur intégré ci-dessous, pour les
     iPhone plus anciens), puis on lit la première feuille et ses images (logos). */
  const Zip = {
    u16: (b, i) => b[i] | (b[i + 1] << 8),
    u32: (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0,
    entrees: function (b) {
      let fin = -1;
      for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
        if (this.u32(b, i) === 0x06054b50) { fin = i; break; }
      }
      if (fin < 0) throw new Error('archive zip incomplète');
      const nb = this.u16(b, fin + 10);
      let p = this.u32(b, fin + 16);
      const out = {};
      const dec = new TextDecoder('utf-8');
      for (let k = 0; k < nb; k++) {
        if (this.u32(b, p) !== 0x02014b50) throw new Error('répertoire zip invalide');
        const methode = this.u16(b, p + 10);
        const taille = this.u32(b, p + 20), tailleBrute = this.u32(b, p + 24);
        const lNom = this.u16(b, p + 28), lExtra = this.u16(b, p + 30), lCom = this.u16(b, p + 32);
        const local = this.u32(b, p + 42);
        const nom = dec.decode(b.subarray(p + 46, p + 46 + lNom));
        const debut = local + 30 + this.u16(b, local + 26) + this.u16(b, local + 28);
        out[nom] = { methode: methode, donnees: b.subarray(debut, debut + taille), taille: tailleBrute };
        p += 46 + lNom + lExtra + lCom;
      }
      return out;
    },
    extraire: async function (e) {
      if (e.methode === 0) return e.donnees;
      if (e.methode !== 8) throw new Error('compression zip non prise en charge (' + e.methode + ')');
      if (typeof DecompressionStream === 'function') {
        try {
          const flux = new Blob([e.donnees]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return new Uint8Array(await new Response(flux).arrayBuffer());
        } catch (err) { /* navigateur sans « deflate-raw » : décompresseur intégré */ }
      }
      return inflate(e.donnees, e.taille);
    }
  };

  /* Décompression « deflate » (RFC 1951), d'après tinf (J. Ibsen, domaine public). */
  const BASE_LONG = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const BITS_LONG = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const BASE_DIST = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const BITS_DIST = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const ORDRE_CL = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  function arbre() { return { table: new Uint16Array(16), trans: new Uint16Array(288) }; }
  function construire(t, longueurs, debut, n) {
    t.table.fill(0);
    for (let i = 0; i < n; i++) t.table[longueurs[debut + i]]++;
    t.table[0] = 0;
    const offs = new Uint16Array(16);
    for (let i = 0, somme = 0; i < 16; i++) { offs[i] = somme; somme += t.table[i]; }
    for (let i = 0; i < n; i++) if (longueurs[debut + i]) t.trans[offs[longueurs[debut + i]]++] = i;
  }
  function inflate(src, tailleAttendue) {
    const d = { src: src, i: 0, tag: 0, nb: 0 };
    let out = new Uint8Array(Math.max(tailleAttendue || 0, 1024)), o = 0;
    const place = (n) => {
      if (o + n <= out.length) return;
      const plus = new Uint8Array(Math.max(out.length * 2, o + n));
      plus.set(out.subarray(0, o)); out = plus;
    };
    const bit = () => {
      if (!d.nb--) { if (d.i >= d.src.length) throw new Error('données compressées tronquées'); d.tag = d.src[d.i++]; d.nb = 7; }
      const b = d.tag & 1; d.tag >>>= 1; return b;
    };
    const bits = (n, base) => { let v = 0; for (let k = 0; k < n; k++) v |= bit() << k; return v + base; };
    const symbole = (t) => {
      let somme = 0, cur = 0, len = 0;
      do { cur = 2 * cur + bit(); len++; if (len > 15) throw new Error('code deflate invalide'); somme += t.table[len]; cur -= t.table[len]; } while (cur >= 0);
      return t.trans[somme + cur];
    };
    const fixeL = arbre(), fixeD = arbre();
    (function () {
      const l = new Uint8Array(288);
      l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288);
      construire(fixeL, l, 0, 288);
      const dd = new Uint8Array(30); dd.fill(5);
      construire(fixeD, dd, 0, 30);
    })();
    const bloc = (tl, td) => {
      for (;;) {
        let s = symbole(tl);
        if (s === 256) return;
        if (s < 256) { place(1); out[o++] = s; continue; }
        s -= 257;
        if (s >= 29) throw new Error('longueur deflate invalide');
        const long = bits(BITS_LONG[s], BASE_LONG[s]);
        const ds = symbole(td);
        if (ds >= 30) throw new Error('distance deflate invalide');
        const dist = bits(BITS_DIST[ds], BASE_DIST[ds]);
        if (dist > o) throw new Error('distance deflate hors limites');
        place(long);
        for (let k = 0; k < long; k++, o++) out[o] = out[o - dist];
      }
    };
    let dernier;
    do {
      dernier = bit();
      const type = bits(2, 0);
      if (type === 0) {
        d.nb = 0;   // on abandonne les bits restants de l'octet en cours
        const len = d.src[d.i] | (d.src[d.i + 1] << 8);
        d.i += 4;
        if (d.i + len > d.src.length) throw new Error('bloc non compressé tronqué');
        place(len); out.set(d.src.subarray(d.i, d.i + len), o); o += len; d.i += len;
      } else if (type === 1) {
        bloc(fixeL, fixeD);
      } else if (type === 2) {
        const hlit = bits(5, 257), hdist = bits(5, 1), hclen = bits(4, 4);
        const longueurs = new Uint8Array(288 + 32);
        for (let k = 0; k < hclen; k++) longueurs[ORDRE_CL[k]] = bits(3, 0);
        const tcl = arbre(); construire(tcl, longueurs, 0, 19);
        longueurs.fill(0, 0, 19);
        for (let n = 0; n < hlit + hdist;) {
          const sym = symbole(tcl);
          if (sym < 16) { longueurs[n++] = sym; continue; }
          let rep, val = 0;
          if (sym === 16) { if (!n) throw new Error('répétition deflate invalide'); val = longueurs[n - 1]; rep = bits(2, 3); }
          else if (sym === 17) rep = bits(3, 3);
          else rep = bits(7, 11);
          if (n + rep > hlit + hdist) throw new Error('longueurs deflate invalides');
          while (rep--) longueurs[n++] = val;
        }
        const tl = arbre(), td = arbre();
        construire(tl, longueurs, 0, hlit); construire(td, longueurs, hlit, hdist);
        bloc(tl, td);
      } else {
        throw new Error('bloc deflate invalide');
      }
    } while (!dernier);
    return out.subarray(0, o);
  }

  const Classeur = {
    /* b : Uint8Array du .xlsx → { lignes: [[cellules], …], logos: { n° de ligne: dataURL } } */
    lire: async function (b) {
      const arch = Zip.entrees(b);
      const texte = async (chemin) => {
        const e = arch[chemin];
        return e ? new TextDecoder('utf-8').decode(await Zip.extraire(e)) : '';
      };
      const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
      const tous = (doc, nom) => Array.prototype.slice.call(doc.getElementsByTagNameNS('*', nom));
      const enfants = (el, nom) => Array.prototype.filter.call(el.childNodes, n => n.nodeType === 1 && n.localName === nom);
      const cible = (dossier, t) => {
        if (t[0] === '/') return t.slice(1);
        const parts = (dossier + '/' + t).split('/'); const out = [];
        parts.forEach(x => { if (x === '..') out.pop(); else if (x && x !== '.') out.push(x); });
        return out.join('/');
      };
      const liens = async (chemin) => {
        const i = chemin.lastIndexOf('/');
        const rels = chemin.slice(0, i) + '/_rels/' + chemin.slice(i + 1) + '.rels';
        const t = await texte(rels);
        const m = {};
        if (t) tous(xml(t), 'Relationship').forEach(r => { m[r.getAttribute('Id')] = cible(chemin.slice(0, i), r.getAttribute('Target')); });
        return m;
      };
      // première feuille du classeur
      const wb = await texte('xl/workbook.xml');
      if (!wb) throw new Error('ce n\'est pas un classeur Excel');
      const feuille1 = tous(xml(wb), 'sheet')[0];
      const relsWb = await liens('xl/workbook.xml');
      const rid = feuille1 && (feuille1.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || feuille1.getAttribute('r:id'));
      const cheminFeuille = (rid && relsWb[rid]) || 'xl/worksheets/sheet1.xml';
      // textes partagés
      const partages = [];
      const ss = await texte('xl/sharedStrings.xml');
      if (ss) tous(xml(ss), 'si').forEach(si => {
        let t = '';
        enfants(si, 't').forEach(x => { t += x.textContent; });
        enfants(si, 'r').forEach(r => enfants(r, 't').forEach(x => { t += x.textContent; }));
        partages.push(t);
      });
      // cellules
      const colonne = (ref) => {
        const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1;
        let n = 0; for (const c of m[1]) n = n * 26 + (c.charCodeAt(0) - 64);
        return n - 1;
      };
      const docF = xml(await texte(cheminFeuille));
      const lignes = [];
      tous(docF, 'row').forEach((row, k) => {
        const num = parseInt(row.getAttribute('r'), 10) || (k + 1);
        const cols = [];
        let auto = 0;
        enfants(row, 'c').forEach(c => {
          const i = c.getAttribute('r') ? colonne(c.getAttribute('r')) : auto;
          auto = i + 1;
          const type = c.getAttribute('t');
          const v = enfants(c, 'v')[0];
          let val = '';
          if (type === 's') val = partages[parseInt(v && v.textContent, 10)] || '';
          else if (type === 'inlineStr') { const is = enfants(c, 'is')[0]; val = is ? is.textContent : ''; }
          else if (type === 'b') val = v && v.textContent === '1' ? 'VRAI' : 'FAUX';
          else val = v ? v.textContent : '';
          cols[i] = val;
        });
        for (let i = 0; i < cols.length; i++) if (cols[i] === undefined) cols[i] = '';
        cols.ligne = num;
        lignes.push(cols);
      });
      // images posées sur la feuille (colonne « Logo ») : rangées par n° de ligne
      const logos = {};
      const relsF = await liens(cheminFeuille);
      for (const id of Object.keys(relsF)) {
        const cheminDessin = relsF[id];
        if (!/drawings\/[^/]+\.xml$/.test(cheminDessin)) continue;
        const dessin = await texte(cheminDessin);
        if (!dessin) continue;
        const relsD = await liens(cheminDessin);
        for (const ancre of tous(xml(dessin), 'from')) {
          const r = enfants(ancre, 'row')[0];
          const parent = ancre.parentNode;
          const blip = parent && tous(parent, 'blip')[0];
          if (!r || !blip) continue;
          const lien = blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || blip.getAttribute('r:embed');
          const media = relsD[lien];
          const ext = (/\.(png|jpe?g|gif|webp)$/i.exec(media || '') || [])[1];
          if (!media || !ext || !arch[media]) continue;
          const ligne = parseInt(r.textContent, 10) + 1;
          if (logos[ligne]) continue;
          const octets = await Zip.extraire(arch[media]);
          if (octets.length > 400000) continue;   // logo trop lourd pour la mémoire du téléphone
          let bin = '';
          for (let k = 0; k < octets.length; k += 0x8000) bin += String.fromCharCode.apply(null, octets.subarray(k, k + 0x8000));
          logos[ligne] = 'data:image/' + ext.toLowerCase().replace('jpg', 'jpeg') + ';base64,' + btoa(bin);
        }
      }
      return { lignes: lignes, logos: logos };
    }
  };
  Clients.lireClasseur = function (octets) { return Classeur.lire(new Uint8Array(octets)); };
  Clients._inflate = inflate;   // pour les tests

  /* Liste importée par le technicien : elle remplace la liste embarquée.
     Une ancienne version acceptait un classeur .xlsx comme s'il s'agissait d'un CSV :
     la « liste » obtenue n'était faite que de caractères illisibles. Elle est écartée. */
  const listeSauvee = Clients.listeImportee();
  const illisible = (l) => l.filter(c => /[\u0000-\u0008\u000E-\u001F\uFFFD]/.test(String(c && c.nom))).length > l.length / 4 ||
    /^PK\u0003\u0004/.test(String(l[0] && l[0].nom));
  if (Array.isArray(listeSauvee) && listeSauvee.length) {
    if (illisible(listeSauvee)) {
      try { global.localStorage.removeItem('sav3.clientsListe'); } catch (e) {}
    } else {
      global.CLIENTS_BFR = listeSauvee;
    }
  }
  const techniciensSauves = (function () {
    try { return JSON.parse(global.localStorage.getItem('sav3.techniciensListe') || 'null'); } catch (e) { return null; }
  })();
  if (Array.isArray(techniciensSauves) && techniciensSauves.length) global.TECHNICIENS_BFR = techniciensSauves;

  Clients.revenirListeOrigine = function () {
    try {
      global.localStorage.removeItem('sav3.clientsListe');
      global.localStorage.removeItem('sav3.techniciensListe');
    } catch (e) {}
    global.CLIENTS_BFR = CLIENTS_EMBARQUES;
    global.TECHNICIENS_BFR = TECHNICIENS_EMBARQUES;
  };

  global.Clients = Clients;
})(window);
