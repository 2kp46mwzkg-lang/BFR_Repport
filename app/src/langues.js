/* =========================================================================
   langues.js — Traduction du rapport dans la langue du client
   -------------------------------------------------------------------------
   Deux mécanismes complémentaires :

   1. PACKS DE LANGUE (ce fichier) : tous les libellés fixes du rapport
      (titres, tableaux, mentions, pied de page…) sont traduits par un
      dictionnaire embarqué. Cela fonctionne HORS CONNEXION, sans rien
      installer, et c'est identique dans le PDF, l'aperçu et le Word.

   2. TRADUCTION AUTOMATIQUE (traduction.js) : les textes SAISIS par le
      technicien (objet, actions, observations, synthèse) sont traduits par
      le traducteur du téléphone (Chrome, gratuit, hors connexion une fois
      la langue téléchargée).

   Rien ici ne modifie le rapport français : la génération en français reste
   la référence, la version traduite est produite à côté.
   ========================================================================= */
(function (global) {
  'use strict';

  /* --- Langues proposées (ordre d'affichage) --------------------------- */
  /* Toutes compatibles avec le moteur PDF de l'application (police latine
     standard : accents d'Europe de l'Ouest). */
  const LANGUES = [
    { code: 'en', nom: 'Anglais', natif: 'English' },
    { code: 'de', nom: 'Allemand', natif: 'Deutsch' },
    { code: 'nl', nom: 'Néerlandais', natif: 'Nederlands' },
    { code: 'es', nom: 'Espagnol', natif: 'Español' },
    { code: 'it', nom: 'Italien', natif: 'Italiano' },
    { code: 'pt', nom: 'Portugais', natif: 'Português' }
  ];

  /* --- Dictionnaire : libellé français -> traductions ------------------- */
  /* La clé est le texte exact écrit par le générateur de rapport. */
  const DICO = {
    /* Titres et blocs du modèle */
    "Compte rendu d'intervention": {
      en: 'Service report', de: 'Servicebericht', nl: 'Serviceverslag',
      es: 'Informe de intervención', it: 'Rapporto di intervento', pt: 'Relatório de intervenção'
    },
    'Votre contact :': {
      en: 'Your contact:', de: 'Ihr Ansprechpartner:', nl: 'Uw contactpersoon:',
      es: 'Su contacto:', it: 'Il suo referente:', pt: 'O seu contacto:'
    },
    'Intervention': {
      en: 'Service call', de: 'Einsatz', nl: 'Interventie',
      es: 'Intervención', it: 'Intervento', pt: 'Intervenção'
    },

    /* Tableau d'identification */
    'Machine / équipement': {
      en: 'Machine / equipment', de: 'Maschine / Anlage', nl: 'Machine / installatie',
      es: 'Máquina / equipo', it: 'Macchina / impianto', pt: 'Máquina / equipamento'
    },
    'Modèle': { en: 'Model', de: 'Modell', nl: 'Model', es: 'Modelo', it: 'Modello', pt: 'Modelo' },
    'N° de série': {
      en: 'Serial number', de: 'Seriennummer', nl: 'Serienummer',
      es: 'N.º de serie', it: 'Numero di serie', pt: 'N.º de série'
    },
    'Compteur': { en: 'Counter', de: 'Zähler', nl: 'Teller', es: 'Contador', it: 'Contatore', pt: 'Contador' },
    'Compteur / N° de parc': {
      en: 'Counter / asset no.', de: 'Zähler / Anlagennr.', nl: 'Teller / activanr.',
      es: 'Contador / n.º de activo', it: 'Contatore / n. impianto', pt: 'Contador / n.º de ativo'
    },
    'Objet / demande': {
      en: 'Subject / request', de: 'Betreff / Anfrage', nl: 'Onderwerp / aanvraag',
      es: 'Asunto / solicitud', it: 'Oggetto / richiesta', pt: 'Assunto / pedido'
    },
    'Objet / demande du client': {
      en: "Customer's subject / request", de: 'Betreff / Anfrage des Kunden', nl: 'Onderwerp / aanvraag van de klant',
      es: 'Asunto / solicitud del cliente', it: 'Oggetto / richiesta del cliente', pt: 'Assunto / pedido do cliente'
    },
    'Lieu': { en: 'Location', de: 'Standort', nl: 'Locatie', es: 'Ubicación', it: 'Luogo', pt: 'Local' },
    'Contact sur site': {
      en: 'On-site contact', de: 'Ansprechpartner vor Ort', nl: 'Contact ter plaatse',
      es: 'Contacto en planta', it: 'Referente in loco', pt: 'Contacto no local'
    },
    'Téléphone / e-mail': {
      en: 'Phone / e-mail', de: 'Telefon / E-Mail', nl: 'Telefoon / e-mail',
      es: 'Teléfono / correo', it: 'Telefono / e-mail', pt: 'Telefone / e-mail'
    },
    'Téléphone / e-mail client': {
      en: 'Customer phone / e-mail', de: 'Telefon / E-Mail Kunde', nl: 'Telefoon / e-mail klant',
      es: 'Teléfono / correo del cliente', it: 'Telefono / e-mail cliente', pt: 'Telefone / e-mail do cliente'
    },
    "Date d'intervention": {
      en: 'Service date', de: 'Einsatzdatum', nl: 'Datum interventie',
      es: 'Fecha de intervención', it: "Data dell'intervento", pt: 'Data da intervenção'
    },
    'Horaires sur site': {
      en: 'On-site times', de: 'Zeiten vor Ort', nl: 'Tijden ter plaatse',
      es: 'Horario en planta', it: 'Orari in loco', pt: 'Horário no local'
    },
    'Durée sur site': {
      en: 'Time on site', de: 'Zeit vor Ort', nl: 'Tijd ter plaatse',
      es: 'Duración en planta', it: 'Durata in loco', pt: 'Duração no local'
    },
    'Trajet aller': {
      en: 'Outward journey', de: 'Hinfahrt', nl: 'Heenreis',
      es: 'Viaje de ida', it: 'Viaggio di andata', pt: 'Viagem de ida'
    },
    'Trajet retour': {
      en: 'Return journey', de: 'Rückfahrt', nl: 'Terugreis',
      es: 'Viaje de vuelta', it: 'Viaggio di ritorno', pt: 'Viagem de regresso'
    },
    'Trajet retour (estimé)': {
      en: 'Return journey (est.)', de: 'Rückfahrt (geschätzt)', nl: 'Terugreis (geschat)',
      es: 'Viaje de vuelta (est.)', it: 'Viaggio di ritorno (stimato)', pt: 'Viagem de regresso (est.)'
    },
    'Total déplacement': {
      en: 'Total travel time', de: 'Gesamte Reisezeit', nl: 'Totale reistijd',
      es: 'Tiempo total de viaje', it: 'Tempo totale di viaggio', pt: 'Tempo total de viagem'
    },
    'Total général (site + route)': {
      en: 'Grand total (site + travel)', de: 'Gesamtdauer (Einsatz + Fahrt)', nl: 'Totaal generaal (ter plaatse + reistijd)',
      es: 'Total general (planta + viaje)', it: 'Totale generale (luogo + viaggio)', pt: 'Total geral (local + viagem)'
    },
    'La durée du trajet retour est estimée sur la base du trajet aller constaté.': {
      en: 'The return travel time is estimated based on the observed outward journey.',
      de: 'Die Rückfahrtzeit wird auf Basis der festgestellten Hinfahrt geschätzt.',
      nl: 'De terugreistijd is geschat op basis van de vastgestelde heenreis.',
      es: 'El tiempo de viaje de vuelta se estima en función del viaje de ida constatado.',
      it: 'Il tempo del viaggio di ritorno è stimato sulla base del viaggio di andata riscontrato.',
      pt: 'O tempo de viagem de regresso é estimado com base na viagem de ida constatada.'
    },
    'estimé': {
      en: 'estimated', de: 'geschätzt', nl: 'geschat',
      es: 'estimado', it: 'stimato', pt: 'estimado'
    },
    'Heures passées sur site': {
      en: 'Hours spent on site', de: 'Vor Ort verbrachte Stunden', nl: 'Uren ter plaatse',
      es: 'Horas en planta', it: 'Ore passate in loco', pt: 'Horas no local'
    },
    'Technicien': { en: 'Technician', de: 'Techniker', nl: 'Technicus', es: 'Técnico', it: 'Tecnico', pt: 'Técnico' },
    'Client': { en: 'Customer', de: 'Kunde', nl: 'Klant', es: 'Cliente', it: 'Cliente', pt: 'Cliente' },
    'Machine': { en: 'Machine', de: 'Maschine', nl: 'Machine', es: 'Máquina', it: 'Macchina', pt: 'Máquina' },
    'Adresse client': {
      en: 'Customer address', de: 'Kundenadresse', nl: 'Klantadres',
      es: 'Dirección del cliente', it: 'Indirizzo cliente', pt: 'Endereço do cliente'
    },

    /* Multi-machines */
    'Machines visitées': {
      en: 'Inspected machines', de: 'Besichtigte Maschinen', nl: 'Bezochte machines',
      es: 'Máquinas inspeccionadas', it: 'Macchine ispezionate', pt: 'Máquinas inspecionadas'
    },
    'Machine concernée': {
      en: 'Concerned machine', de: 'Betroffene Maschine', nl: 'Betrokken machine',
      es: 'Máquina concernida', it: 'Macchina interessata', pt: 'Máquina em causa'
    },
    'Machine 1': { en: 'Machine 1', de: 'Maschine 1', nl: 'Machine 1', es: 'Máquina 1', it: 'Macchina 1', pt: 'Máquina 1' },
    'Machine 2': { en: 'Machine 2', de: 'Maschine 2', nl: 'Machine 2', es: 'Máquina 2', it: 'Macchina 2', pt: 'Máquina 2' },
    'Machine 3': { en: 'Machine 3', de: 'Maschine 3', nl: 'Machine 3', es: 'Máquina 3', it: 'Macchina 3', pt: 'Máquina 3' },
    'Machine 4': { en: 'Machine 4', de: 'Maschine 4', nl: 'Machine 4', es: 'Máquina 4', it: 'Macchina 4', pt: 'Máquina 4' },
    'Machine 5': { en: 'Machine 5', de: 'Maschine 5', nl: 'Machine 5', es: 'Máquina 5', it: 'Macchina 5', pt: 'Máquina 5' },
    "Non rattaché / Toute l'installation": {
      en: 'Unassigned / Entire line', de: 'Nicht zugeordnet / Gesamte Anlage', nl: 'Niet toegewezen / Volledige lijn',
      es: 'No asignado / Línea completa', it: 'Non assegnato / Tutta la linea', pt: 'Não atribuído / Toda a linha'
    },

    /* Multi-jours */
    "Relevé des journées d'intervention": {
      en: 'Service days breakdown', de: 'Übersicht der Einsatztage', nl: 'Overzicht van de interventiedagen',
      es: 'Detalle de las jornadas de intervención', it: 'Riepilogo delle giornate di intervento', pt: 'Registo dos dias de intervenção'
    },
    "Journées d'intervention": {
      en: 'Service days', de: 'Einsatztage', nl: 'Interventiedagen',
      es: 'Jornadas de intervención', it: 'Giornate di intervento', pt: 'Dias de intervenção'
    },
    'Journée': { en: 'Day', de: 'Tag', nl: 'Dag', es: 'Jornada', it: 'Giornata', pt: 'Dia' },
    'Date': { en: 'Date', de: 'Datum', nl: 'Datum', es: 'Fecha', it: 'Data', pt: 'Data' },
    'Pause': { en: 'Break', de: 'Pause', nl: 'Pauze', es: 'Pausa', it: 'Pausa', pt: 'Pausa' },
    'Activité / Travaux': {
      en: 'Activity / Work', de: 'Tätigkeit / Arbeiten', nl: 'Activiteit / Werkzaamheden',
      es: 'Actividad / Trabajos', it: 'Attività / Lavori', pt: 'Atividade / Trabalhos'
    },
    'Total': { en: 'Total', de: 'Gesamt', nl: 'Totaal', es: 'Total', it: 'Totale', pt: 'Total' },
    'Total cumulé': {
      en: 'Cumulative total', de: 'Gesamtsumme', nl: 'Cumulatief totaal',
      es: 'Total acumulado', it: 'Totale cumulativo', pt: 'Total acumulado'
    },

    /* Multi-techniciens */
    'Techniciens sur site': {
      en: 'On-site technicians', de: 'Techniker vor Ort', nl: 'Technici ter plaatse',
      es: 'Técnicos en planta', it: 'Tecnici in loco', pt: 'Técnicos no local'
    },
    'Technicien(s) sur site': {
      en: 'On-site technician(s)', de: 'Techniker vor Ort', nl: 'Technicus/technici ter plaatse',
      es: 'Técnico(s) en planta', it: 'Tecnico/i in loco', pt: 'Técnico(s) no local'
    },
    'Équipe technique': {
      en: 'Technical team', de: 'Serviceteam', nl: 'Technisch team',
      es: 'Equipo técnico', it: 'Team tecnico', pt: 'Equipa técnica'
    },
    'Technicien principal': {
      en: 'Lead technician', de: 'Leitender Techniker', nl: 'Hoofdtechnicus',
      es: 'Técnico principal', it: 'Tecnico principale', pt: 'Técnico principal'
    },
    'Accompagné de': {
      en: 'Accompanied by', de: 'In Begleitung von', nl: 'Vergezeld door',
      es: 'Acompañado de', it: 'Accompagnato da', pt: 'Acompanhado por'
    },
    'Automaticien': {
      en: 'Automation engineer', de: 'Automatisierungstechniker', nl: 'Automatiseringsspecialist',
      es: 'Especialista en automatización', it: 'Specialista automazione', pt: 'Especialista em automação'
    },
    'Mécanicien': {
      en: 'Mechanic', de: 'Mechaniker', nl: 'Monteur mechanica',
      es: 'Mecánico', it: 'Meccanico', pt: 'Mecânico'
    },
    'Électrotechnicien': {
      en: 'Electrical technician', de: 'Elektrotechniker', nl: 'Elektrotechnicus',
      es: 'Electrotécnico', it: 'Elettrotecnico', pt: 'Eletrotécnico'
    },
    'Chef de projet SAV': {
      en: 'Service project manager', de: 'Kundendienst-Projektleiter', nl: 'Projectleider klantenservice',
      es: 'Jefe de proyecto posventa', it: 'Responsabile progetto post-vendita', pt: 'Gestor de projeto pós-venda'
    },
    'Support SAV': {
      en: 'Service support', de: 'Kundendienst-Support', nl: 'Ondersteuning klantenservice',
      es: 'Soporte posventa', it: 'Supporto post-vendita', pt: 'Suporte pós-venda'
    },

    /* Sections du canevas */
    'Synthèse': { en: 'Summary', de: 'Zusammenfassung', nl: 'Samenvatting', es: 'Resumen', it: 'Sintesi', pt: 'Resumo' },
    'Synthèse du technicien': {
      en: "Technician's summary", de: 'Zusammenfassung des Technikers', nl: 'Samenvatting van de technicus',
      es: 'Resumen del técnico', it: 'Sintesi del tecnico', pt: 'Resumo do técnico'
    },
    'Évènements': { en: 'Events', de: 'Ereignisse', nl: 'Gebeurtenissen', es: 'Eventos', it: 'Eventi', pt: 'Eventos' },
    'évènements': { en: 'events', de: 'Ereignisse', nl: 'gebeurtenissen', es: 'eventos', it: 'eventi', pt: 'eventos' },
    'Évènement': { en: 'Event', de: 'Ereignis', nl: 'Gebeurtenis', es: 'Evento', it: 'Evento', pt: 'Evento' },
    'suite': { en: 'continued', de: 'Fortsetzung', nl: 'vervolg', es: 'continuación', it: 'segue', pt: 'continuação' },

    /* Travaux terminés (validation) */
    'Travaux terminés': {
      en: 'Work completed', de: 'Arbeiten abgeschlossen', nl: 'Werkzaamheden voltooid',
      es: 'Trabajos terminados', it: 'Lavori terminati', pt: 'Trabalhos concluídos'
    },
    'Oui': { en: 'Yes', de: 'Ja', nl: 'Ja', es: 'Sí', it: 'Sì', pt: 'Sim' },
    'Non': { en: 'No', de: 'Nein', nl: 'Nee', es: 'No', it: 'No', pt: 'Não' },
    'Partiellement': { en: 'Partially', de: 'Teilweise', nl: 'Gedeeltelijk', es: 'Parcialmente', it: 'Parzialmente', pt: 'Parcialmente' },
    'Fait le': { en: 'Done on', de: 'Erstellt am', nl: 'Opgesteld op', es: 'Hecho el', it: 'Redatto il', pt: 'Feito em' },

    /* Travaux réalisés / constats et types d'intervention */
    'Travaux réalisés': {
      en: 'Work performed', de: 'Durchgeführte Arbeiten', nl: 'Uitgevoerde werkzaamheden',
      es: 'Trabajos realizados', it: 'Lavori eseguiti', pt: 'Trabalhos realizados'
    },
    'Travail réalisé': {
      en: 'Work carried out', de: 'Durchgeführte Arbeit', nl: 'Uitgevoerd werk',
      es: 'Trabajo realizado', it: 'Lavoro eseguito', pt: 'Trabalho realizado'
    },
    'travaux': { en: 'tasks', de: 'Arbeiten', nl: 'werkzaamheden', es: 'trabajos', it: 'lavori', pt: 'trabalhos' },
    'travail': { en: 'task', de: 'Arbeit', nl: 'werkzaamheid', es: 'trabajo', it: 'lavoro', pt: 'trabalho' },
    'Points relevés': {
      en: 'Findings', de: 'Festgestellte Punkte', nl: 'Vastgestelde punten',
      es: 'Puntos observados', it: 'Punti rilevati', pt: 'Pontos observados'
    },
    'Constats — Sécurité et urgences': {
      en: 'Findings — Safety and emergencies', de: 'Feststellungen — Sicherheit und Notfälle', nl: 'Bevindingen — Veiligheid en urgenties',
      es: 'Hallazgos — Seguridad y urgencias', it: 'Rilievi — Sicurezza e urgenze', pt: 'Constatações — Segurança e urgências'
    },
    'Constats — Priorité haute': {
      en: 'Findings — High priority', de: 'Feststellungen — Hohe Priorität', nl: 'Bevindingen — Hoge prioriteit',
      es: 'Hallazgos — Prioridad alta', it: 'Rilievi — Priorità alta', pt: 'Constatações — Prioridade alta'
    },
    'Constats — Priorité basse': {
      en: 'Findings — Low priority', de: 'Feststellungen — Niedrige Priorität', nl: 'Bevindingen — Lage prioriteit',
      es: 'Hallazgos — Prioridad baja', it: 'Rilievi — Priorità bassa', pt: 'Constatações — Prioridade baixa'
    },
    'Constats — Informations complémentaires': {
      en: 'Findings — Additional information', de: 'Feststellungen — Zusätzliche Informationen', nl: 'Bevindingen — Aanvullende informatie',
      es: 'Hallazgos — Información adicional', it: 'Rilievi — Informazioni aggiuntive', pt: 'Constatações — Informações complementares'
    },
    'Résultat : Terminé': {
      en: 'Result: Completed', de: 'Ergebnis: Abgeschlossen', nl: 'Resultaat: Voltooid',
      es: 'Resultado: Terminado', it: 'Esito: Completato', pt: 'Resultado: Concluído'
    },
    'Résultat : Résolu': {
      en: 'Result: Resolved', de: 'Ergebnis: Behoben', nl: 'Resultaat: Opgelost',
      es: 'Resultado: Resuelto', it: 'Esito: Risolto', pt: 'Resultado: Resolvido'
    },
    'Résultat : Partiellement résolu': {
      en: 'Result: Partially resolved', de: 'Ergebnis: Teilweise behoben', nl: 'Resultaat: Gedeeltelijk opgelost',
      es: 'Resultado: Parcialmente resuelto', it: 'Esito: Parzialmente risolto', pt: 'Resultado: Parcialmente resolvido'
    },
    'Résultat : À surveiller': {
      en: 'Result: To be monitored', de: 'Ergebnis: Zu überwachen', nl: 'Resultaat: In de gaten houden',
      es: 'Resultado: A vigilar', it: 'Esito: Da monitorare', pt: 'Resultado: A acompanhar'
    },
    "Corrigé sur place pendant l'intervention": {
      en: 'Corrected on site during the service call', de: 'Während des Einsatzes vor Ort behoben', nl: 'Ter plaatse verholpen tijdens de interventie',
      es: 'Corregido in situ durante la intervención', it: "Corretto sul posto durante l'intervento", pt: 'Corrigido no local durante a intervenção'
    },
    'Constats corrigés sur place': {
      en: 'Findings corrected on site', de: 'Vor Ort behobene Feststellungen', nl: 'Ter plaatse verholpen bevindingen',
      es: 'Hallazgos corregidos in situ', it: 'Rilievi corretti sul posto', pt: 'Constatações corrigidas no local'
    },
    "Rapport d'audit": {
      en: 'Audit report', de: 'Auditbericht', nl: 'Auditrapport',
      es: 'Informe de auditoría', it: 'Rapporto di audit', pt: 'Relatório de auditoria'
    },
    "Compte rendu d'intervention et d'audit": {
      en: 'Service and audit report', de: 'Service- und Auditbericht', nl: 'Service- en auditrapport',
      es: 'Informe de intervención y auditoría', it: 'Rapporto di intervento e audit', pt: 'Relatório de intervenção e auditoria'
    },
    'Photo': { en: 'Photo', de: 'Foto', nl: 'Foto', es: 'Foto', it: 'Foto', pt: 'Foto' },
    'Événements': { en: 'Events', de: 'Ereignisse', nl: 'Gebeurtenissen', es: 'Eventos', it: 'Eventi', pt: 'Eventos' },
    'Texte': { en: 'Text', de: 'Text', nl: 'Tekst', es: 'Texto', it: 'Testo', pt: 'Texto' },
    'Photos': { en: 'Photos', de: 'Fotos', nl: "Foto's", es: 'Fotos', it: 'Foto', pt: 'Fotos' },
    'Validation': { en: 'Validation', de: 'Bestätigung', nl: 'Validatie', es: 'Validación', it: 'Convalida', pt: 'Validação' },
    'Pièces de rechange': {
      en: 'Spare parts', de: 'Ersatzteile', nl: 'Reserveonderdelen',
      es: 'Piezas de repuesto', it: 'Pezzi di ricambio', pt: 'Peças sobressalentes'
    },
    'Dénomination': {
      en: 'Description', de: 'Bezeichnung', nl: 'Benaming',
      es: 'Denominación', it: 'Denominazione', pt: 'Denominação'
    },
    'Référence': {
      en: 'Part number', de: 'Artikelnummer', nl: 'Referentie',
      es: 'Referencia', it: 'Codice', pt: 'Referência'
    },
    'Machine (N° série)': {
      en: 'Machine (Serial No.)', de: 'Maschine (Serien-Nr.)', nl: 'Machine (Serienr.)',
      es: 'Máquina (N.º serie)', it: 'Macchina (N. serie)', pt: 'Máquina (N.º de série)'
    },
    'Machine (N° de série)': {
      en: 'Machine (Serial No.)', de: 'Maschine (Serien-Nr.)', nl: 'Machine (Serienr.)',
      es: 'Máquina (N.º serie)', it: 'Macchina (N. serie)', pt: 'Máquina (N.º de série)'
    },
    'Quantité': {
      en: 'Quantity', de: 'Menge', nl: 'Aantal',
      es: 'Cantidad', it: 'Quantità', pt: 'Quantidade'
    },
    'Catégorie': { en: 'Category', de: 'Kategorie', nl: 'Categorie', es: 'Categoría', it: 'Categoria', pt: 'Categoria' },
    'Nombre': { en: 'Number', de: 'Anzahl', nl: 'Aantal', es: 'Número', it: 'Numero', pt: 'Número' },
    'Photos jointes': {
      en: 'Attached photos', de: 'Beigefügte Fotos', nl: "Bijgevoegde foto's",
      es: 'Fotos adjuntas', it: 'Foto allegate', pt: 'Fotos anexadas'
    },
    'Points de sécurité / urgence': {
      en: 'Safety / urgent points', de: 'Sicherheits- / Notfallpunkte', nl: 'Veiligheids- / urgentiepunten',
      es: 'Puntos de seguridad / urgencia', it: 'Punti di sicurezza / urgenza', pt: 'Pontos de segurança / urgência'
    },

    /* Titres de sections du canevas standard (numérotés) */
    "1. Synthèse de l'intervention": {
      en: '1. Summary of the service call', de: '1. Zusammenfassung des Einsatzes', nl: '1. Samenvatting van de interventie',
      es: '1. Resumen de la intervención', it: "1. Sintesi dell'intervento", pt: '1. Resumo da intervenção'
    },
    '2. Sécurité et urgences': {
      en: '2. Safety and emergencies', de: '2. Sicherheit und Notfälle', nl: '2. Veiligheid en urgenties',
      es: '2. Seguridad y urgencias', it: '2. Sicurezza e urgenze', pt: '2. Segurança e urgências'
    },
    '3. Points de priorité haute': {
      en: '3. High-priority points', de: '3. Punkte hoher Priorität', nl: '3. Punten met hoge prioriteit',
      es: '3. Puntos de prioridad alta', it: '3. Punti di priorità alta', pt: '3. Pontos de prioridade alta'
    },
    '4. Points de priorité basse': {
      en: '4. Low-priority points', de: '4. Punkte niedriger Priorität', nl: '4. Punten met lage prioriteit',
      es: '4. Puntos de prioridad baja', it: '4. Punti di priorità bassa', pt: '4. Pontos de prioridade baixa'
    },
    '5. Informations complémentaires': {
      en: '5. Additional information', de: '5. Zusätzliche Informationen', nl: '5. Aanvullende informatie',
      es: '5. Información adicional', it: '5. Informazioni aggiuntive', pt: '5. Informações complementares'
    },
    '6. Travaux réalisés': {
      en: '6. Work performed', de: '6. Durchgeführte Arbeiten', nl: '6. Uitgevoerde werkzaamheden',
      es: '6. Trabajos realizados', it: '6. Lavori eseguiti', pt: '6. Trabalhos realizados'
    },
    '7. Travaux à prévoir': {
      en: '7. Work to be planned', de: '7. Geplante Arbeiten', nl: '7. Gepland werk',
      es: '7. Trabajos a prever', it: '7. Lavori da prevedere', pt: '7. Trabalhos a prever'
    },
    '8. Pièces de rechange': {
      en: '8. Spare parts', de: '8. Ersatzteile', nl: '8. Reserveonderdelen',
      es: '8. Piezas de repuesto', it: '8. Pezzi di ricambio', pt: '8. Peças sobressalentes'
    },
    '8. Photos complémentaires': {
      en: '8. Additional photos', de: '8. Zusätzliche Fotos', nl: "8. Aanvullende foto's",
      es: '8. Fotos complementarias', it: '8. Foto aggiuntive', pt: '8. Fotos complementares'
    },
    '9. Photos complémentaires': {
      en: '9. Additional photos', de: '9. Zusätzliche Fotos', nl: "9. Aanvullende foto's",
      es: '9. Fotos complementarias', it: '9. Foto aggiuntive', pt: '9. Fotos complementares'
    },
    '9. Validation': {
      en: '9. Validation', de: '9. Bestätigung', nl: '9. Validatie',
      es: '9. Validación', it: '9. Convalida', pt: '9. Validação'
    },
    '10. Validation': {
      en: '10. Validation', de: '10. Bestätigung', nl: '10. Validatie',
      es: '10. Validación', it: '10. Convalida', pt: '10. Validação'
    },

    /* Domaines et catégories par défaut */
    'Mécanique': { en: 'Mechanical', de: 'Mechanik', nl: 'Mechanisch', es: 'Mecánica', it: 'Meccanica', pt: 'Mecânica' },
    'Électrique': { en: 'Electrical', de: 'Elektrik', nl: 'Elektrisch', es: 'Eléctrica', it: 'Elettrica', pt: 'Elétrica' },
    'Automatisme': {
      en: 'Automation', de: 'Automatisierung', nl: 'Automatisering',
      es: 'Automatización', it: 'Automazione', pt: 'Automação'
    },
    'Sécurité': { en: 'Safety', de: 'Sicherheit', nl: 'Veiligheid', es: 'Seguridad', it: 'Sicurezza', pt: 'Segurança' },
    'Problème de sécurité': {
      en: 'Safety issue', de: 'Sicherheitsproblem', nl: 'Veiligheidsprobleem',
      es: 'Problema de seguridad', it: 'Problema di sicurezza', pt: 'Problema de segurança'
    },
    'Priorité basse': {
      en: 'Low priority', de: 'Niedrige Priorität', nl: 'Lage prioriteit',
      es: 'Prioridad baja', it: 'Priorità bassa', pt: 'Prioridade baixa'
    },
    'Urgent': { en: 'Urgent', de: 'Dringend', nl: 'Urgent', es: 'Urgente', it: 'Urgente', pt: 'Urgente' },
    'Priorité haute': {
      en: 'High priority', de: 'Hohe Priorität', nl: 'Hoge prioriteit',
      es: 'Prioridad alta', it: 'Priorità alta', pt: 'Prioridade alta'
    },
    'Basse': { en: 'Low', de: 'Niedrig', nl: 'Laag', es: 'Baja', it: 'Bassa', pt: 'Baixa' },
    'Informatif': {
      en: 'Informational', de: 'Informativ', nl: 'Informatief',
      es: 'Informativo', it: 'Informativo', pt: 'Informativo'
    },

    /* Signatures et validation */
    'Le client (bon pour accord)': {
      en: 'The customer (approved)', de: 'Der Kunde (Genehmigung)', nl: 'De klant (voor akkoord)',
      es: 'El cliente (conforme)', it: 'Il cliente (per approvazione)', pt: 'O cliente (de acordo)'
    },
    'Le technicien': {
      en: 'The technician', de: 'Der Techniker', nl: 'De technicus',
      es: 'El técnico', it: 'Il tecnico', pt: 'O técnico'
    },
    'Signature non recueillie': {
      en: 'Signature not obtained', de: 'Unterschrift nicht erhalten', nl: 'Handtekening niet verkregen',
      es: 'Firma no recogida', it: 'Firma non raccolta', pt: 'Assinatura não recolhida'
    },
    'Le client reconnaît avoir pris connaissance du présent rapport, avoir reçu les explications du technicien et accepte les constats et travaux décrits.': {
      en: "The customer acknowledges having read this report, having received the technician's explanations, and accepts the findings and the work described.",
      de: 'Der Kunde bestätigt, diesen Bericht zur Kenntnis genommen, die Erläuterungen des Technikers erhalten zu haben und die beschriebenen Feststellungen und Arbeiten zu akzeptieren.',
      nl: 'De klant verklaart kennis te hebben genomen van dit verslag, de uitleg van de technicus te hebben ontvangen en de beschreven vaststellingen en werkzaamheden te aanvaarden.',
      es: 'El cliente reconoce haber leído el presente informe, haber recibido las explicaciones del técnico y acepta las observaciones y los trabajos descritos.',
      it: "Il cliente dichiara di aver preso visione del presente rapporto, di aver ricevuto le spiegazioni del tecnico e accetta le constatazioni e i lavori descritti.",
      pt: 'O cliente reconhece ter tomado conhecimento do presente relatório, ter recebido as explicações do técnico e aceita os factos e os trabalhos descritos.'
    },
    'La signature du client vaut pour acceptation du devis final et validation des pièces de rechange ci-dessus.': {
      en: "The customer's signature constitutes acceptance of the final quote and validation of the spare parts listed above.",
      de: 'Die Unterschrift des Kunden gilt als Annahme des endgültigen Kostenvoranschlags und Genehmigung der oben aufgeführten Ersatzteile.',
      nl: 'De handtekening van de klant geldt als aanvaarding van de definitieve offerte en goedkeuring van bovenstaande reserveonderdelen.',
      es: 'La firma del cliente supone la aceptación del presupuesto final y la validación de las piezas de repuesto arriba indicadas.',
      it: 'La firma del cliente costituisce accettazione del preventivo finale e convalida dei pezzi di ricambio sopra elencati.',
      pt: 'A assinatura do cliente constitui a aceitação do orçamento final e a validação das peças sobressalentes acima indicadas.'
    },
    'Le client reconnaît avoir pris connaissance du présent rapport, avoir reçu les explications du technicien et accepte les constats et travaux décrits. La signature du client vaut pour acceptation du devis final et validation des pièces de rechange ci-dessus.': {
      en: "The customer acknowledges having read this report, having received the technician's explanations, and accepts the findings and the work described. The customer's signature constitutes acceptance of the final quote and validation of the spare parts listed above.",
      de: 'Der Kunde bestätigt, diesen Bericht zur Kenntnis genommen, die Erläuterungen des Technikers erhalten zu haben und die beschriebenen Feststellungen und Arbeiten zu akzeptieren. Die Unterschrift des Kunden gilt als Annahme des endgültigen Kostenvoranschlags und Genehmigung der oben aufgeführten Ersatzteile.',
      nl: 'De klant verklaart kennis te hebben genomen van dit verslag, de uitleg van de technicus te hebben ontvangen en de beschreven vaststellingen en werkzaamheden te aanvaarden. De handtekening van de klant geldt als aanvaarding van de definitieve offerte en goedkeuring van bovenstaande reserveonderdelen.',
      es: 'El cliente reconoce haber leído el presente informe, haber recibido las explicaciones del técnico y acepta las observaciones y los trabajos descritos. La firma del cliente supone la aceptación del presupuesto final y la validación de las piezas de repuesto arriba indicadas.',
      it: 'Il cliente dichiara di aver preso visione del presente rapporto, di aver ricevuto le spiegazioni del tecnico e accetta le constatazioni e i lavori descritti. La firma del cliente costituisce accettazione del preventivo finale e convalida dei pezzi di ricambio sopra elencati.',
      pt: 'O cliente reconhece ter tomado conhecimento do presente relatório, ter recebido as explicações do técnico e aceita os factos e os trabalhos descritos. A assinatura do cliente constitui a aceitação do orçamento final e a validação das peças sobressalentes acima indicadas.'
    },
    'Le client reconnaît avoir pris connaissance du présent rapport et accepte les constats et travaux décrits.': {
      en: 'The customer acknowledges having read this report and accepts the findings and the work described.',
      de: 'Der Kunde bestätigt, diesen Bericht zur Kenntnis genommen zu haben, und akzeptiert die beschriebenen Feststellungen und Arbeiten.',
      nl: 'De klant verklaart kennis te hebben genomen van dit verslag en de beschreven vaststellingen en werkzaamheden te aanvaarden.',
      es: 'El cliente reconoce haber leído el presente informe y acepta las observaciones y los trabajos descritos.',
      it: 'Il cliente dichiara di aver preso visione del presente rapporto e accetta le constatazioni e i lavori descritti.',
      pt: 'O cliente reconhece ter tomado conhecimento do presente relatório e aceita os factos e os trabalhos descritos.'
    },

    /* Divers */
    'en cours': { en: 'in progress', de: 'läuft noch', nl: 'loopt nog', es: 'en curso', it: 'in corso', pt: 'em curso' },
    '(aucune annotation)': {
      en: '(no comment)', de: '(keine Anmerkung)', nl: '(geen opmerking)',
      es: '(sin anotación)', it: '(nessuna annotazione)', pt: '(sem anotação)'
    },
    'Aucun point de sécurité ou d\'urgence relevé.': {
      en: 'No safety or urgent point reported.', de: 'Keine Sicherheits- oder Notfallpunkte gemeldet.',
      nl: 'Geen veiligheids- of urgentiepunten gemeld.', es: 'No se ha detectado ningún punto de seguridad o urgencia.',
      it: "Nessun punto di sicurezza o urgenza rilevato.", pt: 'Nenhum ponto de segurança ou urgência detetado.'
    },
    "Siège social et site de production n°1": {
      en: 'Head office and production site no. 1', de: 'Firmensitz und Produktionsstätte Nr. 1',
      nl: 'Hoofdzetel en productiesite nr. 1', es: 'Sede social y planta de producción n.º 1',
      it: 'Sede legale e stabilimento n. 1', pt: 'Sede social e unidade de produção n.º 1'
    },
    'Site de production n°2': {
      en: 'Production site no. 2', de: 'Produktionsstätte Nr. 2', nl: 'Productiesite nr. 2',
      es: 'Planta de producción n.º 2', it: 'Stabilimento n. 2', pt: 'Unidade de produção n.º 2'
    },
    'Siège social et site de production n°1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, France': {
      en: 'Head office and production site no. 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, France',
      de: 'Firmensitz und Produktionsstätte Nr. 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, Frankreich',
      nl: 'Hoofdzetel en productiesite nr. 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, Frankrijk',
      es: 'Sede social y planta de producción n.º 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, Francia',
      it: 'Sede legale e stabilimento n. 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, Francia',
      pt: 'Sede social e unidade de produção n.º 1 – 1, rue du Jariel, ZAC Les Longs Sillons, 77120 Coulommiers, França'
    },
    '50 allée des érables, 01150 Blyes, France': {
      en: '50 allée des érables, 01150 Blyes, France', de: '50 allée des érables, 01150 Blyes, Frankreich',
      nl: '50 allée des érables, 01150 Blyes, Frankrijk', es: '50 allée des érables, 01150 Blyes, Francia',
      it: '50 allée des érables, 01150 Blyes, Francia', pt: '50 allée des érables, 01150 Blyes, França'
    },
    'Site de production n°2 – 50 allée des érables, 01150 Blyes, France': {
      en: 'Production site no. 2 – 50 allée des érables, 01150 Blyes, France',
      de: 'Produktionsstätte Nr. 2 – 50 allée des érables, 01150 Blyes, Frankreich',
      nl: 'Productiesite nr. 2 – 50 allée des érables, 01150 Blyes, Frankrijk',
      es: 'Planta de producción n.º 2 – 50 allée des érables, 01150 Blyes, Francia',
      it: 'Stabilimento n. 2 – 50 allée des érables, 01150 Blyes, Francia',
      pt: 'Unidade de produção n.º 2 – 50 allée des érables, 01150 Blyes, França'
    },
    'Rapport': {
      en: 'Report', de: 'Bericht', nl: 'Verslag', es: 'Informe', it: 'Rapporto', pt: 'Relatório'
    },

    /* Formation des opérateurs */
    'Formation des opérateurs': { en: 'Operator training', de: 'Bedienerschulung', nl: 'Opleiding van de operators', es: 'Formación de los operarios', it: 'Formazione degli operatori', pt: 'Formação dos operadores' },
    'Formation': { en: 'Training', de: 'Schulung', nl: 'Opleiding', es: 'Formación', it: 'Formazione', pt: 'Formação' },
    'Opérateurs formés': { en: 'Operators trained', de: 'Geschulte Bediener', nl: 'Opgeleide operators', es: 'Operarios formados', it: 'Operatori formati', pt: 'Operadores formados' },
    'Sujets': { en: 'Topics', de: 'Themen', nl: 'Onderwerpen', es: 'Temas', it: 'Argomenti', pt: 'Temas' },
    'Sujet': { en: 'Topic', de: 'Thema', nl: 'Onderwerp', es: 'Tema', it: 'Argomento', pt: 'Tema' },
    'Formateur': { en: 'Trainer', de: 'Trainer', nl: 'Opleider', es: 'Formador', it: 'Formatore', pt: 'Formador' },
    'Date et horaires': { en: 'Date and times', de: 'Datum und Uhrzeiten', nl: 'Datum en tijden', es: 'Fecha y horario', it: 'Data e orari', pt: 'Data e horário' },
    "Méthode d'évaluation": { en: 'Assessment method', de: 'Bewertungsmethode', nl: 'Beoordelingsmethode', es: 'Método de evaluación', it: 'Metodo di valutazione', pt: 'Método de avaliação' },
    'Documents remis': { en: 'Documents provided', de: 'Übergebene Unterlagen', nl: 'Overhandigde documenten', es: 'Documentos entregados', it: 'Documenti consegnati', pt: 'Documentos entregues' },
    'Programme de la formation (points abordés)': { en: 'Training programme (topics covered)', de: 'Schulungsprogramm (behandelte Themen)', nl: 'Opleidingsprogramma (behandelde onderwerpen)', es: 'Programa de la formación (temas tratados)', it: 'Programma della formazione (argomenti trattati)', pt: 'Programa da formação (temas abordados)' },
    'Contenu et observations': { en: 'Content and observations', de: 'Inhalt und Bemerkungen', nl: 'Inhoud en opmerkingen', es: 'Contenido y observaciones', it: 'Contenuto e osservazioni', pt: 'Conteúdo e observações' },
    "Feuille d'émargement": { en: 'Attendance sheet', de: 'Teilnehmerliste', nl: 'Aanwezigheidslijst', es: 'Hoja de asistencia', it: 'Foglio presenze', pt: 'Folha de presenças' },
    'Aucun participant enregistré.': { en: 'No participant recorded.', de: 'Kein Teilnehmer erfasst.', nl: 'Geen deelnemer geregistreerd.', es: 'Ningún participante registrado.', it: 'Nessun partecipante registrato.', pt: 'Nenhum participante registado.' },
    'N°': { en: 'No.', de: 'Nr.', nl: 'Nr.', es: 'N.º', it: 'N.', pt: 'N.º' },
    'Nom et prénom': { en: 'Full name', de: 'Name und Vorname', nl: 'Naam en voornaam', es: 'Nombre y apellidos', it: 'Nome e cognome', pt: 'Nome completo' },
    'Fonction / poste': { en: 'Job / position', de: 'Funktion / Arbeitsplatz', nl: 'Functie / werkpost', es: 'Función / puesto', it: 'Funzione / postazione', pt: 'Função / posto' },
    'Évaluation': { en: 'Assessment', de: 'Bewertung', nl: 'Beoordeling', es: 'Evaluación', it: 'Valutazione', pt: 'Avaliação' },
    'Signature': { en: 'Signature', de: 'Unterschrift', nl: 'Handtekening', es: 'Firma', it: 'Firma', pt: 'Assinatura' },
    'Non évalué': { en: 'Not assessed', de: 'Nicht bewertet', nl: 'Niet beoordeeld', es: 'No evaluado', it: 'Non valutato', pt: 'Não avaliado' },
    'Signé': { en: 'Signed', de: 'Unterschrieben', nl: 'Ondertekend', es: 'Firmado', it: 'Firmato', pt: 'Assinado' },
    'Non signé': { en: 'Not signed', de: 'Nicht unterschrieben', nl: 'Niet ondertekend', es: 'Sin firmar', it: 'Non firmato', pt: 'Não assinado' },
    'participant': { en: 'participant', de: 'Teilnehmer', nl: 'deelnemer', es: 'participante', it: 'partecipante', pt: 'participante' },
    'participants': { en: 'participants', de: 'Teilnehmer', nl: 'deelnemers', es: 'participantes', it: 'partecipanti', pt: 'participantes' },
    'session': { en: 'session', de: 'Sitzung', nl: 'sessie', es: 'sesión', it: 'sessione', pt: 'sessão' },
    'sessions': { en: 'sessions', de: 'Sitzungen', nl: 'sessies', es: 'sesiones', it: 'sessioni', pt: 'sessões' },
    'Acquis': { en: 'Competent', de: 'Erworben', nl: 'Verworven', es: 'Adquirido', it: 'Acquisito', pt: 'Adquirido' },
    'À consolider': { en: 'Needs reinforcement', de: 'Zu festigen', nl: 'Te versterken', es: 'A reforzar', it: 'Da consolidare', pt: 'A consolidar' },
    'Non acquis': { en: 'Not yet competent', de: 'Nicht erworben', nl: 'Niet verworven', es: 'No adquirido', it: 'Non acquisito', pt: 'Não adquirido' },
    'Émargement': { en: 'Signatures', de: 'Unterschriften', nl: 'Handtekeningen', es: 'Firmas', it: 'Firme', pt: 'Assinaturas' },
    'Bilan': { en: 'Summary', de: 'Bilanz', nl: 'Overzicht', es: 'Balance', it: 'Bilancio', pt: 'Balanço' },
    'Chaque participant atteste, par sa signature, avoir suivi la formation décrite ci-dessus.': {
      en: 'Each participant certifies, by signing, that they attended the training described above.',
      de: 'Jeder Teilnehmer bestätigt mit seiner Unterschrift, an der oben beschriebenen Schulung teilgenommen zu haben.',
      nl: 'Elke deelnemer verklaart met zijn handtekening de hierboven beschreven opleiding te hebben gevolgd.',
      es: 'Cada participante certifica con su firma haber seguido la formación descrita arriba.',
      it: 'Ogni partecipante attesta, con la propria firma, di aver seguito la formazione sopra descritta.',
      pt: 'Cada participante atesta, com a sua assinatura, ter frequentado a formação acima descrita.'
    },
    "Le formateur atteste l'évaluation indiquée pour chaque participant.": {
      en: 'The trainer certifies the assessment shown for each participant.',
      de: 'Der Trainer bestätigt die für jeden Teilnehmer angegebene Bewertung.',
      nl: 'De opleider bevestigt de voor elke deelnemer vermelde beoordeling.',
      es: 'El formador certifica la evaluación indicada para cada participante.',
      it: 'Il formatore attesta la valutazione indicata per ciascun partecipante.',
      pt: 'O formador atesta a avaliação indicada para cada participante.'
    },
    'Un complément de formation est recommandé pour les participants « À consolider » ou « Non acquis ».': {
      en: 'Additional training is recommended for participants rated "Needs reinforcement" or "Not yet competent".',
      de: 'Für Teilnehmer mit „Zu festigen“ oder „Nicht erworben“ wird eine ergänzende Schulung empfohlen.',
      nl: 'Een aanvullende opleiding wordt aanbevolen voor deelnemers met "Te versterken" of "Niet verworven".',
      es: 'Se recomienda una formación complementaria para los participantes «A reforzar» o «No adquirido».',
      it: 'Si raccomanda una formazione integrativa per i partecipanti «Da consolidare» o «Non acquisito».',
      pt: 'Recomenda-se uma formação complementar para os participantes «A consolidar» ou «Não adquirido».'
    },
    'Le client confirme que les opérateurs listés dans la partie « Formation des opérateurs » ont suivi la formation décrite.': {
      en: 'The customer confirms that the operators listed in the "Operator training" section attended the training described.',
      de: 'Der Kunde bestätigt, dass die im Abschnitt „Bedienerschulung“ aufgeführten Bediener an der beschriebenen Schulung teilgenommen haben.',
      nl: 'De klant bevestigt dat de operators vermeld in het deel "Opleiding van de operators" de beschreven opleiding hebben gevolgd.',
      es: 'El cliente confirma que los operarios enumerados en el apartado «Formación de los operarios» han seguido la formación descrita.',
      it: 'Il cliente conferma che gli operatori elencati nella sezione «Formazione degli operatori» hanno seguito la formazione descritta.',
      pt: 'O cliente confirma que os operadores indicados na secção «Formação dos operadores» frequentaram a formação descrita.'
    },
    /* Intitulés, programme, évaluation et documents proposés par l'assistant */
    'Conduite de la machine': { en: 'Machine operation', de: 'Bedienung der Maschine', nl: 'Bediening van de machine', es: 'Manejo de la máquina', it: 'Conduzione della macchina', pt: 'Operação da máquina' },
    'Changement de format': { en: 'Format changeover', de: 'Formatwechsel', nl: 'Formaatwissel', es: 'Cambio de formato', it: 'Cambio formato', pt: 'Mudança de formato' },
    'Nettoyage et hygiène': { en: 'Cleaning and hygiene', de: 'Reinigung und Hygiene', nl: 'Reiniging en hygiëne', es: 'Limpieza e higiene', it: 'Pulizia e igiene', pt: 'Limpeza e higiene' },
    'Maintenance de premier niveau': { en: 'First-level maintenance', de: 'Wartung der ersten Ebene', nl: 'Eerstelijnsonderhoud', es: 'Mantenimiento de primer nivel', it: 'Manutenzione di primo livello', pt: 'Manutenção de primeiro nível' },
    'Sécurité de la machine': { en: 'Machine safety', de: 'Maschinensicherheit', nl: 'Machineveiligheid', es: 'Seguridad de la máquina', it: 'Sicurezza della macchina', pt: 'Segurança da máquina' },
    'Prise en main après mise en service': { en: 'Handover after commissioning', de: 'Einweisung nach der Inbetriebnahme', nl: 'Overdracht na inbedrijfstelling', es: 'Capacitación tras la puesta en marcha', it: 'Presa in carico dopo la messa in servizio', pt: 'Familiarização após a colocação em serviço' },
    "Consignes de sécurité : arrêts d'urgence, protecteurs, consignation": { en: 'Safety instructions: emergency stops, guards, lockout/tagout', de: 'Sicherheitshinweise: Not-Halt, Schutzeinrichtungen, Freischalten und Sichern', nl: 'Veiligheidsvoorschriften: noodstoppen, afschermingen, vergrendeling', es: 'Consignas de seguridad: paradas de emergencia, protecciones, consignación', it: 'Istruzioni di sicurezza: arresti di emergenza, ripari, messa in sicurezza', pt: 'Instruções de segurança: paragens de emergência, proteções, consignação' },
    'Présentation de la machine et de ses organes': { en: 'Presentation of the machine and its components', de: 'Vorstellung der Maschine und ihrer Baugruppen', nl: 'Voorstelling van de machine en haar onderdelen', es: 'Presentación de la máquina y sus componentes', it: 'Presentazione della macchina e dei suoi organi', pt: 'Apresentação da máquina e dos seus componentes' },
    'Mise en marche et arrêt': { en: 'Start-up and shutdown', de: 'Einschalten und Ausschalten', nl: 'Opstarten en stoppen', es: 'Puesta en marcha y parada', it: 'Avviamento e arresto', pt: 'Arranque e paragem' },
    'Conduite en production (pupitre et écran)': { en: 'Operation in production (control panel and HMI)', de: 'Bedienung in der Produktion (Bedienpult und Bildschirm)', nl: 'Bediening in productie (bedieningspaneel en scherm)', es: 'Manejo en producción (pupitre y pantalla)', it: 'Conduzione in produzione (pulpito e schermo)', pt: 'Operação em produção (consola e ecrã)' },
    'Changement de format et réglages': { en: 'Format changeover and adjustments', de: 'Formatwechsel und Einstellungen', nl: 'Formaatwissel en afstellingen', es: 'Cambio de formato y ajustes', it: 'Cambio formato e regolazioni', pt: 'Mudança de formato e afinações' },
    'Alarmes, défauts et remise en route': { en: 'Alarms, faults and restart', de: 'Alarme, Störungen und Wiederanlauf', nl: 'Alarmen, storingen en herstart', es: 'Alarmas, fallos y rearranque', it: 'Allarmi, guasti e riavvio', pt: 'Alarmes, falhas e rearranque' },
    'Maintenance de premier niveau : graissage, contrôles': { en: 'First-level maintenance: lubrication, checks', de: 'Wartung der ersten Ebene: Schmierung, Kontrollen', nl: 'Eerstelijnsonderhoud: smering, controles', es: 'Mantenimiento de primer nivel: engrase, controles', it: 'Manutenzione di primo livello: lubrificazione, controlli', pt: 'Manutenção de primeiro nível: lubrificação, controlos' },
    'Mise en pratique sur la machine': { en: 'Hands-on practice on the machine', de: 'Praktische Übung an der Maschine', nl: 'Praktijkoefening op de machine', es: 'Práctica en la máquina', it: 'Esercitazione pratica sulla macchina', pt: 'Prática na máquina' },
    'Observation au poste de travail': { en: 'Observation at the workstation', de: 'Beobachtung am Arbeitsplatz', nl: 'Observatie op de werkpost', es: 'Observación en el puesto de trabajo', it: 'Osservazione alla postazione di lavoro', pt: 'Observação no posto de trabalho' },
    'Questions orales': { en: 'Oral questions', de: 'Mündliche Fragen', nl: 'Mondelinge vragen', es: 'Preguntas orales', it: 'Domande orali', pt: 'Perguntas orais' },
    'Questionnaire écrit': { en: 'Written questionnaire', de: 'Schriftlicher Fragebogen', nl: 'Schriftelijke vragenlijst', es: 'Cuestionario escrito', it: 'Questionario scritto', pt: 'Questionário escrito' },
    "Manuel d'utilisation": { en: 'User manual', de: 'Bedienungsanleitung', nl: 'Gebruikershandleiding', es: 'Manual de usuario', it: "Manuale d'uso", pt: 'Manual de utilização' },
    'Modes opératoires / fiches de poste': { en: 'Operating procedures / workstation sheets', de: 'Arbeitsanweisungen / Arbeitsplatzblätter', nl: 'Werkinstructies / werkpostfiches', es: 'Procedimientos operativos / fichas de puesto', it: 'Procedure operative / schede di postazione', pt: 'Procedimentos operativos / fichas de posto' },
    'Support de formation': { en: 'Training material', de: 'Schulungsunterlagen', nl: 'Opleidingsmateriaal', es: 'Material de formación', it: 'Materiale formativo', pt: 'Material de formação' },
    'Opérateur': { en: 'Operator', de: 'Bediener', nl: 'Operator', es: 'Operario', it: 'Operatore', pt: 'Operador' },
    'Conducteur de ligne': { en: 'Line operator', de: 'Linienführer', nl: 'Lijnoperator', es: 'Conductor de línea', it: 'Conduttore di linea', pt: 'Condutor de linha' },
    "Chef d'équipe": { en: 'Team leader', de: 'Schichtleiter', nl: 'Ploegleider', es: 'Jefe de equipo', it: 'Capo squadra', pt: 'Chefe de equipa' },
    'Régleur': { en: 'Setter', de: 'Einrichter', nl: 'Insteller', es: 'Ajustador', it: 'Attrezzista', pt: 'Afinador' },
    'Technicien de maintenance': { en: 'Maintenance technician', de: 'Instandhaltungstechniker', nl: 'Onderhoudstechnicus', es: 'Técnico de mantenimiento', it: 'Tecnico di manutenzione', pt: 'Técnico de manutenção' },
    'Responsable de production': { en: 'Production manager', de: 'Produktionsleiter', nl: 'Productieverantwoordelijke', es: 'Responsable de producción', it: 'Responsabile di produzione', pt: 'Responsável de produção' }
  };

  /* --- Libellés qui peuvent être traduits en début de chaîne ------------ */
  /* (« Mécanique : 3 », « Sécurité : 1 »). On ne touche jamais au reste :
     un texte saisi par le technicien n'est pas modifié par le dictionnaire. */
  const PREFIXABLES = [
    'mécanique', 'électrique', 'automatisme', 'sécurité', 'urgent', 'priorité haute',
    'basse', 'informatif', 'catégorie', 'nombre', 'photos', 'date', 'client', 'technicien',
    'machine', 'modèle', 'lieu', 'intervention', 'pièces de rechange', 'dénomination', 'quantité',
    'machine (n° série)', 'machine (n° de série)',
    'machines visitées', 'machine concernée', 'techniciens sur site', 'technicien(s) sur site',
    'relevé des journées d\'intervention', 'journées d\'intervention', 'total cumulé', 'activité / travaux'
  ];

  /* --- Règles de traduction des libellés composés ----------------------- */
  /* [motif, remplacement] — appliquées dans l'ordre. */
  const REGLES = {
    en: [
      [/^N° (.*)$/, 'No. $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Date: $1 at $2'],
      [/^Date : (.*)$/, 'Date: $1'],
      [/^Édité le (.*)$/, 'Generated on $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Page $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 event(s)'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 spare part(s)'],
      [/^(\d+)\s+machine\(s\)$/, '$1 machine(s)'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 day(s)'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 technician(s)'],
      [/^(\d+) photo\(s\)$/, '$1 photo(s)'],
      [/^Photo (\d+)$/, 'Photo $1'],
      [/^À l'attention de (.*),$/, 'For the attention of $1,'],
      [/^À (.+), le (.+),$/, 'In $1, on $2,'],
      [/^Heures passées sur site : (.*)$/, 'Hours spent on site: $1'],
      [/^Photos : (.*)$/, 'Photos: $1'],
      [/^Siège social et site de production n°1 – (.*)$/, 'Head office and production site no. 1 – $1'],
      [/^Site de production n°2 – (.*)$/, 'Production site no. 2 – $1'],
      [/^Compte rendu d'intervention N° (.*)$/, 'Service report No. $1']
    ],
    de: [
      [/^N° (.*)$/, 'Nr. $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Datum: $1 um $2'],
      [/^Date : (.*)$/, 'Datum: $1'],
      [/^Édité le (.*)$/, 'Erstellt am $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Seite $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 Ereignis(se)'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 Ersatzteil(e)'],
      [/^(\d+)\s+machine\(s\)$/, '$1 Maschine(n)'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 Tag(e)'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 Techniker'],
      [/^(\d+) photo\(s\)$/, '$1 Foto(s)'],
      [/^Photo (\d+)$/, 'Foto $1'],
      [/^À l'attention de (.*),$/, 'z. Hd. $1,'],
      [/^À (.+), le (.+),$/, '$1, den $2,'],
      [/^Heures passées sur site : (.*)$/, 'Vor Ort verbrachte Stunden: $1'],
      [/^Photos : (.*)$/, 'Fotos: $1'],
      [/^Compte rendu d'intervention N° (.*)$/, 'Servicebericht Nr. $1']
    ],
    nl: [
      [/^N° (.*)$/, 'Nr. $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Datum: $1 om $2'],
      [/^Date : (.*)$/, 'Datum: $1'],
      [/^Édité le (.*)$/, 'Aangemaakt op $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Pagina $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 gebeurtenis(sen)'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 reserveonderde(e)l(en)'],
      [/^(\d+)\s+machine\(s\)$/, '$1 machine(s)'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 dag(en)'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 technicus/technici'],
      [/^(\d+) photo\(s\)$/, "$1 foto('s)"],
      [/^Photo (\d+)$/, 'Foto $1'],
      [/^À l'attention de (.*),$/, 'Ter attentie van $1,'],
      [/^À (.+), le (.+),$/, '$1, $2,'],
      [/^Heures passées sur site : (.*)$/, 'Uren ter plaatse: $1'],
      [/^Photos : (.*)$/, "Foto's: $1"],
      [/^Compte rendu d'intervention N° (.*)$/, 'Serviceverslag nr. $1']
    ],
    es: [
      [/^N° (.*)$/, 'N.º $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Fecha: $1 a las $2'],
      [/^Date : (.*)$/, 'Fecha: $1'],
      [/^Édité le (.*)$/, 'Emitido el $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Página $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 evento(s)'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 pieza(s) de repuesto'],
      [/^(\d+)\s+machine\(s\)$/, '$1 máquina(s)'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 jornada(s)'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 técnico(s)'],
      [/^(\d+) photo\(s\)$/, '$1 foto(s)'],
      [/^Photo (\d+)$/, 'Foto $1'],
      [/^À l'attention de (.*),$/, 'A la atención de $1,'],
      [/^À (.+), le (.+),$/, 'En $1, a $2,'],
      [/^Heures passées sur site : (.*)$/, 'Horas en planta: $1'],
      [/^Photos : (.*)$/, 'Fotos: $1'],
      [/^Compte rendu d'intervention N° (.*)$/, 'Informe de intervención n.º $1']
    ],
    it: [
      [/^N° (.*)$/, 'N. $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Data: $1 alle $2'],
      [/^Date : (.*)$/, 'Data: $1'],
      [/^Édité le (.*)$/, 'Creato il $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Pagina $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 evento/i'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 pezzo/i di ricambio'],
      [/^(\d+)\s+machine\(s\)$/, '$1 macchina/e'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 giorno/i'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 tecnico/i'],
      [/^(\d+) photo\(s\)$/, '$1 foto'],
      [/^Photo (\d+)$/, 'Foto $1'],
      [/^À l'attention de (.*),$/, "All'attenzione di $1,"],
      [/^À (.+), le (.+),$/, 'A $1, il $2,'],
      [/^Heures passées sur site : (.*)$/, 'Ore passate in loco: $1'],
      [/^Photos : (.*)$/, 'Foto: $1'],
      [/^Compte rendu d'intervention N° (.*)$/, 'Rapporto di intervento n. $1']
    ],
    pt: [
      [/^N° (.*)$/, 'N.º $1'],
      [/^Tél\. (.*)$/, 'Tel. $1'],
      [/^Date : (.*) à (.*)$/, 'Data: $1 às $2'],
      [/^Date : (.*)$/, 'Data: $1'],
      [/^Édité le (.*)$/, 'Emitido em $1'],
      [/^Page (\d+) \/ (\d+)$/, 'Página $1 / $2'],
      [/^(\d+) év[èé]nement\(s\)$/, '$1 evento(s)'],
      [/^(\d+)\s+pièce\(s\)$/, '$1 peça(s) sobressalente(s)'],
      [/^(\d+)\s+machine\(s\)$/, '$1 máquina(s)'],
      [/^(\d+)\s+jour(?:née)?\(s\)$/, '$1 dia(s)'],
      [/^(\d+)\s+technicien\(s\)$/, '$1 técnico(s)'],
      [/^(\d+) photo\(s\)$/, '$1 foto(s)'],
      [/^Photo (\d+)$/, 'Foto $1'],
      [/^À l'attention de (.*),$/, 'À atenção de $1,'],
      [/^À (.+), le (.+),$/, 'Em $1, a $2,'],
      [/^Heures passées sur site : (.*)$/, 'Horas no local: $1'],
      [/^Photos : (.*)$/, 'Fotos: $1'],
      [/^Compte rendu d'intervention N° (.*)$/, 'Relatório de intervenção n.º $1']
    ]
  };

  /* --- Phrase bilingue ajoutée au mail quand la traduction est active --- */
  const PHRASES = {
    en: 'Please find attached the service report in French and its English version.',
    de: 'Im Anhang finden Sie den Servicebericht auf Französisch und die deutsche Fassung.',
    nl: 'In bijlage vindt u het serviceverslag in het Frans en de Nederlandse versie.',
    es: 'Adjunto encontrará el informe de intervención en francés y su versión en español.',
    it: 'In allegato il rapporto di intervento in francese e la versione in italiano.',
    pt: 'Em anexo o relatório de intervenção em francês e a respetiva versão em português.'
  };

  /* ===================== Moteur de traduction ========================== */
  function normaliser(txt) {
    return String(txt == null ? '' : txt)
      .replace(/[\u2018\u2019\u02BC]/g, "'")      // apostrophes typographiques
      .replace(/\u00A0|\u202F|\u2009/g, ' ')        // espaces insécables
      .replace(/\s+/g, ' ')
      .trim();
  }
  function cle(txt) {
    return normaliser(txt).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  /* Index du dictionnaire : clé normalisée -> entrée d'origine. */
  const INDEX = {};
  Object.keys(DICO).forEach(function (fr) { INDEX[cle(fr)] = fr; });
  /* Libellés traduisibles en début de chaîne : on retrouve l'entrée exacte du
     dictionnaire (« mecanique » -> « Mécanique »). */
  /* Titres de sections numérotés (« 6. Travaux réalisés ») : le numéro est recalculé
     à l'impression (« 2. Travaux réalisés »), on retrouve donc l'entrée par son texte. */
  const INDEX_TITRES = {};
  Object.keys(DICO).forEach(function (fr) {
    const m = /^\d+\.\s+(.+)$/.exec(fr);
    if (m && !INDEX_TITRES[cle(m[1])]) INDEX_TITRES[cle(m[1])] = fr;
  });
  const INDEX_PREFIXES = {};
  PREFIXABLES.forEach(function (mot) {
    const ref = INDEX[cle(mot)];
    if (ref) INDEX_PREFIXES[cle(mot)] = ref;
  });

  function majusculesSiBesoin(origine, traduit) {
    const brut = normaliser(origine);
    /* « [INFORMATIF] », « SÉCURITÉ »… : on garde la casse du rapport. */
    const lettres = brut.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (lettres && lettres === lettres.toUpperCase()) return traduit.toUpperCase();
    return traduit;
  }

  const I18N = {
    langues: LANGUES,
    dico: DICO,

    /* Langue par son code, ou null. */
    langue: function (code) {
      return LANGUES.filter(function (l) { return l.code === code; })[0] || null;
    },
    nom: function (code) {
      const l = this.langue(code);
      return l ? l.nom : '';
    },
    natif: function (code) {
      const l = this.langue(code);
      return l ? l.natif : '';
    },
    /* « français + English », pour les libellés d'interface. */
    duo: function (code) {
      const l = this.langue(code);
      return l ? 'français + ' + l.natif : 'français';
    },

    /* Traduit un libellé du rapport. Renvoie le texte inchangé si :
       — la langue est le français, ou
       — le texte n'est pas un libellé connu (c'est une donnée du terrain). */
    traduire: function (txt, code) {
      if (!code || code === 'fr') return txt;
      const s = normaliser(txt);
      if (!s) return txt;

      /* 1. libellé exact */
      const ref = INDEX[cle(s)];
      if (ref) {
        const t = DICO[ref][code];
        if (t) return majusculesSiBesoin(txt, t);
      }

      /* 1 bis. titre de section numéroté : « 3. Points de priorité haute » est traduit
         quel que soit son numéro, le numéro est conservé. */
      const mn = /^(\d+\s*[.)]\s*)(\S.*)$/.exec(s);
      if (mn) {
        const refT = INDEX_TITRES[cle(mn[2])];
        if (refT && DICO[refT][code]) {
          return majusculesSiBesoin(txt, mn[1] + DICO[refT][code].replace(/^\d+\.\s+/, ''));
        }
        const t2 = I18N.traduire(mn[2], code);
        if (t2 !== mn[2]) return majusculesSiBesoin(txt, mn[1] + t2);
      }

      /* 2. libellés composés (numéro, téléphone, date, page, destinataire…) */
      const regles = REGLES[code] || [];
      for (let k = 0; k < regles.length; k++) {
        if (regles[k][0].test(s)) return s.replace(regles[k][0], regles[k][1]);
      }

      /* 3. libellé en début de chaîne suivi d'un séparateur
            (« Mécanique : 3 », « Sécurité — … ») : seul le libellé est traduit. */
      const m = /^([^:—•]{2,40}?)\s*(: | — | • )/.exec(s);
      if (m && INDEX_PREFIXES[cle(m[1])]) {
        const t = DICO[INDEX_PREFIXES[cle(m[1])]][code];
        if (t) return t + s.slice(m[1].length);
      }

      return txt;
    },

    /* Vérifie que le pack de langue est complet pour toutes les entrées. */
    complet: function (code) {
      const manquants = [];
      Object.keys(DICO).forEach(function (fr) {
        if (!DICO[fr][code]) manquants.push(fr);
      });
      return manquants;
    },

    /* Phrase bilingue pour le mail (null si la langue n'en a pas). */
    phraseTraduction: function (code) {
      return PHRASES[code] || null;
    }
  };

  global.LANGUES_BFR = LANGUES;
  global.I18N = I18N;
})(window);
