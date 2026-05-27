# Architecture du projet

Ce document explique le projet de bout en bout: ou les donnees vivent, comment elles circulent, qui les lit, qui les ecrit, et pourquoi l'application est organisee comme elle l'est.

## Vue d'ensemble

Quand on ouvre DynamicProsit, on voit assez vite qu'il ne s'agit pas d'une application generaliste. Tout tourne autour d'un objet central, le prosit, qui sert a la fois de carnet de travail, de source de verite et de support de presentation.

L'application a ete pensee pour trois gestes simples: saisir, retrouver, presenter. Cette simplicite apparente cache une contrainte importante: toute la structure du projet doit rester alignee sur cet unique flux d'usage, sinon les ecrans divergent et l'outil perd son interet.

La suite de la documentation raconte justement cette organisation: comment les donnees sont captees, pourquoi elles sont conservees localement, et quelles limites apparaissent quand on veut reutiliser le meme contenu dans plusieurs vues specialisees.

## Diagramme mental

<img src="img/prosit_context.svg" alt="Data flow" style="max-width:480px;height:auto;" />


## Le modele de donnees

En lisant le code, le premier point d'accroche est [Prosit](../src/types/prosit.ts). C'est le contrat qui relie tout le reste. Il ne s'agit pas seulement d'un type pratique: il impose la forme du projet.

Il contient:

* les champs de base du sujet: titre, lien, contexte, generalisation, roles;
* les sections structurees sous forme de listes ordonnees: problemes, pistes, livrables, plan d'action, etc.;
* l'etape courante via `currentAnchor`;
* un indicateur `touched` qui sert surtout a savoir si l'utilisateur a commence a remplir le contenu.

La lecture de [src/types/anchors.ts](../src/types/anchors.ts) montre une autre idee structurante: les ancres servent a faire le pont entre la logique metier et la navigation. Elles jouent 3 roles:

* `AnchorsKeys` represente l'identifiant logique interne;
* `AnchorsURL` mappe l'etape sur une route Next.js;
* `AnchorsLabels` fournit les libelles affiches dans l'interface.

Cette separation evite le melange des responsabilites, mais elle a aussi un cout: chaque nouvelle etape demande de rester coherent dans plusieurs couches a la fois. Le projet gagne en lisibilite, il perd un peu en souplesse.

## Point d'entree applicatif

Le vrai centre de gravite du projet se trouve dans [src/app/(seo)/layout.tsx](../src/app/%28seo%29/layout.tsx). C'est la premiere piece qui explique pourquoi le reste fonctionne comme il fonctionne.

Ce layout fait plusieurs choses importantes, et c'est justement ce cumul qui en fait un point sensible:

* il charge l'etat initial depuis `localStorage`;
* il normalise d'anciens formats de donnees via `prositVersion`;
* il injecte `PrositContext` dans toute l'application;
* il conserve l'etat a chaque modification;
* il affiche le chrome global de l'application, notamment le header Tauri et l'icone externe.

En pratique, c'est la couche qui garantit que tout le reste peut lire et modifier le meme prosit sans prop drilling. En contrepartie, le layout devient aussi une zone de concentration des effets de bord: persistence, migration, contexte, UI globale. Ca, sans compter le fait que cela brise le S de SOLID, rend ce projet inutilisable pour un projet plus vaste.

## Cycle de vie des donnees

Le cycle de vie des donnees raconte assez bien la philosophie du projet: on lit un etat existant, on le remet en forme si besoin, on l'expose, puis on le reecrit au fil des interactions.

1. au chargement, le layout lit `localStorage`;
2. s'il trouve un prosit ancien, il le convertit au format courant;
3. il expose ensuite l'objet `prosit` via le contexte;
4. les pages modifient ce contexte avec `setProsit`;
5. a chaque changement, le layout re-ecrit `localStorage`;
6. la presentation et les raccourcis lisent le meme etat et se mettent a jour.

## Pourquoi `PrositContext`

Le contexte evite d'avoir a remonter les donnees par dizaines de props entre les pages, les formulaires, l'aperçu et les actions globales. C'est un choix presque inevitable ici, parce que plusieurs parties de l'application doivent partager le meme etat en permanence.

Il contient:

* `prosit`: la donnee courante;
* `setProsit`: la fonction de mise a jour;
* `clearProsit`: la remise a zero.

Le choix du contexte est adapte ici parce que:

* plusieurs sous-arbres doivent lire les memes donnees;
* les ecrans sont relies par la navigation Next.js mais doivent partager une meme source d'etat;
* l'application fonctionne aussi dans une fenetre Tauri separee pour la presentation.

La contrepartie, c'est que le contexte devient tres central. Quand un composant ou un ecran manipule mal l'etat, l'effet se propage *très* vite.

## Navigation entre etapes

La logique de navigation est centralisee dans [src/hooks/useNavigator.ts](../src/hooks/useNavigator.ts). C'est l'endroit ou l'on voit le plus nettement la fusion entre la notion d'etape et la notion de route.

Ce hook transforme une ancre en:

* route Next.js via `router.push(...)`;
* mise a jour de `prosit.currentAnchor`;
* calcul de l'etape suivante et precedente.

Il sert donc de pont entre l'etat metier et le routing. En pratique, c'est ce pont qui permet d'avoir des ecrans assez autonomes sans perdre la coherence de progression.

Les pages du formulaire utilisent ce hook pour naviguer avec des boutons, des soumissions de formulaire et des raccourcis clavier.

### Pourquoi ce choix

Cette approche permet de garder une seule logique de progression au lieu de dupliquer la navigation dans chaque page. Le projet y gagne une forme d'elasticite: on peut ajouter des pages sans redefinir la logique de progression a chaque fois. Mais cette simplification impose aussi de penser l'application comme une suite d'etapes, pas comme un ensemble de pages independantes.

## Raccourcis clavier

Les raccourcis sont declarés dans [src/components/globalHotKeys.ts](../src/components/globalHotKeys.ts) et consommes dans le layout principal et dans l'accueil. C'est un petit fichier, mais il dit beaucoup sur le projet: l'interface vise la vitesse plus que la decoration.

Ils servent a:

* sauter directement a une section;
* naviguer plus vite dans le formulaire;
* garder une experience fluide sans forcer l'utilisateur a cliquer partout.

Le layout de formulaire ajoute aussi `Ctrl+S` pour exporter en DOCX et d'autres raccourcis globaux comme le changement de theme. Cela rend l'outil tres rapide quand on l'utilise souvent, mais cela suppose aussi que l'utilisateur apprenne quelques gestes caches.

## Les pages du formulaire

Chaque etape du prosit est une page Next.js sous [src/app/(seo)/(root)/](../src/app/%28seo%29/%28root%29/).

Le fichier racine [src/app/(seo)/(root)/page.tsx](../src/app/%28seo%29/%28root%29/page.tsx) correspond a la premiere etape, les informations generales.

Le principe general est le suivant:

* chaque page ne gere que sa section fonctionnelle;
* les composants de saisie lisent et ecrivent dans `PrositContext`;
* la navigation permet de passer d'une section a l'autre sans perdre l'etat.

Le decoupage est simple, presque austere, mais il fonctionne bien pour un parcours lineaire. On sent ici que le projet a prefere la regularite a la richesse fonctionnelle.

Cette decoupe limite les effets de bord et garde les ecrans lisibles.

## La vue de presentation

La page [src/app/(seo)/presentation/page.tsx](../src/app/%28seo%29/presentation/page.tsx) ouvre une interface distincte, pensee pour afficher le prosit de maniere lisible et projetable. C'est une seconde lecture du meme objet, mais avec d'autres priorites visuelles.

Elle recupere elle aussi les donnees depuis `PrositContext`, puis applique une logique de synchronisation avec `storage` pour refleter les changements du formulaire.

Le composant [src/app/(seo)/presentation/presentation.tsx](../src/app/%28seo%29/presentation/presentation.tsx) gere la mise en page de la presentation, et [src/app/(seo)/presentation/presentationElement.tsx](../src/app/%28seo%29/presentation/presentationElement.tsx) factorise l'affichage d'un bloc de contenu.

### Pourquoi une vue separee

La presentation n'a pas les memes besoins que le formulaire:

* elle doit etre plus lisible;
* elle doit pouvoir s'ouvrir dans une popup ou une fenetre Tauri;
* elle doit suivre l'etat du formulaire en temps reel;
* elle doit mettre en evidence l'etape courante.

Cette separation est utile, mais elle introduit aussi une fragilite classique: deux vues du meme contenu doivent rester synchronisees sans dupliquer la logique. Le projet resout ca par le partage d'etat, pas par la copie.

## Persistance locale

Le stockage local est volontairement simple: `localStorage` contient l'objet complet du prosit. C'est probablement l'une des decisions les plus lisibles du projet.

## Gestion des versions de donnees

Le layout principal contient une migration simple entre formats de prosit. Cette piece ressemble presque a une note de prudence du projet envers lui-meme: les donnees ont deja change, et elles changeront encore.

Quand `prositVersion` ne correspond pas au format courant, l'application tente une conversion vers la version 2.

Cette couche est importante parce qu'elle permet de faire evoluer le schema sans casser les donnees anciennes stockees localement. Sa limite est evidente: la migration reste volontairement legere et suppose un historique de changements assez simple.

Le principe general est:

* detecter l'ancien format;
* convertir les tableaux de chaines en objets `OrderedItem`;
* remettre `prositVersion` au format courant;
* continuer l'application normalement.

## Export DOCX

L'export document est actuellement implementé dans [src/components/todocx.ts](../src/components/todocx.ts). On voit ici une autre idee forte du projet: l'application ne cherche pas a produire un document a la main, elle remplit un gabarit deja pense pour la forme finale.

Le fonctionnement est le suivant:

1. chargement d'un template DOCX;
2. remplissage avec les donnees du prosit;
3. generation d'un blob;
4. telechargement du fichier via `file-saver`.

L'action est exposee dans le layout principal par un bouton et un raccourci clavier (`Ctrl+S`).

### Pourquoi un template DOCX

Le template permet de garder une mise en forme stable et de separer la logique de contenu de la mise en forme finale. En echange, l'export reste depend du modele choisi dans le document source, donc on gagne en constance ce qu'on perd en flexibilite.

Autrement dit, le code produit les donnees, le document Word contient le design final.

## Tauri et fonctionnement desktop

Le projet est aussi prevu pour tourner dans Tauri. Cela change peu la logique metier, mais beaucoup la sensation d'usage.

Quand le contexte Tauri est detecte dans [src/app/(seo)/layout.tsx](../src/app/%28seo%29/layout.tsx):

* un header Windows natif est affiche;
* l'ouverture de liens externes passe par `@tauri-apps/api/shell`;
* la fenetre de presentation peut etre creee via `WebviewWindow`.

Cela permet d'avoir une experience bureau plus native sans changer la logique metier de l'application. La limite, ici, est que le projet reste pense pour un contexte local mono-utilisateur; Tauri ajoute une couche de confort, pas une nouvelle architecture produit.

## Responsabilites par couche

### Layout global

Le layout global:

* initialise le contexte;
* gere la persistance;
* gere la migration de donnees;
* fournit les elements globaux de l'application.

### Hooks

Les hooks encapsulent la logique reutilisable:

* `useNavigator` pour le routing et la progression;
* `usePrositPart` pour extraire des bouts de logique metier;
* autres hooks utilitaires pour eviter de surcharger les composants.

### Components

Les composants affichent ou editent des sections precises:

* formulaires;
* listes ordonnees;
* presentation;
* header Tauri.

### Types

Les types centralisent la structure des donnees pour que toutes les couches manipulent le meme contrat.

## Pourquoi l'architecture est comme ca

En filigrane, l'architecture privilegie trois choses:

* la simplicite: un seul objet metier partage partout;
* la robustesse: persistance locale et migration de version;
* la separation des usages: formulaire, presentation, export.

Elle fonctionne bien pour un outil mono-utilisateur, local, avec un cycle de vie simple et une forte dependance a l'etat de l'interface. Elle serait sans doute moins confortable si le projet devait evoluer vers du multi-utilisateur, de la collaboration en temps reel ou une synchronisation cloud.

## Si tu veux etendre le projet

Si tu ajoutes de nouvelles fonctionnalites, garde cette logique:

* un nouveau champ de donnees doit entrer dans `Prosit`;
* une nouvelle etape doit etre representee dans `anchors.ts`;
* une nouvelle vue doit reutiliser `PrositContext` au lieu de dupliquer l'etat;
* une nouvelle exportation doit prendre `prosit` comme entree unique.

Cette regle limite les divergences entre les ecrans. C'est aussi ce qui rend le projet lisible lorsqu'on le decouvre sans contexte: il suffit de repérer le fil du prosit, puis de voir comment chaque couche s'y rattache.

## Entrypoints & diagrammes

Pour faciliter la lecture de l'architecture, plusieurs diagrammes sont fournis dans `docs/mmd` sous forme de sources Mermaid (.mmd) et d'images SVG générées (placeholders). Ils servent ici de balises visuelles: plutot que de tout expliquer dans le texte, la doc montre ou se situent les nœuds principaux du projet.

- **Project structure:** image + source Mermaid

    <img src="img/project_structure.svg" alt="Project structure" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/project-structure.mmd`

- **Entrypoints (routes & runtimes):** image + source Mermaid

    <img src="img/app_entrypoints.svg" alt="Entrypoints" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/entrypoints.mmd`

- **Flux de données principal (form → context → storage → presentation → export):**

    <img src="img/prosit_context.svg" alt="Data flow" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/data-flow.mmd`

- **Navigation & ancres:**
        <div style="text-align:center;">
            <img src="img/nextjs_routing.svg" alt="Navigation" style="max-width:100px;height:auto;display:block;margin:0 auto;" />
        </div>
    Source: `docs/mmd/navigation.mmd`

- **Composants clés et responsabilités:**

    <img src="img/component_dependencies.svg" alt="Components" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/components.mmd`

- **Intégration Tauri (fenêtre de présentation, shell, runtime):**

    <img src="img/tauri_architecture.svg" alt="Tauri flow" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/tauri-flow.mmd`

- **Types & relations (Prosit, OrderedItem, Anchors):**

    <img src="img/prosit_structure.svg" alt="Types flow" style="max-width:480px;height:auto;" />

    Source: `docs/mmd/types-flow.mmd`

Conseil pratique: pour générer des SVG à partir des fichiers `.mmd`, tu peux utiliser l'outil `mmdc` (Mermaid CLI) ou un plugin CI qui transforme `*.mmd` → `*.svg` puis committer les images. Les fichiers `.mmd` restent la source d'autorité pour les diagrammes.
