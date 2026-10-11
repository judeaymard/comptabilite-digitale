# Plateforme de Comptabilité Automatisée pour Produits Digitaux

Application web autonome de gestion comptable et financière pour e-commerce et infoproduits, strictement fidèle aux règles mathématiques du fichier de référence.

## Démarrage Rapide (1 Clic)

Double-cliquez simplement sur le fichier **`lancer_application.bat`** situé à la racine du dossier.
L'application démarrera et ouvrira votre navigateur sur :
👉 **http://localhost:5000**

---

## Fonctionnalités Clés

1. **Tableau de Bord Financier (Dashboard)** :
   - Cartes KPI : Capital actuel, CA cumulé, Dépenses publicitaires, Commissions plateforme (5%), Bénéfice net cumulé, Marge globale pondérée.
   - Graphiques interactifs d'évolution du capital, comparatif CA vs Dépenses vs Profit, et marge quotidienne.
2. **Journal Quotidien des Opérations** :
   - Vue Tableau Financier (9 colonnes) & Vue Fiches Synthétiques.
   - Saisie express en 3 champs (Date, CA, Dépenses Pub) avec calcul automatique instantané.
   - Recalcul chronologique en cascade immédiat si une date passée est modifiée.
   - Alertes visuelles et indicateurs pour les journées déficitaires.
3. **Hub Dépenses Publicitaires (Ad Spend Hub)** :
   - Suivi par plateforme (Facebook Ads, TikTok Ads, Google Ads...), campagne et justificatifs.
   - Répartition visuelle des budgets.
4. **Importation & Exportation Excel / CSV** :
   - Export en `.xlsx` et `.csv` reprenant les 9 colonnes officielles.
   - Importation intelligente avec détection des doublons et validation des données.
5. **Journal d'Audit & Sécurité** :
   - Historique immuable de chaque création, modification (anciennes vs nouvelles valeurs) et suppression.
6. **Persistance Serveur SQLite** :
   - Vos données sont stockées de façon sécurisée et permanente dans `server/data/comptabilite.sqlite`.

---

## Commandes Utiles (Développeur)

- **Lancer les tests unitaires du moteur comptable** :
  ```bash
  npm test
  ```
- **Lancer le serveur seul** :
  ```bash
  npm start
  ```
