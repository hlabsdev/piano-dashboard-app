# 🚀 Planification des Améliorations Futures (Roadmap logicielle)

Ce document décrit les fonctionnalités futures à implémenter dans le **Piano Dashboard** afin de suivre la progression de l'élève sur les 3 ans de son programme (30-36 mois) et d'intégrer des outils pédagogiques plus interactifs.

---

## 📅 Jalon 1 : Support multi-phase (Court terme)
*Objectif : Permettre de basculer de la Phase 1 aux phases suivantes lorsque l'élève avance.*

*   **Changement de Phase dynamique** : Actuellement, le dashboard est figé sur la Phase 1 (16 semaines). Il faut ajouter un sélecteur de phase (de 1 à 5) dans l'onglet **Réglages** et enregistrer la phase active dans la table SQLite `settings`.
*   **Base de connaissances dynamique** : Charger les blocs correspondants aux phases ultérieures dans la base de données ou dans les constantes (`App.jsx`) :
    *   **Phase 2 (Mois 5-12)** : Czerny op. 599, début du Hanon.
    *   **Phase 3 (Mois 13-20)** : Petits Préludes et Fughettes de Bach, Classiques favoris vol. 1.
    *   **Phase 4 (Mois 21-30)** : Inventions à 2 voix de Bach.
    *   **Phase 5 (Mois 31-36)** : Le Clavier bien tempéré de Bach, préparation du récital.
*   **Trame hebdomadaire adaptative** : Ajuster les instructions "Matin" et "Soir" selon les directives de chaque phase (par exemple, introduction de la théorie d'harmonie et chiffrage des degrés en Phase 3/4).

---

## 🎼 Jalon 2 : Outils de déchiffrage & d'auto-évaluation interactifs (Moyen terme)
*Objectif : Rendre interactifs les jalons trimestriels et la piste de déchiffrage.*

*   **Suivi du cycle des quintes (Gammes)** :
    *   Créer une interface interactive pour visualiser le cycle des quintes.
    *   Permettre de cocher les tonalités maîtrisées du cycle en cours (legato, staccato, mouvements contraires, tierces, arpèges) et stocker cet état en base SQLite.
*   **Formulaire de bilan trimestriel intégré** :
    *   Au lieu de simplement copier un texte et d'écrire les réponses à la main, intégrer des formulaires d'auto-évaluation à la fin de chaque bloc de 10-12 semaines (T1 à T9).
    *   Sauvegarder les bilans complétés dans une nouvelle table SQLite `milestones` (champs : date, phase, bloc, gammes_ok, dechiffrage_ok, repertoire_ok, theorie_ok, blocages, notes_prof).
    *   Générer un fichier de synthèse dynamique à partir de ces bilans historiques.

---

## 📊 Jalon 3 : Visualisations de progression & Statistiques (Moyen terme)
*Objectif : Garder la motivation sur 36 mois grâce à la data.*

*   **Graphiques de pratique** :
    *   Afficher des courbes d'heures de pratique accumulées par mois ou par semaine (en utilisant une bibliothèque légère de graphes comme Recharts ou des barres SVG personnalisées).
    *   Comparer le temps réel de pratique par rapport à l'objectif de 6 à 9 heures hebdomadaires.
*   **Répartition du travail** :
    *   Camembert indiquant la répartition du temps de pratique (Déchiffrage vs Répertoire vs Technique/Gammes) calculé à partir du type de créneau (matin/soir).
*   **Streaks (Séries de régularité)** :
    *   Mettre en valeur le nombre de jours consécutifs de pratique avec un historique visuel (type calendrier de contributions GitHub).

---

## 🎙️ Jalon 4 : Outils audio & intégrations MIDI (Long terme)
*Objectif : Exploiter la technologie web pour l'auto-évaluation et l'oreille.*

*   **Enregistreur audio intégré (Auto-évaluation)** :
    *   Ajouter un enregistreur audio basé sur la `MediaRecorder API` du navigateur.
    *   Permettre à l'élève d'enregistrer ses démos (la recommandation de s'enregistrer toutes les 2 semaines pour écoute active).
    *   Télécharger les enregistrements sous format `.webm`/`.mp3` avec un nommage automatique structuré (ex. `repertoire-seance-date.mp3`).
*   **Entraînement au déchiffrage avec support MIDI** :
    *   Utiliser la `Web MIDI API` du navigateur pour connecter le piano numérique à l'ordinateur.
    *   Développer un mini-jeu de déchiffrage interactif à l'écran (type Sight Reading Training) connecté en temps réel aux touches pressées sur le piano.

---

## 🤝 Jalon 5 : Espace Partage Professeur-Élève (Long terme, optionnel)
*Objectif : Faciliter le debrief en fin de cours.*

*   **Export de rapport PDF structuré** :
    *   Permettre d'exporter en un clic les notes accumulées pendant la semaine et l'historique des séances sous forme de document PDF soigné à envoyer directement au professeur par email ou messagerie avant la séance physique.
