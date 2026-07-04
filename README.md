# 🎹 Piano Dashboard App — Carnet de Bord Pédagogique

> Un outil d'accompagnement et de suivi de pratique pianistique quotidien, conçu sur mesure et basé sur un programme d'apprentissage rigoureux de 30 à 36 mois.
>
> **Auteur** : © Hlabs 2026

---

## 📖 Le Projet

Ce dashboard est un compagnon de pratique quotidienne. Il a été pensé pour structurer le travail personnel d'un élève pianiste entre ses cours particuliers en présentiel. Il permet de :
1. **Suivre la trame hebdomadaire** (séances courtes le matin axées sur le déchiffrage et les gammes, séances longues le soir dédiées au répertoire et à la technique).
2. **Visualiser la feuille de route** de la **Phase 1 (Fondations - 16 semaines)**.
3. **Consigner les séances** (durée, notes de travail) et accumuler les points de blocage à aborder avec le professeur lors de la prochaine séance.
4. **Générer des rapports de jalon** complets prêts à être soumis à une IA (Claude) pour analyse critique et ajustement du rythme, conformément au programme.

---

## 🛠️ Architecture Technique & Choix Technologiques

Pour rester léger, réactif, portable et **100% gratuit d'hébergement**, le projet adopte une architecture **offline-first sans serveur backend (Serverless/No-Backend)** :

* **Frontend** : React 19 + Vite 8 + Tailwind CSS v4 (compilateur ultra-rapide basé sur Rust).
* **Moteur de base de données** : **SQLite** s'exécutant directement dans le navigateur du client grâce à **sql.js** (compilé en WebAssembly).
* **Fichier WASM local** : Le fichier `sql-wasm.wasm` est servi directement par le dossier public local (`/public/sql-wasm.wasm`) pour garantir des temps de chargement instantanés et éviter les restrictions CORS.
* **Persistance** : À chaque modification, la base de données SQLite est sérialisée et enregistrée dans le `localStorage` du navigateur.
* **Sauvegarde Privée (Import/Export)** : Un module de gestion des fichiers `.db` bruts permet d'exporter l'intégralité de la base de données locale sous forme de fichier physique ou d'importer une sauvegarde pour restaurer ses données sur un autre appareil (ordinateur, mobile).

---

## 📂 Structure des Tables SQLite (`src/db.js`)

La base de données SQLite interne est structurée ainsi :

1. **`settings`** : Stockage clé-valeur pour la configuration (ex. `phase1StartDate` pour calculer la semaine de cours courante).
2. **`practice_log`** : Journalisation des séances d'entraînement (id, date, créneau matin/soir/les-deux, minutes passées, notes textuelles).
3. **`lesson_notes`** : Liste des blocages et questions accumulés pour le professeur.

---

## ⚙️ Installation et Lancement Local

### Prérequis
* [Node.js](https://nodejs.org/) (v18 ou supérieur recommandé)
* [Git](https://git-scm.com/)

### Étape 1 : Installer les dépendances
```bash
npm install
```

### Étape 2 : Lancer le serveur de développement
```bash
npm run dev
```
L'application sera accessible localement sur `http://localhost:5173`.

---

## 🚀 Déploiement sur Render

Puisque le projet est entièrement exécuté côté client, il peut être hébergé gratuitement en tant que **Static Site** sur Render :

1. Créez un nouveau **Static Site** sur Render.
2. Connectez le dépôt GitHub `hlabsdev/piano-dashboard-app`.
3. Renseignez les paramètres suivants :
   * **Build Command** : `npm run build`
   * **Publish Directory** : `dist`
4. Déployez ! Vos données sont en sécurité dans votre navigateur et exportables à tout moment.
