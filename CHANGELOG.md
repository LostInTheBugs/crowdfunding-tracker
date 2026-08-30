# Changelog

All notable changes to Crowdfunding Tracker are documented in this file.

## [2026.08.055] — 2026-08-30

### Added
- **PWA** : manifest (icônes 192/512 générées au thème de l'app), service worker (cache du shell + Chart.js, réseau d'abord pour les navigations, API jamais cachée — actif en HTTPS), meta theme-color/apple. Sur LAN HTTP, l'icône et le nom sont utilisés par « Ajouter à l'écran d'accueil » (⋮ → Ajouter à l'écran d'accueil).

## [2026.08.054] — 2026-08-30

### Changed
- **Page dédiée « 📈 Performance »** : « 📈 Évolution du patrimoine » et « 💰 Performance globale » quittent le Dashboard pour une nouvelle page (nav « Performance »). Le Dashboard garde les cartes stats + « 💵 Mise par plateforme » ; la page « ⚠️ Retards » est inchangée. Barre de navigation mobile compactée (8 entrées).

## [2026.08.053] — 2026-08-30

### Changed
- **Dashboard scindé en 2 pages** : « 📊 Dashboard » = cartes stats + 📈 Évolution du patrimoine + 💰 Performance globale + 💵 Mise par plateforme ; nouvelle page « ⚠️ Retards » (nav) = ⚠️ Retards par plateforme + ⚠️ Gravité des retards + ⏱️ Projets arrivés à échéance. Le toggle Tous/En cours et le mode 3 catégories/Fini vs Retard restent sur leurs panneaux respectifs.

## [2026.08.052] — 2026-08-30

### Added
- **📈 Évolution du patrimoine : courbes des indices superposables** — rangée de boutons « Comparer avec : » sous le titre : chaque indice (S&P 500, Nasdaq, MSCI World, STOXX 600, CAC 40, Livret A, + ceux ajoutés en ➕) s'affiche/masque d'un clic (persisté). La courbe simulée = tes dépôts placés dans un ETF capitalisant, mois par mois (perfs réelles Yahoo mensuelles depuis `src/index_history.json` — cohérentes au centime avec la colonne ETF Acc ; estimation par taux annualisé pour les indices ajoutés et le Livret A). Mode discret : tout en indice base 100.

## [2026.08.051] — 2026-08-30

### Added
- **Comparaison : indices personnalisables** — bouton **➕** dans « 📈 Comparaison » (nom + taux annualisé) ; bouton **🗑️** par ligne pour retirer un indice. Un indice ajouté est simulé aussi en « 💶 ETF Acc » (perf cumulée estimée depuis son taux annualisé, mêmes dates de départ) ; si aucun indice ne subsiste, le panneau propose d'en ajouter un.

## [2026.08.050] — 2026-08-30

### Added
- **📈 Évolution du patrimoine** (dashboard) : courbe mensuelle depuis le 1er investissement — Patrimoine (solde + valeur projets, calibré sur le patrimoine actuel) vs Mises cumulées. Série reconstruite depuis les opérations (cash par flux, encours au coût avec répartition capital/intérêts par projet, écart final réparti au prorata de l'encours). Mode discret : indices base 100.
- **📦 Détection de mise à jour** : `GET /api/check-update` compare la version locale à la dernière release GitHub (`GITHUB_REPO`/`GITHUB_TOKEN` en config, défaut `LostInTheBugs/crowdfunding-tracker`) → bandeau « Nouvelle version disponible » avec le changelog de la release, bouton Ignorer (persisté par version).

## [2026.08.049] — 2026-08-30

### Added
- `scripts/backup.sh` : backup nightly de la base (copie cohérente sqlite3 via `docker exec`, rotation 7 jours) — cron : `30 3 * * * /opt/crowdfunding-tracker/scripts/backup.sh`.

### Fixed
- Page Paramètres → À propos : texte périmé « Sync automatique : bonus futur » → mentionne la saisie manuelle, l'import xlsx et la synchro par extension.

## [2026.08.048] — 2026-08-30

### Changed
- **Responsive smartphone & tablette** : breakpoint tablette (≤900 px) — sidebar réduite aux icônes (avec tooltips), graphiques empilés sur 1 colonne ; breakpoint mobile (≤640 px) — **barre de navigation fixe en bas** (icône + libellé, safe-area iOS), cartes stats en 2 colonnes, formulaires sur 1 colonne, inputs 16 px (anti zoom iOS), légendes de graphiques avec retour à la ligne, boutons tactiles agrandis, en-têtes de panneaux avec boutons qui passent à la ligne.

## [2026.08.047] — 2026-08-30

### Added
- Dashboard → Performance globale → Comparaison : 2 nouvelles colonnes **« 💶 ETF Acc »** (montant total simulé) et **« Gain simulé »** — ce que les dépôts réels (3 890 €) vaudraient aujourd'hui s'ils avaient été placés à la date des 1ers achats (Bricks 27/09/2021 · LPB 03/10/2022) dans un ETF capitalisant suivant l'indice. Perfs cumulées réelles Yahoo Finance au 28/08/2026, stockées en base (`cum_bricks`/`cum_lpb`/`asof` dans `benchmarks`), Livret A = taux composé. Mode discret : montants masqués (%), note explicative + tooltip sous la table.

## [2026.08.046] — 2026-08-30

### Changed
- Colonne « Taux réel » (Projets) : nouveau code couleur — **rouge** si rendement négatif, **orange** si positif mais sous le taux annoncé (> 0,5 pt d'écart), **vert** si taux tenu (± 0,5 pt) ou meilleur. Tooltip documenté.

## [2026.08.045] — 2026-08-30

### Added
- Table « Projets » : nouvelle colonne **« Taux réel »** — rendement annuel réellement obtenu pour les projets **terminés** (capital + intérêts reçus, source de vérité = opérations, annualisé sur la durée réelle début → fin), coloré **rouge** si inférieur au taux annoncé, **vert** si supérieur ; sinon saisie manuelle `real_rate`, « — » pour les projets en cours. Exposé aussi dans l'export CSV (« Taux réel annualisé (%) »). Champ modale complété d'un hint.

## [2026.08.044] — 2026-08-30

### Added
- Dashboard : panneau « ⏱️ Projets arrivés à échéance » — barres empilées par plateforme (fini dans les temps / fini en retard / en retard actuellement), avec toggle de comparaison « Fini vs Retard » (fini à temps vs fini en retard + en retard actuel), légende nombre + mise par plateforme, mode discret et i18n FR/EN pris en charge.

## [2026.08.003] — 2026-08-29

### Added
- **Synchronisation par extension navigateur** (page ⚙️ Paramètres → « Synchronisation ») : token dédié (`/api/sync/token`) pour l'extension Chromium « Crowdfunding Tracker Sync » — **aucun mot de passe plateforme partagé** (l'utilisateur est déjà connecté chez Bricks/LPB).
- **`POST /api/scrape/ingest`** (auth token `X-Sync-Token`) : reçoit les captures JSON de l'extension (fetch/XHR interceptés), les stocke (table `scrape_captures`), en extrait heuristiquement les projets (taux/durée/échéance/statut/montants par noms de clés FR+EN), met à jour les champs vides des projets `auto_created` et produit un **rapport de conformité** (montant site vs montant exporté via opérations).
- **`GET /api/scrape/report`** + page « 📊 Rapport de synchronisation » : captures, projets détectés, champs remplis, écarts conformité (site vs exports), taux/statut trouvés sur le site.
- Table `sync_tokens` (1 ligne), `scrape_captures`, `scrape_report`.

## [2026.08.002] — 2026-08-29

### Added
- **Import xlsx** (page 📜 Opérations) : charge un export Bricks.co (`transactions-…xlsx`) ou La Première Brique (`payment_operations_export_…xlsx`) — détection automatique de la plateforme.
- **Création automatique des projets** : chaque souscription/achat crée le projet (nom, mise = total investi, date = premier investissement, statut `en_cours`, flag `auto_created`). Taux, durée, statut restent à saisir manuellement.
- **Historique brut des opérations** : table `operations` (date, type, statut, montant, projet, contrat), page dédiée avec filtres (plateforme, projet, recherche), pagination, badges de statut, et stats (total reçu / total investi / net).
- **Import idempotent** : UUID Bricks.co / fingerprint LPB (date+type+montant+statut) — ré-importer le même fichier ne crée aucun doublon.
- Montants FR (`35,56 €`) et dates `JJ/MM/AAAA` parsés pour LPB ; montants numériques et dates pour Bricks.co.

## [2026.08.001] — 2026-08-28

### Added
- Initial release: dashboard (mise totale, encours, intérêts perçus/latents, pertes, gain net, réinvesti)
- Projects CRUD with platforms (Bricks.co, La Première Brique), statuses, dates, rates
- Automatic delay detection vs expected end date
- Accrued-interest calculation (prorata, 365-day basis)
- Loss tracking for defaulted projects, reinvestment links between projects
- CSV export (semicolon-separated, Excel-compatible)
- Single-user auth (session cookie), change password
- Docker deployment with Traefik labels
