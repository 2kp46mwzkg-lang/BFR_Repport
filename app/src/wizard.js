/* =========================================================================
   wizard.js — Assistant « Ajouter un évènement » en 4 étapes
     1. Nature    : Travail réalisé (ce que le technicien a fait)
                    ou Constat (ce qu'il a observé)
        Domaine   : Mécanique / Électrique / Automatisme
     2. Annotation: texte écrit ou dicté (+ relecture vocale)
     3. Photo     : prise de vue puis annotation au doigt
     4. Travail   : Résultat — Terminé (travail prévu) / Résolu /
                    Partiellement résolu / À surveiller
        Constat   : Catégorie — Sécurité / Urgent / Priorité haute / basse /
                    Informatif, + « Corrigé sur place »
   Formation des opérateurs (3e nature), en 4 étapes elle aussi :
     1. Intitulé et machine
     2. Programme : date, horaires, formateur, points abordés, méthode
        d'évaluation, documents remis, observations (texte ou dictée)
     3. Participants : nom, fonction, évaluation et signature de chacun
        (feuille d'émargement)
     4. Bilan (ce qui manque pour valider la formation) et photos
   L'évènement est enregistré dès la première étape et reste modifiable :
   on peut rouvrir l'assistant à tout moment, rien n'est perdu.
   ========================================================================= */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const valeur = (v) => String(v == null ? '' : v).trim();
  const nouvelId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* Résultat d'un travail réalisé (mêmes clés que Report.RESULTATS). */
  const RESULTATS = [
    { id: 'termine', libelle: 'Terminé', note: 'Travail prévu (entretien, remplacement planifié…), réalisé comme prévu.', couleur: '#0f766e', fond: '#ccfbf1' },
    { id: 'resolu', libelle: 'Résolu', note: 'Le problème est réglé.', couleur: '#15803d', fond: '#dcfce7' },
    { id: 'partiel', libelle: 'Partiellement résolu', note: 'Amélioration, mais il reste quelque chose à faire.', couleur: '#c2410c', fond: '#ffedd5' },
    { id: 'surveiller', libelle: 'À surveiller', note: 'Fonctionne, à contrôler lors de la prochaine visite.', couleur: '#b45309', fond: '#fef3c7' }
  ];

  class Assistant {
    constructor(evenement, ctx) {
      this.ev = evenement;
      this.ctx = ctx || {};
      this.S = this.ctx.reglages || {};
      this.machines = (this.ctx.machines || []).filter(m => m && (m.designation || m.modele || m.serie));
      if (!this.ev.machineNom && !this.ev.machineId && this.machines.length === 1) {
        this.ev.machineId = this.machines[0].id || '';
        this.ev.machineNom = this.machines[0].designation || '';
      }
      /* Réouverture : on revient directement sur l'annotation si le domaine est déjà
         choisi (c'est ce qu'on corrige le plus souvent) ; « ← Retour » ramène au domaine.
         Une formation rouvre sur ses participants (émargement en cours). */
      this.etape = this.estFormation()
        ? (this.titreFormation() ? 3 : 1)
        : (evenement.domaine ? 2 : 1);
      this.reconnaissance = null;
      this.ecoute = false;
      this.ouvrir();
    }

    domaines() { return this.S.domaines || []; }
    categories() { return this.S.categories || []; }
    estTravail() { return this.ev.nature === 'travail'; }
    estFormation() { return this.ev.nature === 'formation'; }
    /* Fiche de formation de l'évènement, créée au premier besoin. */
    fm() {
      if (!this.ev.formation || typeof this.ev.formation !== 'object') {
        this.ev.formation = Report.nouvelleFormation({ formateur: this.ctx.formateur || '' });
      }
      const f = this.ev.formation;
      if (!Array.isArray(f.sujets)) {
        // formation enregistrée avant le choix de plusieurs sujets
        const sj = Report.sujetsDe(f);
        f.sujets = sj.sujets;
        f.intitule = sj.intitule;
      }
      ['points', 'methodes', 'documents', 'participants'].forEach(k => { if (!Array.isArray(f[k])) f[k] = []; });
      return f;
    }
    /* « Conduite de la machine, Changement de format » (sujets choisis + sujet écrit). */
    titreFormation() { return Report.titreFormation(this.fm()); }
    libelleNature() { return this.estFormation() ? 'Formation' : (this.estTravail() ? 'Travail réalisé' : 'Constat'); }

    ouvrir() {
      const icoClose = (window.ICO && window.ICO.close(20)) || '✕';
      const overlay = document.createElement('div');
      overlay.className = 'assistant';
      overlay.innerHTML = `
        <div class="assistant-bar">
          <button type="button" class="iconbtn" data-a="fermer">${icoClose}</button>
          <div class="assistant-titre" id="assistantTitre">Évènement</div>
          <button type="button" class="btn sm" data-a="enregistrer">Enregistrer</button>
        </div>
        <div class="assistant-progres" id="assistantProgres"></div>
        <div class="assistant-corps" id="assistantCorps"></div>
        <div class="assistant-nav" id="assistantNav"></div>`;
      document.body.appendChild(overlay);
      this.overlay = overlay;
      this.corps = overlay.querySelector('#assistantCorps');

      overlay.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]');
        if (b) {
          const a = b.dataset.a;
          if (a === 'fermer') this.fermer();
          else if (a === 'enregistrer') this.enregistrer();
          else if (a === 'suivant') this.aller(this.etape + 1);
          else if (a === 'retour') this.aller(this.etape - 1);
          else if (a === 'supprimer') this.supprimer();
          else if (a === 'photo') this.prendrePhoto();
          else if (a === 'photo-lib') this.photoBibliotheque();
          else if (a === 'dictee') this.basculerDictee();
          else if (a === 'relire') this.relire();
          else if (a === 'fm-ajouter-point') this.ajouterPoint();
          else if (a === 'fm-retirer-point') { this.fm().points.splice(+b.dataset.k, 1); this.maj(); this.rendre(true); }
          else if (a === 'fm-maintenant') this.heureMaintenant(b.dataset.champ);
          else if (a === 'fm-ajouter') this.ajouterParticipant();
          else if (a === 'fm-reprendre') this.reprendreParticipants(b.dataset.source);
          else if (a === 'fm-retirer') this.retirerParticipant(+b.dataset.p);
          else if (a === 'fm-signer') this.signerParticipant(+b.dataset.p);
          else if (a === 'fm-signer-tous') this.signerTous();
          else if (a === 'fm-tous-acquis') this.tousAcquis();
          else if (a === 'fm-aller') this.aller(+b.dataset.etape);
          return;
        }
        const n = e.target.closest('[data-nature]');
        if (n) {
          this.ev.nature = n.dataset.nature;
          if (this.estFormation()) this.fm();
          this.maj(); this.rendre();
          return;
        }
        const intit = e.target.closest('[data-intitule]');
        if (intit) {
          // plusieurs sujets possibles : chaque bouton s'allume ou s'éteint
          const f = this.fm(), sujet = intit.dataset.intitule;
          f.sujets = f.sujets.indexOf(sujet) >= 0 ? f.sujets.filter(x => x !== sujet) : f.sujets.concat([sujet]);
          f.sujets = Report.sujetsDe(f).sujets;            // ordre de la liste proposée
          this.ev.heure = this.ev.heure || new Date().toISOString();
          this.maj(); this.rendre(true);
          return;
        }
        const fct = e.target.closest('[data-fonction]');
        if (fct) {
          const champ = this.overlay.querySelector('#fmFonction');
          if (champ) champ.value = fct.dataset.fonction;
          this.overlay.querySelectorAll('[data-fonction]').forEach(x => x.classList.toggle('on', x === fct));
          return;
        }
        const evl = e.target.closest('[data-eval]');
        if (evl) {
          const pa = this.fm().participants[+evl.dataset.p];
          if (pa) {
            pa.evaluation = pa.evaluation === evl.dataset.eval ? '' : evl.dataset.eval;
            this.maj(); this.rendre(true);
          }
          return;
        }
        const res = e.target.closest('[data-resultat]');
        if (res) {
          this.ev.resultat = res.dataset.resultat;
          this.ev.heure = this.ev.heure || new Date().toISOString();
          this.maj();
          this.toast('Travail enregistré');
          this.fermer();
          return;
        }
        const d = e.target.closest('[data-domaine]');
        if (d) {
          this.ev.domaine = d.dataset.domaine;
          if (!this.ev.heure) this.ev.heure = new Date().toISOString();
          this.maj(); this.aller(2);
          return;
        }
        const c = e.target.closest('[data-categorie]');
        if (c) {
          this.ev.categorie = c.dataset.categorie;
          if (!this.ev.nature) this.ev.nature = 'constat';
          this.ev.heure = this.ev.heure || new Date().toISOString();
          this.maj();
          this.toast('Constat enregistré');
          this.fermer();
          return;
        }
        const p = e.target.closest('[data-annot]');
        if (p) {
          const photo = this.ev.photos[+p.dataset.annot];
          const self = this;
          Annotation.ouvrir(photo, {
            fin: function (valide) {
              if (valide) {
                if (typeof window !== 'undefined' && window.RapportDB) {
                  window.RapportDB.sauverPhoto(photo.id, photo.dataUrl, 'evenement', (typeof R !== 'undefined' && R && R.id) || '');
                }
                self.maj();
              }
              self.rendre();
            }
          });
          return;
        }
        const rm = e.target.closest('[data-retirer-photo]');
        if (rm) { this.ev.photos.splice(+rm.dataset.retirerPhoto, 1); this.maj(); this.rendre(); return; }
      });

      // saisie de texte : sauvegarde à chaque frappe (rien n'est perdu)
      overlay.addEventListener('input', (e) => {
        const t = e.target;
        if (t.id === 'evTexte') {
          this.ev.texte = t.value;
          this.texteModifiePendantDictee(t.value);
          this.maj();
          return;
        }
        if (this.saisieChampFormation(t)) return;
        if (t.dataset && (t.dataset.pNom !== undefined || t.dataset.pFonction !== undefined)) {
          const pa = this.fm().participants[+(t.dataset.pNom !== undefined ? t.dataset.pNom : t.dataset.pFonction)];
          if (pa) {
            if (t.dataset.pNom !== undefined) pa.nom = t.value; else pa.fonction = t.value;
            this.maj();
          }
        }
      });

      // « Entrée » dans les champs d'ajout : ajoute le point ou le participant
      overlay.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.target.id === 'fmPoint') { e.preventDefault(); this.ajouterPoint(); }
        else if (e.target.id === 'fmNom' || e.target.id === 'fmFonction') { e.preventDefault(); this.ajouterParticipant(); }
      });

      overlay.addEventListener('change', (e) => {
        if (e.target.id === 'evCorrige') {
          this.ev.corrige = !!e.target.checked;
          this.maj();
          return;
        }
        const t = e.target;
        // date et heures : certains téléphones ne signalent le choix qu'à la fermeture du sélecteur
        if (this.saisieChampFormation(t)) return;
        if (t.dataset && (t.dataset.point || t.dataset.methode || t.dataset.doc)) {
          const f = this.fm();
          if (t.dataset.point) {
            const ref = (Report.POINTS_FORMATION || []).find(x => x.id === t.dataset.point);
            f.points = f.points.filter(x => x.id !== t.dataset.point);
            if (t.checked && ref) {
              f.points.push({ id: ref.id, libelle: ref.libelle });
              // les points gardent l'ordre de la liste type, les points ajoutés à la main à la fin
              const rang = (x) => { const k = (Report.POINTS_FORMATION || []).findIndex(r => r.id === x.id); return k < 0 ? 99 : k; };
              f.points.sort((a, b) => rang(a) - rang(b));
            }
          } else {
            const liste = t.dataset.methode ? 'methodes' : 'documents';
            const id = t.dataset.methode || t.dataset.doc;
            f[liste] = f[liste].filter(x => x !== id);
            if (t.checked) f[liste].push(id);
          }
          this.maj();
          return;
        }
        if (e.target.id === 'evMachine') {
          const val = e.target.value;
          const mach = this.machines.find(m => (m.id && m.id === val) || m.designation === val);
          if (mach) {
            this.ev.machineId = mach.id || '';
            this.ev.machineNom = mach.designation || '';
          } else {
            this.ev.machineId = '';
            this.ev.machineNom = '';
          }
          this.maj();
        }
      });

      this.rendre();
    }

    /* Champs de la formation : enregistrés à la frappe, sans redessiner l'étape
       (le clavier du téléphone reste ouvert). */
    saisieChampFormation(t) {
      const champs = { fmIntitule: 'intitule', fmFormateur: 'formateur', fmAutresDocs: 'autresDocuments',
        fmDate: 'date', fmDebut: 'debut', fmFin: 'fin' };
      if (!t || !champs[t.id]) return false;
      this.fm()[champs[t.id]] = t.value;
      if (t.id === 'fmIntitule') this.ev.heure = this.ev.heure || new Date().toISOString();
      if (t.id === 'fmDebut' || t.id === 'fmFin') this.majDuree();
      this.maj();
      return true;
    }

    toast(msg) { if (this.ctx.toast) this.ctx.toast(msg); }

    maj() { if (this.ctx.onMaj) this.ctx.onMaj(this.ev); }

    enregistrer() {
      if (this.estFormation()) {
        const f = this.fm();
        if (!Report.titreFormation(f)) { this.aller(1); this.toast('Choisissez d\'abord le ou les sujets de la formation'); return; }
        this.ev.heure = this.ev.heure || new Date().toISOString();
        this.maj();
        const b = Report.bilanFormation(this.ev);
        this.toast(b.complet ? 'Formation enregistrée : complète' : 'Formation enregistrée — reste à compléter : ' + b.manques.join(', '));
        this.fermer();
        return;
      }
      if (!this.ev.domaine) { this.aller(1); this.toast('Choisissez d\'abord le domaine'); return; }
      if (!this.ev.nature) this.ev.nature = 'constat';
      if (!this.ev.categorie) this.ev.categorie = 'INFO';
      this.ev.heure = this.ev.heure || new Date().toISOString();
      this.maj();
      this.toast(this.estTravail() ? 'Travail enregistré' : 'Constat enregistré');
      this.fermer();
    }

    async supprimer() {
      const demande = (typeof window !== 'undefined' && window.Dialogue)
        ? window.Dialogue.confirmer('Supprimer cet évènement ?', { ok: 'Supprimer', danger: true })
        : Promise.resolve(confirm('Supprimer cet évènement ?'));
      if (!(await demande)) return;
      if (this.ctx.onSupprimer) this.ctx.onSupprimer(this.ev);
      this.fermer();
    }

    fermer() {
      this.arreterDictee();
      this.overlay.remove();
      if (this.ctx.onFermer) this.ctx.onFermer(this.ev);
    }

    aller(n) {
      if (n < 1 || n > 4) return;
      // le domaine est obligatoire dès la sortie de l'étape 1 (avant : bloqué seulement à l'étape 3) ;
      // pour une formation, c'est l'intitulé
      if (n >= 2 && this.estFormation() && !this.titreFormation()) { this.toast('Choisissez d\'abord le ou les sujets de la formation'); return; }
      if (n >= 2 && !this.estFormation() && !this.ev.domaine) { this.toast('Choisissez d\'abord le domaine'); return; }
      if (this.ecoute && n !== 2) this.arreterDictee();
      this.etape = n;
      this.rendre();
    }

    /* ---------- rendu ---------- */
    /* garderPosition : on reste au même endroit de l'étape (choix d'une évaluation,
       ajout d'un participant…) au lieu de remonter en haut. */
    rendre(garderPosition) {
      const haut = this.corps.scrollTop;
      const formation = this.estFormation();
      const libelles = formation
        ? ['Formation', 'Programme', 'Participants et émargement', 'Bilan et photos']
        : ['Nature et domaine', 'Annotation', 'Photo', this.estTravail() ? 'Résultat' : 'Catégorie'];
      this.overlay.querySelector('#assistantProgres').innerHTML = [1, 2, 3, 4].map(function (i) {
        const cls = ['pas'];
        if (i < this.etape) cls.push('fait');
        if (i === this.etape) cls.push('actif');
        return `<span class="${cls.join(' ')}"></span>`;
      }, this).join('') + `<span class="pas-libelle">Étape ${this.etape}/4 — ${libelles[this.etape - 1]}</span>`;
      this.overlay.querySelector('#assistantTitre').textContent = this.libelleNature();
      this.overlay.classList.toggle('mode-formation', formation);

      const rendus = formation
        ? { 1: () => this.etapeDomaine(), 2: () => this.etapeProgramme(), 3: () => this.etapeParticipants(),
            4: () => this.etapeBilanFormation() }
        : { 1: () => this.etapeDomaine(), 2: () => this.etapeAnnotation(), 3: () => this.etapePhoto(),
            4: () => (this.estTravail() ? this.etapeResultat() : this.etapeCategorie()) };
      this.corps.innerHTML = rendus[this.etape]();

      const nav = [];
      if (this.etape > 1) nav.push('<button class="btn grey" data-a="retour">← Retour</button>');
      if (this.etape < 4) nav.push('<button class="btn" data-a="suivant">Suivant →</button>');
      else nav.push('<button class="btn or" data-a="enregistrer">' + ((window.ICO && window.ICO.check(16)) || '') + ' Terminer</button>');
      if (formation ? Report.evRenseigne(this.ev) : this.ev.domaine) nav.push('<button class="btn danger" data-a="supprimer">Supprimer</button>');
      this.overlay.querySelector('#assistantNav').innerHTML = nav.join('');
      this.corps.scrollTop = garderPosition ? haut : 0;
    }

    etapeDomaine() {
      const d = this.domaineCourant();
      const travail = this.estTravail(), formation = this.estFormation();
      const icoT = (window.ICO && window.ICO.wrench(22)) || '🔧';
      const icoC = (window.ICO && window.ICO.eye(22)) || '🔍';
      const icoF = (window.ICO && window.ICO.formation && window.ICO.formation(22)) || '🎓';
      const natures = `<p class="assistant-question">Qu'enregistrez-vous ?</p>
        <div class="natures">
          <button type="button" class="nature travail${travail ? ' on' : ''}" data-nature="travail">
            <span class="ico">${icoT}</span><span class="lib">Travail réalisé<small>ce que vous avez fait</small></span></button>
          <button type="button" class="nature constat${travail || formation ? '' : ' on'}" data-nature="constat">
            <span class="ico">${icoC}</span><span class="lib">Constat<small>ce que vous avez observé</small></span></button>
          <button type="button" class="nature formation${formation ? ' on' : ''}" data-nature="formation">
            <span class="ico">${icoF}</span><span class="lib">Formation<small>opérateurs formés : programme, évaluation, émargement</small></span></button>
        </div>`;
      if (formation) return natures + this.etapeIntitule();
      return natures + `
        <p class="assistant-question" style="margin-top:18px">Sur quel domaine ?</p>
        <div class="domaines">
          ${this.domaines().map(function (x) {
            const icoHtml = (window.ICO && window.ICO.domaine(x.id || x.icone, 22)) || '';
            return `<button type="button" class="domaine${(d && d.id === x.id) ? ' on' : ''}" data-domaine="${esc(x.id)}">
              <span class="ico">${icoHtml}</span><span class="lib">${esc(x.libelle)}</span></button>`;
          }).join('')}
        </div>
        ${d ? `<p class="assistant-note">Domaine choisi : <strong>${esc(d.libelle)}</strong></p>` : ''}`;
    }

    etapeAnnotation() {
      const dispo = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const machSelect = this.selectMachine();
      const travail = this.estTravail();
      const exemple = travail
        ? "Ex. Remplacement de la courroie d'entraînement et réglage de la tension (flèche 8 mm). Essais à vide puis en production : plus de patinage ni de bruit au démarrage."
        : "Ex. Courroie d'entraînement détendue : flèche mesurée 12 mm pour 8 mm maximum. Traces de patinage et gomme sur la poulie. Bruit caractéristique au démarrage.";
      return `<p class="assistant-question">${travail ? "Qu'avez-vous fait ?" : 'Que constatez-vous ?'}</p>
        <p class="assistant-note">Écrivez, ou touchez « Dicter » et parlez : vous pouvez faire des pauses pour réfléchir,
          la dictée continue jusqu'à ce que vous touchiez « Arrêter la dictée ».</p>
        ${machSelect}
        ${this.zoneTexte(exemple, 7)}
        ${dispo ? '' : '<p class="assistant-note">Dictée intégrée indisponible sur ce navigateur : utilisez le micro de votre clavier Android.</p>'}`;
    }

    /* Zone de texte de l'évènement, avec la dictée et la relecture vocale. */
    zoneTexte(exemple, lignes) {
      const ev = this.ev;
      const icoMic = (window.ICO && (this.ecoute ? window.ICO.stop(16) : window.ICO.mic(18))) || '';
      const icoRelire = (window.ICO && window.ICO.speaker(18)) || '';
      return `<textarea id="evTexte" class="ev-texte" rows="${lignes || 7}" placeholder="${esc(exemple)}">${esc(ev.texte || '')}</textarea>
        <div class="btnrow" style="margin-top:10px">
          <button class="btn ${this.ecoute ? 'or' : 'ghost'}" data-a="dictee">${icoMic} ${this.ecoute ? 'Arrêter la dictée' : 'Dicter'}</button>
          <button class="btn ghost" data-a="relire" ${ev.texte ? '' : 'disabled'}>${icoRelire} Relire</button>
        </div>
        ${this.ecoute ? `<p class="dictee-active"><span class="dictee-point"></span>À l'écoute — prenez votre temps, les pauses n'arrêtent pas la dictée.
          Vous pouvez aussi corriger le texte à la main pendant ce temps.</p>` : ''}
        <p class="assistant-note" style="margin-top:8px;font-size:12px;color:#64748b">💡 <em>Astuce : Vous pouvez aussi toucher le micro 🎙️ de votre clavier tactile pour dicter directement.</em></p>`;
    }

    /* Liste « Machine concernée » (seulement s'il y a des machines dans l'intervention). */
    selectMachine() {
      const ev = this.ev;
      return (this.machines.length > 0) ? `
        <div class="field" style="margin-bottom:12px">
          <label style="font-size:0.85rem;font-weight:600;color:var(--bfr-secondary,#332e72)">Machine concernée</label>
          <select id="evMachine" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bfr-border,#dbe2ea);background:var(--bfr-card-bg,#ffffff);font-size:0.95rem">
            <option value="">— Non rattaché / Toute l'installation —</option>
            ${this.machines.map(m => {
              const sel = (ev.machineId && m.id === ev.machineId) || (ev.machineNom && m.designation === ev.machineNom);
              const serie = (m.serie || '').trim();
              const nom = (m.designation || '').trim();
              const mod = (m.modele || '').trim();
              let label = '';
              if (serie && nom) label = 'N° de série : ' + serie + ' — ' + nom + (mod ? ' (' + mod + ')' : '');
              else if (serie) label = 'N° de série : ' + serie + (mod ? ' (' + mod + ')' : '');
              else label = [nom || 'Machine', mod ? '(' + mod + ')' : ''].filter(Boolean).join(' ');
              return `<option value="${esc(m.id || m.designation)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
            }).join('')}
          </select>
        </div>` : '';
    }

    /* ---------- formation des opérateurs ---------- */

    /* Étape 1 d'une formation : sujets (un ou plusieurs, proposés ou écrits) et machine. */
    etapeIntitule() {
      const f = this.fm();
      const intitules = Report.INTITULES_FORMATION || [];
      const n = f.sujets.length;
      return `<p class="assistant-question" style="margin-top:18px">Sujets de la formation</p>
        <p class="assistant-note">Touchez un ou plusieurs sujets, et ajoutez-en un autre si besoin :
          ils sont imprimés en tête de la session dans le rapport.</p>
        <div class="fm-puces">${intitules.map(t => {
          const on = f.sujets.indexOf(t) >= 0;
          return `<button type="button" class="fm-puce${on ? ' on' : ''}" data-intitule="${esc(t)}" aria-pressed="${on}">${on ? '✓ ' : ''}${esc(t)}</button>`;
        }).join('')}</div>
        <p class="fm-sujets-compte">${n ? n + ' sujet' + (n > 1 ? 's' : '') + ' choisi' + (n > 1 ? 's' : '') : 'Aucun sujet choisi'}</p>
        <div class="field">
          <label for="fmIntitule">Autre sujet ou précision (facultatif)</label>
          <input type="text" id="fmIntitule" autocomplete="off" placeholder="Ex. Gestion des bourrages en sortie de moulage" value="${esc(f.intitule)}"></div>
        ${this.selectMachine()}`;
    }

    texteDuree() {
      const f = this.fm(), m = Report.dureeFormation(f);
      if (m) return 'Durée de la session : ' + Report.texteMinutes(m);
      return f.debut && !f.fin ? 'Indiquez l\'heure de fin de la session' : '';
    }
    majDuree() {
      const el = this.overlay.querySelector('#fmDuree');
      if (el) el.textContent = this.texteDuree();
    }
    heureMaintenant(champ) {
      if (champ !== 'debut' && champ !== 'fin') return;
      const d = new Date();
      const h = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      this.fm()[champ] = h;
      const el = this.overlay.querySelector(champ === 'fin' ? '#fmFin' : '#fmDebut');
      if (el) el.value = h;
      this.majDuree();
      this.maj();
    }

    /* Étape 2 : date, horaires, formateur, programme, évaluation, documents, observations. */
    etapeProgramme() {
      const f = this.fm();
      const types = Report.POINTS_FORMATION || [];
      const coches = new Set(f.points.map(p => p.id));
      const perso = f.points.map((p, k) => ({ p: p, k: k })).filter(x => !types.some(t => t.id === x.p.id));
      const methodes = Report.METHODES_FORMATION || {}, docs = Report.DOCUMENTS_FORMATION || {};
      const coche = (attr, id, libelle, on) =>
        `<label class="fm-coche"><input type="checkbox" ${attr}="${esc(id)}" ${on ? 'checked' : ''}><span>${esc(libelle)}</span></label>`;
      return `<p class="assistant-question">Programme de la session</p>
        <div class="fm-horaires">
          <div class="field"><label>Date</label><input type="date" id="fmDate" value="${esc(f.date)}"></div>
          <div class="field"><label>Début</label><input type="time" id="fmDebut" value="${esc(f.debut)}"></div>
          <div class="field"><label>Fin</label><input type="time" id="fmFin" value="${esc(f.fin)}"></div>
        </div>
        <div class="fm-duree-ligne">
          <span id="fmDuree">${esc(this.texteDuree())}</span>
          <button type="button" class="btn sm ghost" data-a="fm-maintenant" data-champ="fin">Fin : maintenant</button>
        </div>
        <div class="field"><label>Formateur</label>
          <input type="text" id="fmFormateur" autocomplete="off" value="${esc(f.formateur)}" placeholder="Nom du formateur"></div>

        <p class="fm-titre">Points abordés</p>
        <div class="fm-coches">
          ${types.map(t => coche('data-point', t.id, t.libelle, coches.has(t.id))).join('')}
          ${perso.map(x => `<div class="fm-coche perso"><span class="fm-coche-ok">✓</span><span>${esc(x.p.libelle)}</span>
            <button type="button" class="fm-x" data-a="fm-retirer-point" data-k="${x.k}" aria-label="Retirer ce point">✕</button></div>`).join('')}
        </div>
        <div class="fm-ajout">
          <input type="text" id="fmPoint" autocomplete="off" placeholder="Autre point abordé…">
          <button type="button" class="btn sm" data-a="fm-ajouter-point">Ajouter</button>
        </div>

        <p class="fm-titre">Méthode d'évaluation</p>
        <div class="fm-coches">${Object.keys(methodes).map(id => coche('data-methode', id, methodes[id], f.methodes.indexOf(id) >= 0)).join('')}</div>

        <p class="fm-titre">Documents remis</p>
        <div class="fm-coches">${Object.keys(docs).map(id => coche('data-doc', id, docs[id], f.documents.indexOf(id) >= 0)).join('')}</div>
        <div class="field" style="margin-top:8px">
          <input type="text" id="fmAutresDocs" autocomplete="off" value="${esc(f.autresDocuments)}" placeholder="Autre document remis (facultatif)"></div>

        <p class="fm-titre">Contenu et observations <small>(facultatif)</small></p>
        ${this.zoneTexte("Ex. Équipe du matin, ligne 2 : démarrage, changement de moule 450 g, gestion des bourrages. Chaque opérateur a réalisé un changement de format seul.", 4)}`;
    }

    ajouterPoint() {
      const el = this.overlay.querySelector('#fmPoint');
      const libelle = valeur(el && el.value);
      if (!libelle) { this.toast('Écrivez le point abordé'); if (el) el.focus(); return; }
      this.fm().points.push({ id: nouvelId('pt'), libelle: libelle });
      this.maj(); this.rendre(true);
      const champ = this.overlay.querySelector('#fmPoint');
      if (champ) champ.focus();
    }

    /* Étape 3 : participants, évaluation et signature de chacun. */
    etapeParticipants() {
      const f = this.fm();
      const ps = f.participants;
      const fonctions = Report.FONCTIONS_OPERATEUR || [];
      const derniere = (ps.length && valeur(ps[ps.length - 1].fonction)) || 'Opérateur';
      const autres = (this.ctx.autresFormations ? this.ctx.autresFormations(this.ev) : [])
        .filter(x => x.participants.length);
      const b = Report.bilanFormation(this.ev);
      const ico = (n, sz) => (window.ICO && window.ICO[n] && window.ICO[n](sz)) || '';
      return `<p class="assistant-question">Participants et émargement</p>
        <p class="assistant-note">Ajoutez chaque opérateur formé, indiquez s'il a acquis la formation, puis faites-le
          signer du doigt : c'est la feuille d'émargement du rapport.</p>
        <div class="fm-ajout-participant">
          <div class="field"><label>Nom et prénom</label>
            <input type="text" id="fmNom" autocomplete="off" autocapitalize="words" placeholder="Ex. Julie MARTIN"></div>
          <div class="field"><label>Fonction / poste</label>
            <input type="text" id="fmFonction" autocomplete="off" value="${esc(derniere)}"></div>
          <div class="fm-puces petites">${fonctions.map(x =>
            `<button type="button" class="fm-puce${x === derniere ? ' on' : ''}" data-fonction="${esc(x)}">${esc(x)}</button>`).join('')}</div>
          <button type="button" class="btn wide" data-a="fm-ajouter">${ico('plus', 16)} Ajouter le participant</button>
        </div>
        ${autres.map(x => `<button type="button" class="btn ghost wide fm-reprendre" data-a="fm-reprendre" data-source="${esc(x.id)}">
          ${ico('users', 16)} Reprendre ${x.participants.length > 1 ? 'les ' + x.participants.length + ' participants' : 'le participant'} de « ${esc(x.intitule || 'Formation')} »</button>`).join('')}
        <div class="fm-entete-liste">
          <strong>${b.n} participant${b.n > 1 ? 's' : ''}</strong>
          <span>${b.evalues}/${b.n} évalué${b.evalues > 1 ? 's' : ''} · ${b.signes}/${b.n} signé${b.signes > 1 ? 's' : ''}</span>
        </div>
        <div class="fm-participants">
          ${ps.map((p, k) => this.carteParticipant(p, k)).join('') || '<p class="assistant-note">Aucun participant pour l\'instant.</p>'}
        </div>
        ${ps.length ? `<div class="btnrow fm-actions">
          <button type="button" class="btn ghost" data-a="fm-tous-acquis">Non évalués → Acquis</button>
          <button type="button" class="btn or" data-a="fm-signer-tous">${ico('signature', 16)} Faire signer à la suite</button>
        </div>` : ''}`;
    }

    carteParticipant(p, k) {
      const evals = Report.EVALUATIONS || {};
      const signe = Report.participantSigne(p);
      return `<div class="fm-participant${signe ? ' signe' : ''}" data-participant="${k}">
          <div class="fm-p-tete">
            <span class="fm-p-num">${k + 1}</span>
            <input type="text" class="fm-p-nom" data-p-nom="${k}" value="${esc(p.nom)}" aria-label="Nom et prénom" autocomplete="off">
            <button type="button" class="fm-x" data-a="fm-retirer" data-p="${k}" aria-label="Retirer ce participant">✕</button>
          </div>
          <input type="text" class="fm-p-fonction" data-p-fonction="${k}" value="${esc(p.fonction)}" placeholder="Fonction / poste" aria-label="Fonction / poste" autocomplete="off">
          <div class="fm-evals">${Object.keys(evals).map(id =>
            `<button type="button" class="fm-eval${p.evaluation === id ? ' on' : ''}" data-eval="${id}" data-p="${k}"
              style="--c:${evals[id].couleur};--f:${evals[id].fond}">${esc(evals[id].libelle)}</button>`).join('')}</div>
          <div class="fm-sig">
            ${valeur(p.signature) ? `<img src="${esc(p.signature)}" alt="Signature de ${esc(p.nom)}">`
              : `<span class="fm-sig-vide">${signe ? 'Signé' : 'Pas encore signé'}</span>`}
            <button type="button" class="btn sm ${signe ? 'grey' : 'or'}" data-a="fm-signer" data-p="${k}">${signe ? 'Refaire signer' : 'Faire signer'}</button>
          </div>
        </div>`;
    }

    ajouterParticipant() {
      const nomEl = this.overlay.querySelector('#fmNom'), fctEl = this.overlay.querySelector('#fmFonction');
      const nom = valeur(nomEl && nomEl.value);
      if (!nom) { this.toast('Indiquez le nom du participant'); if (nomEl) nomEl.focus(); return; }
      const f = this.fm();
      if (f.participants.some(p => valeur(p.nom).toLowerCase() === nom.toLowerCase())) {
        this.toast(nom + ' est déjà dans la liste');
        return;
      }
      f.participants.push({ id: nouvelId('pa'), nom: nom, fonction: valeur(fctEl && fctEl.value), evaluation: '', signature: '', signeA: '' });
      this.maj(); this.rendre(true);
      const champ = this.overlay.querySelector('#fmNom');
      if (champ) champ.focus();
      this.toast('Participant ajouté : ' + nom);
    }

    async retirerParticipant(k) {
      const ps = this.fm().participants, p = ps[k];
      if (!p) return;
      if (Report.participantSigne(p) || valeur(p.nom)) {
        const question = 'Retirer ' + (valeur(p.nom) || 'ce participant') + ' de la formation' + (Report.participantSigne(p) ? ' (sa signature sera effacée)' : '') + ' ?';
        const oui = (typeof window !== 'undefined' && window.Dialogue)
          ? await window.Dialogue.confirmer(question, { ok: 'Retirer', danger: true })
          : confirm(question);
        if (!oui) return;
      }
      ps.splice(k, 1);
      this.maj(); this.rendre(true);
    }

    reprendreParticipants(source) {
      const autres = this.ctx.autresFormations ? this.ctx.autresFormations(this.ev) : [];
      const src = autres.find(x => x.id === source);
      if (!src) return;
      const f = this.fm();
      const deja = new Set(f.participants.map(p => valeur(p.nom).toLowerCase()));
      let n = 0;
      src.participants.forEach(p => {
        if (!valeur(p.nom) || deja.has(valeur(p.nom).toLowerCase())) return;
        // nouvelle session : ni évaluation ni signature reprises
        f.participants.push({ id: nouvelId('pa'), nom: valeur(p.nom), fonction: valeur(p.fonction), evaluation: '', signature: '', signeA: '' });
        n++;
      });
      this.maj(); this.rendre(true);
      this.toast(n ? n + ' participant(s) repris' : 'Ces participants sont déjà dans la liste');
    }

    tousAcquis() {
      let n = 0;
      this.fm().participants.forEach(p => { if (valeur(p.nom) && !p.evaluation) { p.evaluation = 'acquis'; n++; } });
      this.maj(); this.rendre(true);
      this.toast(n ? n + ' participant(s) évalué(s) « Acquis »' : 'Tous les participants sont déjà évalués');
    }

    /* Signature d'un participant (émargement), recueillie sur l'écran. */
    async signerParticipant(k) {
      const f = this.fm(), pa = f.participants[k];
      if (!pa || !valeur(pa.nom)) { this.toast('Indiquez d\'abord le nom du participant'); return false; }
      if (!this.ctx.signer) { this.toast('Signature indisponible'); return false; }
      const dataUrl = await this.ctx.signer({
        titre: 'Émargement',
        nom: pa.nom, fonction: pa.fonction,
        mention: 'J\'atteste avoir suivi la formation « ' + (this.titreFormation() || 'Formation') + ' »' +
          (f.date ? ' du ' + Report.frDate(f.date) : '') + '.',
        suivant: k
      });
      if (!dataUrl) return false;
      pa.signature = dataUrl;
      pa.signeA = new Date().toISOString();
      this.maj(); this.rendre(true);
      return true;
    }

    async signerTous() {
      const ps = this.fm().participants;
      const restants = ps.map((p, k) => k).filter(k => valeur(ps[k].nom) && !Report.participantSigne(ps[k]));
      if (!restants.length) { this.toast('Tous les participants ont signé'); return; }
      for (const k of restants) {
        if (!(await this.signerParticipant(k))) break;
      }
      const b = Report.bilanFormation(this.ev);
      if (b.n && b.signes === b.n) this.toast('Émargement complet : ' + b.signes + '/' + b.n);
    }

    /* Étape 4 : ce qui manque pour valider la formation, puis les photos. */
    etapeBilanFormation() {
      const b = Report.bilanFormation(this.ev), f = b.f;
      const marque = (ok) => ok ? '<span class="fm-ok">✓</span>' : '<span class="fm-ko">!</span>';
      const lignes = [
        [1, f.sujets.length + (f.intitule ? 1 : 0) > 1 ? 'Sujets' : 'Sujet', f.titre || '—', !!f.titre],
        [2, 'Date et horaires', [Report.frDate(f.date), [f.debut, f.fin].filter(Boolean).join(' - ')].filter(Boolean).join(', ') || '—', !!(f.debut && f.fin)],
        [2, 'Programme', f.points.length ? f.points.length + ' point(s) abordé(s)' : 'aucun point coché', f.points.length > 0],
        [2, "Méthode d'évaluation", f.methodes.map(m => (Report.METHODES_FORMATION || {})[m]).join(', ') || 'non indiquée', f.methodes.length > 0],
        [3, 'Participants', b.n ? String(b.n) : 'aucun', b.n > 0],
        [3, 'Évaluations', b.evalues + '/' + b.n, b.n > 0 && b.evalues === b.n],
        [3, 'Émargement (signatures)', b.signes + '/' + b.n, b.n > 0 && b.signes === b.n]
      ];
      const statut = b.complet
        ? `<div class="fm-statut ok">${(window.ICO && window.ICO.checkCircle && window.ICO.checkCircle(22)) || '✓'}
             <div><strong>Formation complète</strong><small>Elle sera validée par la signature du client en fin de rapport.</small></div></div>`
        : `<div class="fm-statut ko"><div><strong>À compléter pour valider la formation</strong><small>${esc(b.manques.join(', '))}</small></div></div>`;
      return `<p class="assistant-question">Bilan de la formation</p>
        ${statut}
        <div class="ev-recap fm-bilan">${lignes.map(l =>
          `<button type="button" class="ev-recap-ligne fm-bilan-ligne" data-a="fm-aller" data-etape="${l[0]}">
             <span>${marque(l[3])} ${esc(l[1])}</span><strong>${esc(l[2])}</strong></button>`).join('')}</div>
        <div style="margin-top:20px">${this.etapePhoto('Photos de la session', 'Facultatif : une photo de la session sur la machine complète la preuve de formation.')}</div>`;
    }

    etapePhoto(titre, note) {
      const ev = this.ev;
      const icoCamera = (window.ICO && window.ICO.camera(18)) || '';
      const icoGallery = (window.ICO && window.ICO.image(18)) || '';
      const icoPen = (window.ICO && window.ICO.pen(14)) || '';
      const icoRm = (window.ICO && window.ICO.close(16)) || '✕';
      return `<p class="assistant-question">${esc(titre || 'Ajouter une photo')}</p>
        <p class="assistant-note">${esc(note || 'Prenez la photo puis annotez-la au doigt (flèche, cercle, texte) pour montrer précisément la zone concernée.')}</p>
        <div class="btnrow">
          <button class="btn" data-a="photo">${icoCamera} Prendre une photo</button>
          <button class="btn ghost" data-a="photo-lib">${icoGallery} Galerie</button>
        </div>
        <input type="file" id="evPhotoInput" accept="image/*" capture="environment" hidden>
        <input type="file" id="evPhotoLib" accept="image/*" multiple hidden>
        <div class="ev-photos">
          ${(ev.photos || []).map(function (p, i) {
            return `<div class="ev-photo">
              <img src="${p.dataUrl}" alt="photo ${i + 1}">
              <button type="button" class="ev-photo-annot" data-annot="${i}">${icoPen} Annoter</button>
              <button type="button" class="ev-photo-rm" data-retirer-photo="${i}">${icoRm}</button>
              ${(p.annotations && p.annotations.length) ? '<span class="ev-photo-badge">annotée</span>' : ''}
            </div>`;
          }).join('') || '<p class="assistant-note">Aucune photo pour l\'instant — vous pouvez continuer sans photo.</p>'}
        </div>`;
    }

    /* Étape 4 d'un travail réalisé : le résultat obtenu. */
    etapeResultat() {
      const choisi = this.ev.resultat;
      const checkHtml = (window.ICO && window.ICO.check(18)) || '✔';
      return `<p class="assistant-question">Quel est le résultat ?</p>
        <p class="assistant-note">Le travail apparaît dans la partie « Travaux réalisés » du rapport, avec ce résultat.
          <strong>Terminé</strong> pour un travail prévu ; <strong>Résolu</strong>, <strong>Partiellement résolu</strong> ou <strong>À surveiller</strong> pour un dépannage.</p>
        <div class="categories">
          ${RESULTATS.map(function (r) {
            return `<button type="button" class="categorie${choisi === r.id ? ' on' : ''}" data-resultat="${r.id}"
              style="--c:${r.couleur};--f:${r.fond}">
              <span class="lib">${esc(r.libelle)}<small class="sous">${esc(r.note)}</small></span>
              <span class="fleche">${choisi === r.id ? checkHtml : '›'}</span></button>`;
          }).join('')}
        </div>
        ${this.recap()}`;
    }

    recap() {
      return `<div class="ev-recap">
          <div class="ev-recap-ligne"><span>Nature</span><strong>${this.estTravail() ? 'Travail réalisé' : 'Constat'}</strong></div>
          <div class="ev-recap-ligne"><span>Domaine</span><strong>${esc(this.libelleDomaine())}</strong></div>
          ${this.ev.machineNom ? `<div class="ev-recap-ligne"><span>Machine</span><strong>${esc(this.ev.machineNom)}</strong></div>` : ''}
          <div class="ev-recap-ligne"><span>Annotation</span><strong>${this.ev.texte ? this.ev.texte.length + ' caractère(s)' : 'vide'}</strong></div>
          <div class="ev-recap-ligne"><span>Photos</span><strong>${(this.ev.photos || []).length}</strong></div>
        </div>`;
    }

    etapeCategorie() {
      const cats = this.categories(), choisi = this.ev.categorie;
      return `<p class="assistant-question">Comment qualifier ce constat ?</p>
        <p class="assistant-note">Cette catégorie détermine la place du constat dans le rapport : les problèmes de sécurité et les urgences apparaissent en premier.</p>
        <label class="corrige-case">
          <input type="checkbox" id="evCorrige" ${this.ev.corrige ? 'checked' : ''}>
          <span><strong>Corrigé sur place</strong><small>le défaut a été corrigé pendant l'intervention</small></span>
        </label>
        <div class="categories">
          ${cats.map(function (c) {
            const icoHtml = (window.ICO && window.ICO.categorie(c.id || c.icone, 20)) || '';
            const checkHtml = (window.ICO && window.ICO.check(18)) || '✔';
            return `<button type="button" class="categorie${choisi === c.id ? ' on' : ''}" data-categorie="${esc(c.id)}"
              style="--c:${c.couleur};--f:${c.fond}">
              <span class="ico">${icoHtml}</span>
              <span class="lib">${esc(c.libelle)}</span>
              <span class="fleche">${choisi === c.id ? checkHtml : '›'}</span></button>`;
          }).join('')}
        </div>
        ${this.recap()}`;
    }

    domaineCourant() { return this.domaines().find(x => x.id === this.ev.domaine); }
    libelleDomaine() { const d = this.domaineCourant(); return d ? d.libelle : '—'; }

    /* ---------- photo ---------- */
    prendrePhoto() { this.choisirFichier('#evPhotoInput', false); }
    photoBibliotheque() { this.choisirFichier('#evPhotoLib', true); }

    choisirFichier(selecteur, multiple) {
      const input = this.overlay.querySelector(selecteur);
      input.multiple = multiple;
      input.value = '';
      const self = this;
      input.onchange = async function () {
        const fichiers = Array.prototype.slice.call(input.files || []);
        if (!fichiers.length) return;
        for (const f of fichiers) {
          if ((self.ev.photos || []).length >= 4) { self.toast('4 photos maximum par évènement'); break; }
          try {
            const dataUrl = await self.compresser(f, 1600, 0.82);
            const photo = { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), dataUrl: dataUrl, annotations: [] };
            self.ev.photos = self.ev.photos || [];
            self.ev.photos.push(photo);
            if (typeof window !== 'undefined' && window.RapportDB) {
              window.RapportDB.sauverPhoto(photo.id, dataUrl, 'evenement', (typeof R !== 'undefined' && R && R.id) || '');
            }
            self.maj();
            // on enchaîne directement sur l'annotation de la photo qui vient d'être prise
            await new Promise(function (resolve) {
              Annotation.ouvrir(photo, {
                fin: function (valide) {
                  if (valide) {
                    if (typeof window !== 'undefined' && window.RapportDB) {
                      window.RapportDB.sauverPhoto(photo.id, photo.dataUrl, 'evenement', (typeof R !== 'undefined' && R && R.id) || '');
                    }
                    self.maj();
                  }
                  resolve();
                }
              });
            });
          } catch (e) { self.toast('Photo ignorée (format non pris en charge)'); }
        }
        self.rendre();
      };
      input.click();
    }

    compresser(file, maxDim, q) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
          const img = new Image();
          img.onload = function () {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', q));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    /* ---------- assainissement anti-bégaiement & anti-doublons ---------- */
    static normaliserDictee(t) {
      return (t || '').replace(/\s+/g, ' ').trim();
    }

    static cleDictee(t) {
      return Assistant.normaliserDictee(t).replace(/[^a-z0-9à-ÿ]/gi, '').toLowerCase();
    }

    /* Détecte si la fin de 'last' chevauche le début de 'next' (1 à N mots) et les fusionne */
    static fusionnerChevauchement(last, next) {
      const w1 = (last || '').trim().split(/\s+/).filter(Boolean);
      const w2 = (next || '').trim().split(/\s+/).filter(Boolean);
      const maxK = Math.min(w1.length, w2.length);
      for (let k = maxK; k >= 1; k--) {
        const tail = w1.slice(-k).map(w => w.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')).join(' ');
        const head = w2.slice(0, k).map(w => w.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')).join(' ');
        if (tail && head && tail === head) {
          return w1.concat(w2.slice(k)).join(' ');
        }
      }
      return null;
    }

    /* Fusionne les hypothèses successives émises par Android (évite la duplication de préfixes) */
    static mergeFinalHypotheses(committed, nextRaw) {
      const next = Assistant.normaliserDictee(nextRaw);
      if (!next) return committed;
      if (!committed || committed.length === 0) return [next];

      const last = committed[committed.length - 1];
      if (!last) return [...committed.slice(0, -1), next];

      const lastKey = Assistant.cleDictee(last);
      const nextKey = Assistant.cleDictee(next);

      // Doublon exact ou préfixe croissant émis par Android
      if (nextKey === lastKey) return committed;
      if (nextKey.startsWith(lastKey)) return [...committed.slice(0, -1), next];
      if (lastKey.startsWith(nextKey)) return committed;

      // Chevauchement de mots aux limites
      const chev = Assistant.fusionnerChevauchement(last, next);
      if (chev) {
        return [...committed.slice(0, -1), chev];
      }

      return [...committed, next];
    }

    /* Élimine les répétitions consécutives de mots ou de groupes de mots (bégaiement Android) */
    static eliminerRepetitionsConsecutives(texte) {
      if (!texte) return '';
      const mots = texte.trim().split(/\s+/).filter(Boolean);
      if (mots.length <= 1) return texte;

      let resultat = [...mots];
      let change = true;
      while (change) {
        change = false;
        for (let k = Math.min(8, Math.floor(resultat.length / 2)); k >= 1; k--) {
          for (let i = 0; i <= resultat.length - 2 * k; i++) {
            const seq1 = resultat.slice(i, i + k).map(w => w.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')).join(' ');
            const seq2 = resultat.slice(i + k, i + 2 * k).map(w => w.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')).join(' ');
            if (seq1 && seq2 && seq1 === seq2) {
              resultat.splice(i + k, k);
              change = true;
              break;
            }
          }
          if (change) break;
        }
      }
      return resultat.join(' ');
    }

    /* Ponctuation vocale en français sans casser les termes techniques ('point de consigne') */
    static appliquerPonctuationVocale(texte) {
      if (!texte) return '';
      return texte
        .replace(/\bpoint à la ligne\b/gi, '.\n')
        .replace(/\bà la ligne\b/gi, '\n')
        .replace(/\bretour à la ligne\b/gi, '\n')
        .replace(/\bpoint d'interrogation\b/gi, '?')
        .replace(/\bpoint d'exclamation\b/gi, '!')
        .replace(/\bdeux points\b/gi, ':')
        .replace(/\bvirgule\b/gi, ',')
        .replace(/\bpoint\b(?!\s+(?:de|d'|dur|mort|chaud|singulier|clef|fixe|zéro|central))/gi, '.')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/([.!?]\s+)([a-zà-ÿ])/g, function (m, p1, p2) {
          return p1 + p2.toUpperCase();
        });
    }

    /* Fusionne la session de dictée avec le texte qui existait déjà dans le champ */
    static fusionnerAvecBase(base, session) {
      const b = (base || '').trim();
      const s = (session || '').trim();
      if (!b) return s;
      if (!s) return b;

      const keyB = Assistant.cleDictee(b);
      const keyS = Assistant.cleDictee(s);

      if (keyS.startsWith(keyB)) return s;
      if (keyB.startsWith(keyS)) return b;

      const chev = Assistant.fusionnerChevauchement(b, s);
      if (chev) return chev;

      const sep = (/[.!?]$/.test(b) || /\n$/.test(b)) ? ' ' : ' ';
      return b + sep + s;
    }

    /* ---------- dictée / relecture ----------
       La dictée reste active jusqu'à ce qu'on touche « Arrêter la dictée ».
       Le moteur de reconnaissance du navigateur, lui, s'arrête tout seul après
       quelques secondes de silence : on le relance aussitôt, sans perdre le texte,
       pour laisser le temps de réfléchir entre deux phrases.
       Garde-fous : arrêt définitif si le micro est refusé ou absent, si les
       relances échouent en boucle, en quittant l'étape Annotation, ou après
       3 minutes sans aucune parole (téléphone oublié dans la poche). */
    basculerDictee() {
      if (this.ecoute) { this.arreterDictee(); this.rendre(); this.toast('Dictée arrêtée'); return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { this.toast('Dictée non disponible : utilisez le micro du clavier'); return; }
      this.ecoute = true;
      this.echecsRelance = 0;
      this.derniereParole = Date.now();
      if (!this.demarrerSession(SR)) { this.ecoute = false; this.toast('Micro indisponible'); return; }
      this.surveillerSilence();
      this.toast('Dictée en cours — touchez « Arrêter la dictée » quand vous avez fini');
      this.rendre();
    }

    /* Une session de reconnaissance, de son démarrage jusqu'à son arrêt par le
       navigateur (silence) ou par le technicien. */
    demarrerSession(SR) {
      const { normaliserDictee, mergeFinalHypotheses, fusionnerChevauchement, eliminerRepetitionsConsecutives, appliquerPonctuationVocale, fusionnerAvecBase } = Assistant;
      const self = this;
      const rec = new SR();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = true;
      /* base : texte du champ au début de la session (ou après une correction à la
         main) ; debut : premier résultat de la session à prendre en compte. */
      const session = { base: (self.ev.texte || '').trim(), debut: 0, finals: [], vus: 0, entendu: false, depart: Date.now() };

      rec.onresult = function (e) {
        // résultats d'une session remplacée : ignorés (les derniers mots d'une
        // session qu'on vient d'arrêter sont, eux, encore acceptés)
        if (!e || !e.results || (self.reconnaissance !== rec && self.recArretee !== rec)) return;
        session.vus = e.results.length;

        let interimTexte = '';
        const start = Math.max(session.debut, e.resultIndex || 0);

        for (let i = session.debut; i < e.results.length; i++) {
          const res = e.results[i];
          const morceau = (res[0] && res[0].transcript) || '';
          const txtNormalise = normaliserDictee(morceau);
          if (!txtNormalise) continue;

          if (res.isFinal) {
            session.finals[i] = txtNormalise;
          } else if (i >= start) {
            interimTexte = txtNormalise;
          }
        }
        session.entendu = true;
        self.derniereParole = Date.now();

        let committed = [];
        for (let i = 0; i < session.finals.length; i++) {
          const piece = session.finals[i];
          if (!piece) continue;
          committed = mergeFinalHypotheses(committed, piece);
        }
        let texteCommitted = committed.join(' ').replace(/\s+/g, ' ').trim();

        let sessionTexte = texteCommitted;
        if (interimTexte) {
          const interimNorm = normaliserDictee(interimTexte);
          if (texteCommitted) {
            const chevInterim = fusionnerChevauchement(texteCommitted, interimNorm);
            if (chevInterim) {
              sessionTexte = chevInterim;
            } else if (interimNorm.toLowerCase().startsWith(texteCommitted.toLowerCase())) {
              sessionTexte = interimNorm;
            } else if (!texteCommitted.toLowerCase().endsWith(interimNorm.toLowerCase())) {
              sessionTexte = texteCommitted + ' ' + interimNorm;
            }
          } else {
            sessionTexte = interimNorm;
          }
        }

        // Élimination des répétitions consécutives de mots ou groupes de mots (bégaiement Android)
        sessionTexte = eliminerRepetitionsConsecutives(sessionTexte);

        // Ponctuation vocale en français
        sessionTexte = appliquerPonctuationVocale(sessionTexte);

        // Fusion sans doublon avec le texte qui existait déjà dans le champ
        const texteTotal = fusionnerAvecBase(session.base, sessionTexte);

        self.ev.texte = texteTotal;
        const champ = (self.corps && self.corps.querySelector('#evTexte')) || document.querySelector('#evTexte');
        if (champ) {
          champ.value = texteTotal;
          champ.scrollTop = champ.scrollHeight;
        }
        self.maj();
      };

      rec.onerror = function (err) {
        const code = err && err.error;
        // silence ou arrêt volontaire : la relance (ou non) se fait dans onend
        if (!code || code === 'no-speech' || code === 'aborted') return;
        const definitif = {
          'not-allowed': 'Micro refusé : autorisez le micro pour ce site dans les réglages du navigateur',
          'service-not-allowed': 'Dictée refusée par le téléphone : utilisez le micro du clavier',
          'audio-capture': 'Aucun micro disponible',
          'network': 'Dictée impossible sans réseau : utilisez le micro du clavier'
        }[code];
        if (definitif && self.reconnaissance === rec) {
          self.arreterDictee();
          if (self.overlay.isConnected) self.rendre();
          self.toast(definitif);
        }
        // autres erreurs : onend relance, dans la limite des échecs autorisés
      };

      rec.onend = function () {
        if (self.reconnaissance !== rec || !self.ecoute) return;   // arrêt voulu ou session remplacée
        // une session qui s'arrête aussitôt sans rien entendre = relance qui échoue
        const avortee = !session.entendu && (Date.now() - session.depart) < 1500;
        self.echecsRelance = avortee ? (self.echecsRelance || 0) + 1 : 0;
        const enPause = function () {
          self.arreterDictee();
          if (self.overlay.isConnected) self.rendre();
          self.toast('Dictée en pause — touchez « Dicter » pour reprendre');
        };
        if (self.echecsRelance >= 4) { enPause(); return; }
        setTimeout(function () {
          if (!self.ecoute || self.reconnaissance !== rec) return;
          if (!self.demarrerSession(SR)) enPause();
        }, avortee ? 600 : 120);
      };

      this.reconnaissance = rec;
      this.session = session;
      try {
        rec.start();
      } catch (e) {
        this.reconnaissance = null;
        this.session = null;
        return false;
      }
      return true;
    }

    /* Correction à la main pendant la dictée : le texte du champ devient la nouvelle
       base, et seuls les mots dictés ensuite s'y ajoutent. */
    texteModifiePendantDictee(valeur) {
      const s = this.session;
      if (!this.ecoute || !s) return;
      s.base = String(valeur || '').trim();
      s.debut = s.vus;
      s.finals = [];
    }

    /* Coupe la dictée après 3 minutes sans aucune parole. */
    surveillerSilence() {
      clearInterval(this.minuterieSilence);
      this.minuterieSilence = setInterval(() => {
        if (!this.ecoute) { clearInterval(this.minuterieSilence); return; }
        if (Date.now() - (this.derniereParole || 0) > 180000) {
          this.arreterDictee();
          if (this.overlay.isConnected) this.rendre();
          this.toast('Dictée arrêtée après 3 minutes sans parole');
        }
      }, 10000);
    }

    arreterDictee() {
      this.ecoute = false;            // d'abord : empêche toute relance automatique
      clearInterval(this.minuterieSilence);
      const rec = this.reconnaissance;
      this.reconnaissance = null;
      this.recArretee = rec || null;   // ses derniers mots peuvent encore arriver
      this.session = null;
      if (rec) { try { rec.stop(); } catch (e) {} }
    }

    relire() {
      if (!this.ev.texte) { this.toast('Rien à relire'); return; }
      if (!('speechSynthesis' in window)) { this.toast('Relecture vocale indisponible'); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(this.ev.texte);
      u.lang = 'fr-FR';
      u.rate = 1;
      window.speechSynthesis.speak(u);
      this.toast('Relecture vocale…');
    }
  }

  global.Assistant = {
    ouvrir: function (evenement, ctx) { return new Assistant(evenement, ctx); },
    nouvelEvenement: function (opts) {
      opts = opts || {};
      // « travail » (travail réalisé), « constat » (observation avec priorité)
      // ou « formation » (session de formation des opérateurs)
      const nature = ['travail', 'formation'].indexOf(opts.nature) >= 0 ? opts.nature : 'constat';
      const ev = {
        id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
        domaine: opts.domaine || '',
        texte: opts.texte || '',
        photos: opts.photos || [],
        categorie: opts.categorie || '',
        nature: nature,
        resultat: '',
        corrige: false,
        heure: new Date().toISOString(),
        machineId: opts.machineId || '',
        machineNom: opts.machineNom || ''
      };
      if (nature === 'formation') ev.formation = Report.nouvelleFormation({ formateur: opts.formateur || '' });
      return ev;
    }
  };
})(window);
