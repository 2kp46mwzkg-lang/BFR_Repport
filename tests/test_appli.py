"""Tests automatiques de l'application « Fiche d'intervention SAV ».

Ils ouvrent l'application construite (docs/) dans un vrai navigateur (Chromium,
format téléphone) et rejouent les gestes du terrain : identité, intervention,
évènements avec photos, pièce, signature, rapport PDF et Word, historique…

Lancement (après `python build.py --sans-liste`) :
    pip install playwright pypdf
    python -m playwright install --with-deps chromium
    python tests/test_appli.py

Code de sortie 0 = tout est bon ; 1 = au moins un test a échoué (la GitHub
Action ne publie alors pas la nouvelle version).
"""
import asyncio
import functools
import http.server
import io
import json
import os
import re
import sys
import threading
import traceback
import zipfile

from playwright.async_api import async_playwright
from pypdf import PdfReader

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.environ.get('BFR_SITE') or os.path.join(RACINE, 'docs')
PHOTOS = os.path.join(RACINE, 'tests', 'photos')
SORTIE = os.path.join(RACINE, 'tests', 'resultats')

# Clique tout seul « Confirmer » dans les boîtes de dialogue intégrées de l'appli.
AUTO_CONFIRMATION = """
setInterval(function () {
  var b = document.querySelector && document.querySelector('.dlg-fond [data-r="oui"]');
  if (b && !b.dataset.auto) { b.dataset.auto = '1'; setTimeout(function () { b.click(); }, 60); }
}, 100);
"""


# --------------------------------------------------------------------------
# Serveur web local sur docs/
# --------------------------------------------------------------------------
def demarrer_serveur():
    class Silencieux(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    gestion = functools.partial(Silencieux, directory=SITE)
    serveur = http.server.ThreadingHTTPServer(('127.0.0.1', 0), gestion)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    return serveur, 'http://127.0.0.1:%d/' % serveur.server_address[1]


# --------------------------------------------------------------------------
# Gestes de base
# --------------------------------------------------------------------------
class Telephone:
    """Un téléphone neuf (contexte de navigateur vierge) avec l'appli ouverte."""

    def __init__(self, navigateur, adresse):
        self.navigateur, self.adresse = navigateur, adresse
        self.erreurs, self.dialogues_natifs = [], []

    async def ouvrir(self):
        self.ctx = await self.navigateur.new_context(
            viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
            locale='fr-FR', accept_downloads=True)
        await self.ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await self.ctx.route('https://fonts.gstatic.com/**', lambda r: r.abort())
        await self.ctx.add_init_script(AUTO_CONFIRMATION)
        self.pg = await self.ctx.new_page()
        self.pg.on('pageerror', lambda e: self.erreurs.append(str(e)))
        self.pg.on('dialog', lambda d: (self.dialogues_natifs.append(d.message), asyncio.ensure_future(d.dismiss())))
        await self.pg.goto(self.adresse, wait_until='networkidle')
        return self

    async def fermer(self):
        await self.ctx.close()

    async def fermer_feuilles(self):
        await self.pg.evaluate('() => document.querySelectorAll(".sheet").forEach(s => s.remove())')

    async def identite(self, prenom='Romuald', nom='TEST'):
        pg = self.pg
        await pg.wait_for_selector('.sheet.open [data-sk="technicien.prenom"]', timeout=8000)
        await pg.fill('[data-sk="technicien.prenom"]', prenom)
        await pg.fill('[data-sk="technicien.nom"]', nom)
        await pg.click('.sheet.open [data-a="ok"]')
        await pg.wait_for_timeout(500)

    async def menu(self, action):
        await self.fermer_feuilles()
        await self.pg.click('#btnMenu')
        await self.pg.wait_for_timeout(300)
        await self.pg.click('.sheet.open [data-a="%s"]' % action)
        await self.pg.wait_for_timeout(600)

    async def client(self, nom='ACME Industrie'):
        pg = self.pg
        await self.fermer_feuilles()
        await pg.click('[data-a="editer-client"] >> nth=0')
        await pg.wait_for_timeout(400)
        await pg.fill('#cliRecherche', nom)
        for cle, val in {'client.contact': 'M. Rivière', 'client.email': 'contact@exemple.fr',
                         'machine.designation': 'Presse 120 T', 'machine.serie': 'SN-0387'}.items():
            await pg.fill('.sheet.open [data-fk="%s"]' % cle, val)
        await pg.click('.sheet.open [data-a="ok"]')
        await pg.wait_for_timeout(400)
        await self.fermer_feuilles()

    async def evenement(self, texte, photos=(), categorie=0):
        pg = self.pg
        await self.fermer_feuilles()
        await pg.click('#btnAjouter')
        await pg.wait_for_timeout(300)
        await pg.click('[data-domaine] >> nth=0')
        await pg.wait_for_timeout(200)
        await pg.fill('#evTexte', texte)
        await pg.click('.assistant-nav [data-a="suivant"]')
        await pg.wait_for_timeout(300)
        if photos:
            async with pg.expect_file_chooser() as fc:
                await pg.click('[data-a="photo-lib"]')
            await (await fc.value).set_files([os.path.join(PHOTOS, p) for p in photos])
            for _ in photos:   # l'éditeur d'annotation s'ouvre pour chaque photo
                await pg.wait_for_selector('[data-a="valider"]:visible', timeout=10000)
                await pg.click('[data-a="valider"]:visible')
                await pg.wait_for_timeout(500)
        await pg.click('.assistant-nav [data-a="suivant"]')
        await pg.wait_for_timeout(200)
        cats = await pg.query_selector_all('[data-categorie]')
        if cats:
            await cats[min(categorie, len(cats) - 1)].click()
            await pg.wait_for_timeout(200)
        if await pg.query_selector('.assistant-bar'):
            await pg.click('.assistant-bar [data-a="enregistrer"]')
        await pg.wait_for_timeout(500)

    async def images_affichees(self):
        return await self.pg.evaluate(
            '() => [...document.images].filter(i => i.src.startsWith("data:image/jpeg")).length')

    async def rapport_stocke(self):
        return await self.pg.evaluate('() => JSON.parse(localStorage["sav3.rapport"] || "{}")')

    async def telecharger(self, selecteur):
        async with self.pg.expect_download(timeout=30000) as dl:
            await self.pg.click(selecteur)
        d = await dl.value
        os.makedirs(SORTIE, exist_ok=True)
        chemin = os.path.join(SORTIE, d.suggested_filename)
        await d.save_as(chemin)
        return chemin


def verifier(condition, message):
    if not condition:
        raise AssertionError(message)


# --------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------
async def test_identite_et_numeros(nav, adresse):
    """On ne démarre pas sans nom ; numéro = initiales-AAMMJJ-NN, unique."""
    t = await Telephone(nav, adresse).ouvrir()
    pg = t.pg
    await pg.wait_for_selector('.sheet.open', timeout=8000)
    await pg.click('.sheet.open [data-a="fermer"]')          # « Plus tard »
    await pg.wait_for_timeout(400)
    await pg.click('[data-a="chrono-demarrer"]')
    await pg.wait_for_timeout(500)
    verifier(await pg.query_selector('.sheet.open [data-sk="technicien.code"]'),
             'la fiche « Mes informations » doit s\'ouvrir avant de démarrer')
    verifier(not await pg.query_selector('[data-a="chrono-pause"]'), 'le chrono ne doit pas démarrer sans nom')
    await t.identite()
    verifier(await pg.query_selector('[data-a="chrono-pause"]'), 'le chrono doit démarrer après l\'identité')
    await pg.wait_for_timeout(1000)
    n1 = (await t.rapport_stocke()).get('numero', '')
    verifier(re.match(r'^RT-\d{6}-01$', n1), 'numéro attendu RT-AAMMJJ-01, obtenu %r' % n1)
    await t.evenement('Premier constat')
    await t.menu('nouveau')
    n2 = (await t.rapport_stocke()).get('numero', '')
    verifier(n2 == n1[:-2] + '02', 'nouvelle intervention : %r attendu, %r obtenu' % (n1[:-2] + '02', n2))
    await t.fermer()
    return t


async def test_photos_conservees(nav, adresse):
    """Les photos des rapports de l'historique reviennent à la réouverture."""
    t = await Telephone(nav, adresse).ouvrir()
    await t.identite()
    for k in range(3):
        await t.evenement('Rapport %d' % k, ['paysage-1.jpg', 'portrait.jpg'])
        if k < 2:
            await t.menu('nouveau')
    await t.pg.reload(wait_until='networkidle')
    await t.pg.wait_for_timeout(1500)
    await t.fermer_feuilles()
    verifier(await t.images_affichees() >= 2, 'photos du rapport en cours absentes après rechargement')
    for k in range(3):
        await t.menu('historique')
        boutons = await t.pg.query_selector_all('[data-ouvrir]')
        verifier(len(boutons) == 3, '3 rapports attendus dans l\'historique, %d trouvés' % len(boutons))
        await boutons[k].click()
        await t.pg.wait_for_timeout(1500)
        verifier(await t.images_affichees() >= 2, 'rapport %d rouvert sans ses photos' % k)
    # l'enregistrement en base est léger (images rangées à part)
    tailles = await t.pg.evaluate('''() => new Promise(res => {
      const q = indexedDB.open("bfr_sav_v3");
      q.onsuccess = () => { const rq = q.result.transaction(["rapports"]).objectStore("rapports").getAll();
        rq.onsuccess = () => res(rq.result.map(r => JSON.stringify(r).length)); };
    })''')
    verifier(tailles and max(tailles) < 100000, 'rapports en base trop lourds (photos non séparées) : %s' % tailles)
    await t.fermer()
    return t


async def test_rapport_pdf_et_word(nav, adresse):
    """Rapport complet : numérotation continue, mise en page selon les photos, Word valide."""
    t = await Telephone(nav, adresse).ouvrir()
    pg = t.pg
    await t.identite()
    await t.client()
    await t.evenement('Courroie détendue, sans photo.', [], 0)
    await t.evenement('Fuite sur le vérin, une photo.', ['paysage-1.jpg'], 0)
    await t.evenement('Carter fissuré, deux photos.', ['paysage-2.jpg', 'portrait.jpg'], 1)
    # pièce rattachée à la machine, avec sa photo
    await t.fermer_feuilles()
    await pg.click('#btnAjouterPiece')
    await pg.wait_for_timeout(300)
    await pg.fill('#pcDenom', 'Joint de vérin')
    await pg.fill('#pcRef', 'JV-42')
    await pg.set_input_files('#pcPhotoGal', os.path.join(PHOTOS, 'portrait.jpg'))
    await pg.wait_for_timeout(1200)
    await pg.click('[data-a="sauvegarder-piece"]')
    await pg.wait_for_timeout(500)
    verifier(await pg.query_selector('#cardPieces img'), 'la photo de la pièce n\'apparaît pas dans l\'écran')
    chemin_docx = await t.telecharger('[data-a="word"] >> visible=true >> nth=0')
    await pg.click('[data-a="soumettre"] >> visible=true >> nth=0')   # confirmations auto
    await pg.wait_for_selector('[data-a="dl"]', timeout=30000)
    chemin_pdf = await t.telecharger('[data-a="dl"] >> visible=true')

    texte = '\n'.join(page.extract_text() or '' for page in PdfReader(chemin_pdf).pages)
    numeros = [int(n) for n in re.findall(r'(?m)^\s*(\d+)\. [A-ZÉÈ]', texte)]
    uniques = sorted(set(numeros))
    verifier(uniques == list(range(1, len(uniques) + 1)), 'sections non numérotées en continu : %s' % numeros)
    verifier('Machine (N° série)' in texte or 'MACHINE (N° SÉRIE)' in texte.upper(), 'colonne machine des pièces absente du PDF')
    # photo de la pièce dans le PDF : vignette convertie en 500 px de large
    largeurs = set()
    for page in PdfReader(chemin_pdf).pages:
        xobjets = (page.get('/Resources') or {}).get('/XObject') or {}
        for ref in xobjets.values():
            o = ref.get_object()
            if o.get('/Subtype') == '/Image':
                largeurs.add(int(o.get('/Width', 0)))
    verifier(500 in largeurs, 'photo de la pièce absente du PDF (images trouvées, largeurs : %s)' % sorted(largeurs))
    nb_pages = len(PdfReader(chemin_pdf).pages)
    verifier(nb_pages <= 6, 'mise en page compacte attendue (≤ 6 pages), %d pages' % nb_pages)

    with zipfile.ZipFile(chemin_docx) as z:
        verifier(z.testzip() is None, 'fichier Word corrompu')
        rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
        doc = z.read('word/document.xml').decode('utf-8')
        cibles = set(re.findall(r'Target="(media/[^"]+)"', rels))
        utilisees = set(re.findall(r'r:embed="([^"]+)"', doc))
        declarees = set(re.findall(r'Id="([^"]+)"[^>]*Target="media/', rels))
        verifier(utilisees <= declarees, 'images du Word non déclarées : %s' % (utilisees - declarees))
        verifier(len(utilisees) >= 4, 'Word : 4 photos attendues (3 d\'évènements + 1 de pièce), %d trouvées' % len(utilisees))
        verifier(all(('word/' + c) in z.namelist() for c in cibles), 'image du Word manquante dans le fichier')

    # dossier .zip de toutes les photos de l'intervention
    await t.fermer_feuilles()
    chemin_zip = await t.telecharger('[data-a="photos-zip"] >> visible=true >> nth=0')
    with zipfile.ZipFile(chemin_zip) as z:
        verifier(z.testzip() is None, 'dossier photos (.zip) corrompu')
        noms = z.namelist()
        photos = [n for n in noms if n.endswith('.jpg')]
        verifier(len(photos) == 4, 'dossier photos : 4 photos attendues, %d trouvées (%s)' % (len(photos), noms))
        verifier(sum(n.startswith('1-Evenements/') for n in photos) == 3, 'photos d\'évènements mal rangées : %s' % noms)
        verifier(sum(n.startswith('2-Pieces/') for n in photos) == 1, 'photo de pièce mal rangée : %s' % noms)
        verifier('Liste-des-photos.csv' in noms, 'index des photos absent')
        index = z.read('Liste-des-photos.csv').decode('utf-8-sig')
        verifier('Joint de vérin' in index and 'JV-42' in index, 'index des photos incomplet')
    await t.fermer()
    return t


async def test_historique_et_menage(nav, adresse):
    """Recherche dans l'historique ; ménage des rapports terminés anciens seulement."""
    t = await Telephone(nav, adresse).ouvrir()
    pg = t.pg
    await t.identite()
    await t.evenement('Rapport du jour', ['paysage-1.jpg'])
    await pg.wait_for_timeout(1200)
    await pg.evaluate('''async () => {
      for (let k = 1; k <= 3; k++) {
        const r = { id: 'ancien' + k, numero: 'RT-250101-0' + k, cree: '2025-01-0' + k + 'T08:00:00Z',
          maj: '2025-01-0' + k + 'T09:00:00Z', date: '2025-01-0' + k, statut: k < 3 ? 'terminé' : 'brouillon',
          client: { nom: 'Client ancien ' + k }, machine: { designation: 'M' + k },
          evenements: [{ id: 'e' + k, domaine: 'MECANIQUE', categorie: 'INFO', texte: 'ancien', photos: [] }],
          photosLibres: [], pieces: [] };
        await RapportDB.sauverRapport(r);
        const l = JSON.parse(localStorage['sav3.rapports'] || '[]'); l.push(r);
        localStorage['sav3.rapports'] = JSON.stringify(l);
      }
    }''')
    await t.menu('historique')
    await pg.fill('#histRecherche', 'ancien 2')
    await pg.wait_for_timeout(300)
    trouves = await pg.evaluate('() => [...document.querySelectorAll("#histListe strong")].map(e => e.textContent)')
    verifier(len(trouves) == 1 and 'Client ancien 2' in trouves[0], 'recherche incorrecte : %s' % trouves)
    await pg.fill('#histRecherche', '')
    await t.telecharger('[data-a="menage"]')            # la sauvegarde est exigée d'abord
    await pg.wait_for_timeout(2500)
    restants = await pg.evaluate('() => [...document.querySelectorAll("#histListe strong")].map(e => e.textContent)')
    verifier(not any('Client ancien 1' in r or 'Client ancien 2' in r for r in restants), 'rapports anciens non supprimés : %s' % restants)
    verifier(any('Client ancien 3' in r for r in restants), 'un brouillon ancien ne doit jamais être supprimé')
    await t.fermer()
    return t


async def test_reglages(nav, adresse):
    """Message e-mail conservé, adresse SAV non imposée, réglages d'équipe."""
    t = await Telephone(nav, adresse).ouvrir()
    pg = t.pg
    await t.identite()
    await pg.evaluate('''() => { const s = JSON.parse(localStorage["sav3.settings"]);
      s.mail.corps = "Bonjour, voici le rapport. Cordialement"; s.mail.destinataireSAV = "";
      localStorage["sav3.settings"] = JSON.stringify(s); }''')
    await pg.reload(wait_until='networkidle')
    await pg.wait_for_timeout(1000)
    reglages = await pg.evaluate('() => JSON.parse(localStorage["sav3.settings"])')
    verifier(reglages['mail']['corps'].endswith('Cordialement'), 'le message e-mail personnalisé a été effacé')
    verifier(reglages['mail']['destinataireSAV'] == '', 'une adresse SAV a été imposée')
    # export puis import des réglages d'équipe
    await t.menu('reglages')
    await pg.fill('[data-sk="mail.destinataireSAV"]', 'responsable@exemple.fr')
    await pg.click('.sheet.open [data-a="enregistrer"]')
    await pg.wait_for_timeout(500)
    await t.menu('reglages')
    chemin = await t.telecharger('[data-a="equipe-export"]')
    equipe = json.load(open(chemin, encoding='utf-8'))
    verifier('technicien' not in equipe, 'les réglages d\'équipe ne doivent pas contenir l\'identité du technicien')
    await pg.evaluate('''() => { const s = JSON.parse(localStorage["sav3.settings"]); s.mail.destinataireSAV = "";
      localStorage["sav3.settings"] = JSON.stringify(s); }''')
    await pg.reload(wait_until='networkidle')
    await pg.wait_for_timeout(1000)
    await t.menu('reglages')
    await pg.set_input_files('#equipeImport', chemin)
    await pg.wait_for_timeout(800)
    sav = await pg.evaluate('() => JSON.parse(localStorage["sav3.settings"]).mail.destinataireSAV')
    verifier(sav == 'responsable@exemple.fr', 'import des réglages d\'équipe : %r' % sav)
    # assistant d'évènement : domaine obligatoire dès l'étape 1
    await t.fermer_feuilles()
    await pg.click('#btnAjouter')
    await pg.wait_for_timeout(300)
    await pg.click('.assistant-nav [data-a="suivant"]')
    await pg.wait_for_timeout(300)
    etape = await pg.inner_text('#assistantProgres')
    verifier('1/4' in etape, 'l\'assistant ne doit pas passer à l\'étape 2 sans domaine (%s)' % etape)
    await t.fermer()
    return t


TESTS = [test_identite_et_numeros, test_photos_conservees, test_rapport_pdf_et_word,
         test_historique_et_menage, test_reglages]
# BFR_TEST=nom_du_test : ne lancer qu'un seul test (ex. BFR_TEST=test_rapport_pdf_et_word)
if os.environ.get('BFR_TEST'):
    TESTS = [f for f in TESTS if f.__name__ == os.environ['BFR_TEST']]


async def principal():
    if not os.path.isfile(os.path.join(SITE, 'index.html')):
        print('docs/index.html absent : lancez d\'abord  python build.py --sans-liste')
        return 1
    serveur, adresse = demarrer_serveur()
    echecs = 0
    async with async_playwright() as p:
        nav = await p.chromium.launch()
        for test in TESTS:
            nom = test.__name__
            try:
                tel = await test(nav, adresse)
                problemes = []
                if tel.erreurs:
                    problemes.append('erreurs JavaScript : %s' % tel.erreurs[:3])
                if tel.dialogues_natifs:
                    problemes.append('boîtes natives (bloquées dans un artefact) : %s' % tel.dialogues_natifs[:3])
                if problemes:
                    raise AssertionError(' ; '.join(problemes))
                print('OK      %s' % nom)
            except Exception as e:
                echecs += 1
                print('ÉCHEC   %s : %s' % (nom, e))
                if not isinstance(e, AssertionError):
                    traceback.print_exc()
        await nav.close()
    serveur.shutdown()
    print('\n%d test(s), %d échec(s)' % (len(TESTS), echecs))
    return 1 if echecs else 0


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
