# Build.Tech — site web complet (guide pas à pas)

Ce dossier contient le site complet de **Build.Tech** :

- Le **frontend** (HTML / CSS / JavaScript, sans étape de build — tu peux le
  déposer tel quel sur GitHub Pages).
- Le **schéma de base de données** et les **règles de sécurité** Supabase
  (`supabase/schema.sql`, `supabase/storage_policies.sql`).
- Les **fonctions serveur** (Supabase Edge Functions) pour les actions
  sensibles et les emails (`supabase/functions/`).

Ce README t'accompagne **de zéro jusqu'au site en ligne**. Suis les parties
dans l'ordre — chacune indique exactement où cliquer.

> ⚠️ **Logo** : aucune image n'a été transmise dans la conversation où ce
> projet a été généré. Un logo temporaire (`assets/img/logo-placeholder.svg`)
> est utilisé en attendant. Remplace simplement ce fichier par ton vrai logo
> (garde le même nom, ou mets à jour les balises `<img src="...">` dans les
> pages HTML si tu changes le nom de fichier).

---

## Sommaire

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Créer un compte GitHub et le dépôt](#2-créer-un-compte-github-et-le-dépôt)
3. [Créer le projet Supabase](#3-créer-le-projet-supabase)
4. [Configurer la base de données](#4-configurer-la-base-de-données)
5. [Configurer le stockage des images](#5-configurer-le-stockage-des-images)
6. [Configurer l'authentification](#6-configurer-lauthentification)
7. [Connecter le site à Supabase](#7-connecter-le-site-à-supabase)
8. [Activer GitHub Pages](#8-activer-github-pages)
9. [Créer le premier compte centre (administrateur principal)](#9-créer-le-premier-compte-centre-administrateur-principal)
10. [Déployer les fonctions serveur (Edge Functions)](#10-déployer-les-fonctions-serveur-edge-functions)
11. [Configurer les emails de notification](#11-configurer-les-emails-de-notification)
12. [Notifications push (optionnel / avancé)](#12-notifications-push-optionnel--avancé)
13. [Rendre les textes du site modifiables](#13-rendre-les-textes-du-site-modifiables)
14. [Checklist de test complète](#14-checklist-de-test-complète)
15. [Modifier le site plus tard](#15-modifier-le-site-plus-tard)
16. [Récapitulatif sécurité](#16-récapitulatif-sécurité)
17. [Dépannage (FAQ)](#17-dépannage-faq)

---

## 1. Vue d'ensemble de l'architecture

```
 Visiteur / Client
        │
        ▼
 Site statique sur GitHub Pages   (HTML / CSS / JS — aucun serveur à gérer)
        │
        │   (clé "anon" publique + Row Level Security)
        ▼
 Supabase
   ├── Auth            → comptes, connexion, mots de passe
   ├── Base de données  → services, composants, conversations, messages…
   ├── Storage          → photos des composants
   ├── Realtime         → chat instantané
   └── Edge Functions   → actions sensibles (clé secrète service_role,
                           jamais exposée au navigateur)
```

**Pourquoi c'est sûr sans serveur à gérer soi-même :**
La clé "anon" et l'URL du projet Supabase sont visibles dans le code du site
— c'est normal et voulu par Supabase. La vraie protection vient des règles
**Row Level Security (RLS)** définies dans `supabase/schema.sql` : elles
s'exécutent dans la base de données elle-même, donc même si quelqu'un
inspecte le code du site ou appelle l'API directement, il ne peut faire que
ce que les règles autorisent pour son propre compte.

Les actions les plus sensibles (suspendre un compte, gérer les
administrateurs) passent en plus par une **Edge Function** qui utilise la
clé secrète `service_role` — cette clé ne quitte jamais les serveurs
Supabase, elle n'est jamais dans le frontend ni sur GitHub.

**Services externes utilisés (et leur coût) :**

| Service | Rôle | Gratuit ? |
|---|---|---|
| GitHub Pages | Hébergement du site | Oui, illimité pour un dépôt public |
| Supabase | Base de données, auth, stockage, temps réel, fonctions | Oui (offre gratuite généreuse, largement suffisante pour démarrer) |
| Resend | Envoi des emails de notification | Oui (100 emails/jour, 3000/mois sur l'offre gratuite au moment de l'écriture — vérifie sur resend.com) |

---

## 2. Créer un compte GitHub et le dépôt

### 2.1 Créer un compte GitHub (si tu n'en as pas)

1. Va sur **https://github.com**.
2. Clique sur **Sign up** (en haut à droite).
3. Renseigne un email, un mot de passe, un nom d'utilisateur, valide les
   vérifications proposées, puis confirme ton email.

### 2.2 Créer le dépôt (repository)

1. Une fois connecté, clique sur le **+** en haut à droite → **New repository**.
2. **Repository name** : `build-tech` (ou le nom de ton choix — retiens-le,
   il apparaîtra dans l'adresse de ton site).
3. Visibilité : **Public** (nécessaire pour GitHub Pages gratuit).
4. Ne coche **aucune** case (pas de README, pas de .gitignore, pas de
   licence) — on va importer nos propres fichiers.
5. Clique sur **Create repository**.

### 2.3 Mettre les fichiers du projet dans le dépôt

Sur la page qui s'affiche, sous "…or upload an existing file" :

1. Clique sur **uploading an existing file**.
2. Ouvre le dossier de ce projet sur ton ordinateur, **sélectionne tous les
   fichiers et dossiers** (`index.html`, `assets/`, `admin/`, `supabase/`,
   etc.) et glisse-les dans la zone de dépôt de GitHub.
3. En bas de page, dans **Commit changes**, laisse le message par défaut
   (ou écris "Premier import du site") puis clique sur **Commit changes**.

> 💡 Si tu préfères la ligne de commande (facultatif) :
> ```
> git init
> git add .
> git commit -m "Premier import du site"
> git branch -M main
> git remote add origin https://github.com/TON-COMPTE/build-tech.git
> git push -u origin main
> ```

---

## 3. Créer le projet Supabase

1. Va sur **https://supabase.com** → **Start your project** (ou **Sign up**).
2. Connecte-toi (email/mot de passe, ou via GitHub — au choix, ça ne
   concerne que TA connexion à Supabase, pas celle de tes futurs clients).
3. Clique sur **New project**.
4. Choisis une organisation (ou crée-en une, c'est gratuit).
5. Renseigne :
   - **Name** : `build-tech`
   - **Database Password** : génère un mot de passe fort et **note-le
     précieusement** (ex. dans un gestionnaire de mots de passe) — tu n'en
     auras normalement pas besoin au quotidien, mais garde-le en sécurité.
   - **Region** : choisis la région la plus proche de tes clients (ex.
     `Europe West (Ireland)` ou équivalent pour la France).
6. Clique sur **Create new project**. Patiente 1 à 2 minutes pendant le
   provisionnement.

---

## 4. Configurer la base de données

1. Dans le menu de gauche de ton projet Supabase, clique sur **SQL Editor**.
2. Clique sur **New query**.
3. Ouvre le fichier **`supabase/schema.sql`** de ce projet, copie **tout**
   son contenu, et colle-le dans l'éditeur SQL de Supabase.
4. Clique sur **Run** (ou `Ctrl+Enter`). Tu dois voir "Success. No rows
   returned" — cela crée toutes les tables, fonctions et règles de sécurité.
5. (Optionnel, pour tester tout de suite) Répète l'opération avec le
   contenu de **`supabase/seed.sql`** : cela ajoute 3 services et 3
   composants d'exemple, modifiables/supprimables ensuite depuis
   `/admin`.

> Tu peux vérifier que les tables sont bien créées dans **Table Editor**
> (menu de gauche) : tu dois voir `profiles`, `admins`, `services`,
> `components`, `conversations`, `messages`, etc.

---

## 5. Configurer le stockage des images

1. Menu de gauche → **Storage**.
2. Clique sur **New bucket**.
3. **Name** : `components` (exactement ce nom, en minuscules — le code du
   site s'y réfère directement).
4. Active **Public bucket** (sinon les photos ne s'afficheront pas sur le
   site public).
5. Clique sur **Create bucket**.
6. (Recommandé) Clique sur le bucket `components` → **Policies** ou
   **Configuration**, et si l'option est proposée, limite le **type de
   fichiers autorisés** à `image/png, image/jpeg, image/webp` et la
   **taille maximale** à 5 Mo — en plus de la vérification déjà faite côté
   site.
7. Retourne dans **SQL Editor** → **New query**, colle le contenu de
   **`supabase/storage_policies.sql`**, puis **Run**. Cela empêche
   n'importe qui d'uploader ou supprimer des photos : seuls les
   administrateurs le pourront.

---

## 6. Configurer l'authentification

1. Menu de gauche → **Authentication** → **Providers**.
2. Vérifie que **Email** est activé (c'est le cas par défaut). Aucun autre
   fournisseur (Google, Discord...) n'est nécessaire — le site n'en
   propose volontairement pas.
3. Toujours dans **Authentication** → **Settings** (ou **Sign In / Providers**
   selon la version de l'interface) :
   - Désactive **"Confirm email"** si tu ne veux pas que les nouveaux
     comptes doivent valider leur email avant de se connecter (conforme à
     ta demande initiale). Cette option s'appelle "Enable email
     confirmations" — mets-la sur **désactivé**.
4. Toujours dans **Authentication** → **URL Configuration** :
   - **Site URL** : mets l'adresse de ton site GitHub Pages, par exemple
     `https://TON-COMPTE.github.io/build-tech/` (tu la connaîtras
     précisément après la partie 8 — tu pourras revenir la corriger ici).
   - **Redirect URLs** : ajoute la même adresse, ainsi que
     `https://TON-COMPTE.github.io/build-tech/reset-password.html`
     (nécessaire pour que le lien "mot de passe oublié" fonctionne).

---

## 7. Connecter le site à Supabase

1. Dans Supabase, menu de gauche → **Project Settings** (icône ⚙️) →
   **API**.
2. Note deux valeurs :
   - **Project URL** (ressemble à `https://abcdefgh.supabase.co`)
   - **anon public** key (une longue chaîne de caractères)

   ⚠️ Ce sont les **seules** valeurs à mettre dans le frontend. Ne copie
   jamais la clé **service_role** (qui apparaît juste en dessous) où que ce
   soit dans le dossier du site ou sur GitHub — elle donne un accès total
   à la base de données.

3. Ouvre le fichier **`assets/js/config.js`** de ton projet (directement
   sur GitHub : clique sur le fichier → icône crayon "Edit").
4. Remplace :
   ```js
   SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
   SUPABASE_ANON_KEY: "VOTRE_CLE_ANON_PUBLIC",
   ```
   par tes vraies valeurs.
5. En bas de page, **Commit changes** pour enregistrer.

---

## 8. Activer GitHub Pages

1. Sur la page de ton dépôt GitHub, clique sur **Settings** (onglet en
   haut).
2. Menu de gauche → **Pages**.
3. Sous **Build and deployment** → **Source**, choisis **Deploy from a
   branch**.
4. **Branch** : choisis `main`, dossier `/ (root)`, puis **Save**.
5. Patiente 1 à 2 minutes. Recharge la page : une bannière verte indique
   l'adresse de ton site, du type :
   `https://TON-COMPTE.github.io/build-tech/`
6. Reviens à la **partie 6** (Authentication → URL Configuration) et
   vérifie/complète le **Site URL** et les **Redirect URLs** avec cette
   adresse exacte.

Ton site est maintenant en ligne et fonctionnel pour la navigation, les
comptes, le chat, etc.

---

## 9. Créer le premier compte centre (administrateur principal)

Le "compte centre" est le compte propriétaire : il a tous les droits et ne
peut jamais être supprimé ou rétrogradé depuis l'interface. Pour rester
sécurisé, il se crée en deux temps :

1. Va sur ton site (`.../register.html`) et crée un compte normal avec
   **ton** email et un mot de passe — comme n'importe quel visiteur.
2. Retourne dans Supabase → **SQL Editor** → **New query**, et exécute
   (en remplaçant l'email) :
   ```sql
   insert into public.admins (user_id, is_owner, status)
   select id, true, 'active' from public.profiles where email = 'TON-EMAIL@exemple.com';
   ```
3. Reconnecte-toi sur le site (ou recharge la page) : le lien
   **Administration** apparaît dans le menu, et `/admin/admins.html` te
   permet désormais d'ajouter d'autres administrateurs directement depuis
   l'interface, sans repasser par le SQL Editor.

---

## 10. Déployer les fonctions serveur (Edge Functions)

Les fonctions dans `supabase/functions/` gèrent les actions sensibles
(suspendre/supprimer un compte, gérer les admins) et les emails. Pour les
déployer, tu as besoin de l'outil en ligne de commande Supabase CLI.

1. Installe Node.js si ce n'est pas déjà fait (**https://nodejs.org**,
   version LTS).
2. Dans un terminal, à la racine du projet, installe la CLI Supabase :
   ```
   npm install supabase --save-dev
   ```
3. Connecte-toi :
   ```
   npx supabase login
   ```
   (Ouvre une page de connexion dans ton navigateur.)
4. Lie ton dossier local au projet Supabase (le "project ref" se trouve
   dans **Project Settings → General**) :
   ```
   npx supabase link --project-ref TON-PROJECT-REF
   ```
5. Déploie les fonctions :
   ```
   npx supabase functions deploy admin-actions --no-verify-jwt
   npx supabase functions deploy notify-new-message --no-verify-jwt
   npx supabase functions deploy send-push --no-verify-jwt
   ```
   (`--no-verify-jwt` est nécessaire car ces fonctions vérifient
   elles-mêmes les droits, y compris pour des appels internes de
   Supabase comme les Database Webhooks.)

Tu peux vérifier le déploiement dans Supabase → **Edge Functions**.

---

## 11. Configurer les emails de notification

Les emails sont envoyés via **Resend** (offre gratuite adaptée à ce
projet), appelé depuis la fonction `notify-new-message`.

### 11.1 Créer un compte Resend et récupérer une clé API

1. Va sur **https://resend.com** → **Sign up**.
2. Une fois connecté, menu de gauche → **API Keys** → **Create API Key**.
3. Donne-lui un nom (ex. `build-tech`), garde les permissions par défaut,
   clique sur **Add**, puis **copie la clé immédiatement** (elle ne sera
   plus affichée ensuite).
4. Pour commencer sans configurer de domaine, tu peux envoyer depuis
   l'adresse de test `onboarding@resend.dev` (limité mais suffisant pour
   démarrer). Pour envoyer depuis une adresse `@tondomaine.fr`, ajoute et
   vérifie ton domaine dans Resend → **Domains** (nécessite d'avoir un
   nom de domaine et d'ajouter des enregistrements DNS — facultatif).

### 11.2 Enregistrer la clé comme secret Supabase (jamais dans le code)

Dans un terminal, à la racine du projet :
```
npx supabase secrets set RESEND_API_KEY=ta_cle_resend
npx supabase secrets set BUILD_TECH_CONTACT_EMAIL=build.tech78920@gmail.com
npx supabase secrets set BUILD_TECH_FROM_EMAIL="Build.Tech <onboarding@resend.dev>"
```

### 11.3 Créer le Database Webhook qui déclenche l'envoi

1. Dans Supabase, menu de gauche → **Database** → **Webhooks**.
2. Clique sur **Create a new hook**.
3. **Name** : `notify-new-message`
4. **Table** : `messages`
5. **Events** : coche uniquement **Insert**.
6. **Type** : **Supabase Edge Functions**.
7. Choisis la fonction **notify-new-message**.
8. Enregistre.

C'est tout : à chaque nouveau message, la fonction est appelée
automatiquement, vérifie s'il faut notifier (et évite les doublons via la
table `notifications_log`), puis envoie l'email si nécessaire.

---

## 12. Notifications push (optionnel / avancé)

Cette partie transforme le site en PWA installable et permet des
notifications sur téléphone/ordinateur même onglet fermé. **Elle est
entièrement facultative** : sans elle, tout fonctionne normalement avec les
notifications par email.

1. Génère une paire de clés VAPID (nécessaires pour signer les
   notifications). Le plus simple : utilise le générateur en ligne
   `npx web-push generate-vapid-keys` (nécessite Node.js) depuis un
   terminal, ou un générateur en ligne de confiance.
2. Mets la clé **publique** dans `assets/js/config.js` :
   ```js
   VAPID_PUBLIC_KEY: "ta_cle_publique"
   ```
3. Enregistre les secrets serveur :
   ```
   npx supabase secrets set VAPID_PUBLIC_KEY=ta_cle_publique
   npx supabase secrets set VAPID_PRIVATE_KEY=ta_cle_privee
   npx supabase secrets set VAPID_SUBJECT="mailto:build.tech78920@gmail.com"
   ```
4. Crée un second Database Webhook (comme en partie 11.3) sur la table
   `messages`, événement **Insert**, qui appelle cette fois la fonction
   **send-push**.
5. Sur le site, dans **Mes conversations**, un bouton **"🔔 Activer les
   notifications"** permet à chaque client d'autoriser les notifications
   sur son appareil.

Si un navigateur ne supporte pas les notifications push (ou si tu ne
configures pas cette partie), le bouton informe simplement l'utilisateur
que les notifications par email restent actives — rien ne casse.

---

## 13. Rendre les textes du site modifiables

La page d'accueil (`index.html`) est déjà branchée sur la table
`site_settings` pour trois textes : le slogan, le texte d'introduction du
hero, et le texte de la section "Ce que nous faisons" (repère les éléments
`data-setting="..."` dans le HTML). Modifie-les depuis
`/admin/settings.html` — le changement apparaît immédiatement sur le site,
sans toucher au code.

Pour rendre un autre texte modifiable de la même façon :
1. Ajoute un attribut `data-setting="ma_cle"` à l'élément HTML concerné.
2. Ajoute un champ correspondant dans `admin/settings.html` et
   `assets/js/admin-settings.js` (objet `FIELDS`).
3. `assets/js/site-content.js` (déjà inclus sur `index.html`) applique
   automatiquement la valeur enregistrée à l'affichage.

---

## 14. Checklist de test complète

- [ ] La page d'accueil s'affiche, le logo est visible, le thème
      clair/sombre/système fonctionne et est mémorisé après rechargement.
- [ ] L'animation 3D du hero se joue au scroll (désactive "réduire les
      animations" dans ton OS si tu ne la vois pas — c'est volontaire).
- [ ] Créer un compte fonctionne, et connecte automatiquement (si la
      confirmation email est désactivée comme indiqué en partie 6).
- [ ] La page Services affiche les services actifs avec le bon prix.
- [ ] La page Composants affiche les composants, les filtres (recherche,
      catégorie, tri, disponibilité) fonctionnent.
- [ ] Cliquer sur "Nous contacter" (service ou composant) sans être
      connecté redirige vers la connexion, puis crée la conversation avec
      le bon message pré-rempli une fois connecté.
- [ ] Le chat envoie/reçoit des messages en temps réel (teste avec deux
      fenêtres : une connectée en client, une en admin).
- [ ] "Mot de passe oublié" envoie un email avec un lien qui fonctionne.
- [ ] `/admin` redirige vers l'accueil pour un compte non-admin, et
      affiche le tableau de bord pour le compte centre.
- [ ] Ajouter/modifier/supprimer un service ou un composant (avec photo)
      fonctionne et se reflète immédiatement sur le site public.
- [ ] Suspendre / réactiver / supprimer un utilisateur fonctionne
      (`/admin/users.html`).
- [ ] Ajouter un administrateur fonctionne (`/admin/admins.html`), et le
      compte centre reste protégé (aucun bouton de suppression sur sa
      ligne).
- [ ] Un email de notification arrive quand un admin répond à un client
      (si la partie 11 est configurée).

---

## 15. Modifier le site plus tard

- **Changer un texte, une couleur, une image statique** : modifie
  directement le fichier concerné sur GitHub (icône crayon), commit — le
  site se met à jour automatiquement en 1 à 2 minutes.
- **Changer un prix, une description, une photo, un statut** : depuis
  `/admin`, sans toucher au code.
- **Ajouter une nouvelle page** : duplique une page existante proche (ex.
  `contact.html`), adapte le contenu et le `<title>`, ajoute un lien dans
  la barre de navigation de **toutes** les pages (recherche/remplace).
- **Modifier la base de données** : toujours passer par le **SQL Editor**
  de Supabase pour les changements de structure (nouvelles colonnes,
  nouvelles tables) — n'oublie pas d'ajouter les policies RLS
  correspondantes.

---

## 16. Récapitulatif sécurité

- Aucun mot de passe, aucune clé secrète dans le frontend ni dans GitHub :
  seules l'URL Supabase et la clé "anon" (publiques par conception) y
  figurent.
- La clé `service_role` ne vit que dans les secrets Supabase (Edge
  Functions), jamais ailleurs.
- Toutes les tables ont **Row Level Security** activé : la base de données
  refuse par défaut, et n'autorise que ce que les policies décrivent
  explicitement.
- Le statut administrateur est vérifié **côté base de données**
  (fonction `is_admin`), jamais uniquement par un bouton caché côté
  frontend — un utilisateur ne peut pas se donner les droits admin en
  modifiant le JavaScript de son navigateur.
- Les actions les plus sensibles (suspendre/supprimer un compte, gérer les
  administrateurs) passent par une Edge Function qui revérifie
  elle-même les droits de l'appelant avant d'agir.
- Les photos uploadées sont validées côté client (type MIME, taille) et
  protégées côté Storage (policies : lecture publique, écriture
  admin uniquement).
- Le contenu inséré par les utilisateurs (messages, textes) est
  systématiquement échappé avant affichage (`escapeHtml`) pour empêcher
  les injections XSS.

---

## 17. Dépannage (FAQ)

**Le site affiche une page blanche ou des erreurs dans la console.**
Vérifie `assets/js/config.js` : les valeurs `SUPABASE_URL` et
`SUPABASE_ANON_KEY` doivent être renseignées (partie 7).

**"Failed to fetch" ou erreurs CORS.**
Vérifie que l'adresse de ton site est bien renseignée dans Supabase →
Authentication → URL Configuration (partie 6), et que le projet Supabase
est bien actif (pas en pause — l'offre gratuite met les projets inactifs en
pause après une période sans trafic ; il suffit de rouvrir le dashboard
pour le réactiver).

**Je ne reçois pas les emails de notification.**
Vérifie : la clé `RESEND_API_KEY` est bien enregistrée (`npx supabase
secrets list`), le Database Webhook est bien créé sur la table `messages`
/ événement Insert (partie 11.3), et que l'adresse d'expédition
(`onboarding@resend.dev` par défaut) est acceptée par Resend pour ton
compte.

**"Administration" n'apparaît pas dans le menu alors que je suis censé
être admin.**
Vérifie dans Supabase → Table Editor → `admins` que ta ligne existe bien
avec `status = 'active'`, et que l'`user_id` correspond bien à ton
`auth.users.id` (visible dans Authentication → Users).

**Le lien "mot de passe oublié" ne fonctionne pas.**
Vérifie que l'URL de `reset-password.html` est bien dans la liste des
**Redirect URLs** autorisées (partie 6).
