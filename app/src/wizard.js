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
   L'évènement est enregistré dès la première étape et reste modifiable :
   on peut rouvrir l'assistant à tout moment, rien n'est perdu.
   ========================================================================= */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
         choisi (c'est ce qu'on corrige le plus souvent) ; « ← Retour » ramène au domaine. */
      this.etape = evenement.domaine ? 2 : 1;
      this.reconnaissance = null;
      this.ecoute = false;
      this.ouvrir();
    }

    domaines() { return this.S.domaines || []; }
    categories() { return this.S.categories || []; }
    estTravail() { return this.ev.nature === 'travail'; }

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
          return;
        }
        const n = e.target.closest('[data-nature]');
        if (n) {
          this.ev.nature = n.dataset.nature;
          this.maj(); this.rendre();
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
        if (e.target.id === 'evTexte') {
          this.ev.texte = e.target.value;
          this.texteModifiePendantDictee(e.target.value);
          this.maj();
        }
      });

      overlay.addEventListener('change', (e) => {
        if (e.target.id === 'evCorrige') {
          this.ev.corrige = !!e.target.checked;
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

    toast(msg) { if (this.ctx.toast) this.ctx.toast(msg); }

    maj() { if (this.ctx.onMaj) this.ctx.onMaj(this.ev); }

    enregistrer() {
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
      // le domaine est obligatoire dès la sortie de l'étape 1 (avant : bloqué seulement à l'étape 3)
      if (n >= 2 && !this.ev.domaine) { this.toast('Choisissez d\'abord le domaine'); return; }
      if (this.ecoute && n !== 2) this.arreterDictee();
      this.etape = n;
      this.rendre();
    }

    /* ---------- rendu ---------- */
    rendre() {
      this.overlay.querySelector('#assistantProgres').innerHTML = [1, 2, 3, 4].map(function (i) {
        const cls = ['pas'];
        if (i < this.etape) cls.push('fait');
        if (i === this.etape) cls.push('actif');
        return `<span class="${cls.join(' ')}"></span>`;
      }, this).join('') + `<span class="pas-libelle">Étape ${this.etape}/4 — ${
        ['Nature et domaine', 'Annotation', 'Photo', this.estTravail() ? 'Résultat' : 'Catégorie'][this.etape - 1]}</span>`;
      this.overlay.querySelector('#assistantTitre').textContent = this.estTravail() ? 'Travail réalisé' : 'Constat';

      const rendus = { 1: () => this.etapeDomaine(), 2: () => this.etapeAnnotation(), 3: () => this.etapePhoto(),
        4: () => (this.estTravail() ? this.etapeResultat() : this.etapeCategorie()) };
      this.corps.innerHTML = rendus[this.etape]();

      const nav = [];
      if (this.etape > 1) nav.push('<button class="btn grey" data-a="retour">← Retour</button>');
      if (this.etape < 4) nav.push('<button class="btn" data-a="suivant">Suivant →</button>');
      else nav.push('<button class="btn or" data-a="enregistrer">' + ((window.ICO && window.ICO.check(16)) || '') + ' Terminer</button>');
      if (this.ev.domaine) nav.push('<button class="btn danger" data-a="supprimer">Supprimer</button>');
      this.overlay.querySelector('#assistantNav').innerHTML = nav.join('');
      this.corps.scrollTop = 0;
    }

    etapeDomaine() {
      const d = this.domaineCourant();
      const travail = this.estTravail();
      const icoT = (window.ICO && window.ICO.wrench(22)) || '🔧';
      const icoC = (window.ICO && window.ICO.eye(22)) || '🔍';
      return `<p class="assistant-question">Qu'enregistrez-vous ?</p>
        <div class="natures">
          <button type="button" class="nature travail${travail ? ' on' : ''}" data-nature="travail">
            <span class="ico">${icoT}</span><span class="lib">Travail réalisé<small>ce que vous avez fait</small></span></button>
          <button type="button" class="nature constat${travail ? '' : ' on'}" data-nature="constat">
            <span class="ico">${icoC}</span><span class="lib">Constat<small>ce que vous avez observé</small></span></button>
        </div>
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
      const ev = this.ev;
      const dispo = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const icoMic = (window.ICO && (this.ecoute ? window.ICO.stop(16) : window.ICO.mic(18))) || '';
      const icoRelire = (window.ICO && window.ICO.speaker(18)) || '';
      const machSelect = (this.machines.length > 0) ? `
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
      const travail = this.estTravail();
      const exemple = travail
        ? "Ex. Remplacement de la courroie d'entraînement et réglage de la tension (flèche 8 mm). Essais à vide puis en production : plus de patinage ni de bruit au démarrage."
        : "Ex. Courroie d'entraînement détendue : flèche mesurée 12 mm pour 8 mm maximum. Traces de patinage et gomme sur la poulie. Bruit caractéristique au démarrage.";
      return `<p class="assistant-question">${travail ? "Qu'avez-vous fait ?" : 'Que constatez-vous ?'}</p>
        <p class="assistant-note">Écrivez, ou touchez « Dicter » et parlez : vous pouvez faire des pauses pour réfléchir,
          la dictée continue jusqu'à ce que vous touchiez « Arrêter la dictée ».</p>
        ${machSelect}
        <textarea id="evTexte" class="ev-texte" rows="7" placeholder="${esc(exemple)}">${esc(ev.texte || '')}</textarea>
        <div class="btnrow" style="margin-top:10px">
          <button class="btn ${this.ecoute ? 'or' : 'ghost'}" data-a="dictee">${icoMic} ${this.ecoute ? 'Arrêter la dictée' : 'Dicter'}</button>
          <button class="btn ghost" data-a="relire" ${ev.texte ? '' : 'disabled'}>${icoRelire} Relire</button>
        </div>
        ${this.ecoute ? `<p class="dictee-active"><span class="dictee-point"></span>À l'écoute — prenez votre temps, les pauses n'arrêtent pas la dictée.
          Vous pouvez aussi corriger le texte à la main pendant ce temps.</p>` : ''}
        <p class="assistant-note" style="margin-top:8px;font-size:12px;color:#64748b">💡 <em>Astuce : Vous pouvez aussi toucher le micro 🎙️ de votre clavier tactile pour dicter directement.</em></p>
        ${dispo ? '' : '<p class="assistant-note">Dictée intégrée indisponible sur ce navigateur : utilisez le micro de votre clavier Android.</p>'}`;
    }

    etapePhoto() {
      const ev = this.ev;
      const icoCamera = (window.ICO && window.ICO.camera(18)) || '';
      const icoGallery = (window.ICO && window.ICO.image(18)) || '';
      const icoPen = (window.ICO && window.ICO.pen(14)) || '';
      const icoRm = (window.ICO && window.ICO.close(16)) || '✕';
      return `<p class="assistant-question">Ajouter une photo</p>
        <p class="assistant-note">Prenez la photo puis annotez-la au doigt (flèche, cercle, texte) pour montrer précisément la zone concernée.</p>
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
      return {
        id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
        domaine: opts.domaine || '',
        texte: opts.texte || '',
        photos: opts.photos || [],
        categorie: opts.categorie || '',
        // « travail » (travail réalisé) ou « constat » (observation avec priorité)
        nature: opts.nature === 'travail' ? 'travail' : 'constat',
        resultat: '',
        corrige: false,
        heure: new Date().toISOString(),
        machineId: opts.machineId || '',
        machineNom: opts.machineNom || ''
      };
    }
  };
})(window);
