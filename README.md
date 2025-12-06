# 🐮 6 qui prend !

Jeu de cartes multijoueur en ligne basé sur le célèbre jeu "6 qui prend!" (Take 5!).

## 🎮 Jouer en ligne

Le jeu est déployable sur GitHub Pages ou Firebase Hosting.

## 🛠️ Technologies

- **Vanilla JavaScript** (ES6+) - Pas de framework
- **Firebase Realtime Database** - Synchronisation temps réel
- **Tailwind CSS** - Styling moderne et responsive
- **HTML5** - Structure sémantique

## 📖 Règles du jeu

### Matériel
- **104 cartes** numérotées de 1 à 104
- Chaque carte a des **"têtes de bœuf"** (points de pénalité) :
  - Carte **55** : 7 têtes 🐮🐮🐮🐮🐮🐮🐮
  - Cartes **multiples de 11** (11, 22, 33...) : 5 têtes 🐮🐮🐮🐮🐮
  - Cartes **multiples de 10** (10, 20, 30...) : 3 têtes 🐮🐮🐮
  - Cartes **multiples de 5** (5, 15, 25...) : 2 têtes 🐮🐮
  - **Toutes les autres cartes** : 1 tête 🐮

### Mise en place
- **4 rangées** de cartes au centre de la table
- Chaque rangée commence avec **1 carte** tirée au hasard
- Chaque joueur reçoit **10 cartes** en main

### Déroulement d'un tour
1. **Phase de sélection** : Chaque joueur choisit secrètement 1 carte de sa main
2. **Révélation simultanée** : Toutes les cartes choisies sont révélées en même temps
3. **Placement des cartes** : Les cartes sont placées **dans l'ordre croissant**, une par une :
   - Chaque carte va dans la rangée dont la **dernière carte est la plus proche mais inférieure**

### Règles spéciales

#### 🚨 6ème carte (ramasser une rangée)
- Quand une carte devient la **6ème d'une rangée** :
  - Le joueur **ramasse les 5 premières cartes** de la rangée
  - Il gagne les **points de pénalité** (têtes de bœuf) de ces 5 cartes
  - Sa carte devient la **nouvelle première carte** de la rangée

#### 🚨 Carte trop petite (choix forcé)
- Si une carte est **plus petite que toutes les dernières cartes** des 4 rangées :
  - Le joueur **doit choisir** une rangée à ramasser
  - Il prend **toutes les cartes** de cette rangée
  - Sa carte devient la **nouvelle première carte** de la rangée choisie

### Fin de partie
Le jeu se termine quand :
- **Option A** : 6 manches complètes sont jouées (60 tours au total)
- **Option B** : Un joueur atteint **66 points de pénalité**

🏆 **Le gagnant est celui qui a le MOINS de points !**

## 🚀 Installation locale

1. Clone le repo :
```bash
git clone https://github.com/TON_USERNAME/6-qui-prend.git
cd 6-qui-prend
```

2. Ouvre `index.html` dans un navigateur moderne

3. Profite !

## 🔥 Configuration Firebase

Le projet utilise Firebase Realtime Database. Les credentials sont déjà configurés dans `js/config.js`.

**Important :** Assurez-vous de configurer les règles de sécurité dans la console Firebase :

```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## 📱 Déploiement sur GitHub Pages

1. **Créer le repo GitHub**
```bash
git init
git add .
git commit -m "Initial commit - 6 qui prend game"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/6-qui-prend.git
git push -u origin main
```

2. **Activer GitHub Pages**
- Aller dans Settings → Pages
- Source : Deploy from branch `main`
- Folder : `/` (root)
- Save

3. **Le jeu sera accessible à :**
```
https://TON_USERNAME.github.io/6-qui-prend/
```

## 🎯 Fonctionnalités

- ✅ Création de partie avec code unique
- ✅ Rejoindre une partie via code
- ✅ Lobby avec système de "ready"
- ✅ Distribution correcte des cartes
- ✅ Sélection et validation de carte
- ✅ Révélation simultanée
- ✅ Placement automatique dans la bonne rangée
- ✅ Détection 6ème carte avec ramassage
- ✅ Choix forcé de rangée si carte trop petite
- ✅ Calcul correct des points de pénalité
- ✅ Gestion des manches (6 au total)
- ✅ Fin de partie à 66 points ou 6 manches
- ✅ Classement final
- ✅ Interface responsive (mobile + desktop)
- ✅ Synchronisation temps réel Firebase

## 📝 Structure du projet

```
6-qui-prend/
├── index.html          # Structure HTML + imports CDN
├── styles.css          # Styles CSS personnalisés
├── js/
│   ├── config.js       # Configuration Firebase + constantes
│   ├── state.js        # Gestion de l'état global
│   ├── firebase.js     # Opérations Firebase (CRUD + sync)
│   ├── game-logic.js   # Logique pure du jeu (calculs, règles)
│   ├── game-flow.js    # Orchestration des tours et phases
│   ├── ui.js           # Rendu de l'interface utilisateur
│   ├── animations.js   # Système d'animations
│   └── main.js         # Point d'entrée et initialisation
├── .gitignore
└── README.md
```

## 🐛 Problèmes connus / Améliorations futures

- [ ] Gestion des déconnexions en cours de partie
- [ ] Timeout automatique si un joueur ne joue pas
- [ ] Sons d'ambiance (optionnel)
- [ ] Mode sombre
- [ ] Statistiques de partie

## 📄 Licence

Ce projet est libre d'utilisation pour des fins éducatives et personnelles.

## 🙏 Remerciements

Inspiré du jeu de cartes "6 qui prend!" (Take 5! / Category 5).

