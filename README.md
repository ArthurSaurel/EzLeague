# EzLeague

![alt text](https://github.com/ArthurSaurel/EzLeague/blob/master/ressources/newmain.png)

*Se simplifier League of Legends*

[Télécharger l'installeur](https://github.com/ArthurSaurel/EzLeague/releases/tag/EzSetup)

Ce logiciel a pour objectif d'automatiser certaines tâches et permettre de se concentrer sur les éléments qui vous intéressent vraiment. 

Je voulais quelque chose de simple mais d'efficace, c'est pourquoi j'ai opté vers un icone en barre des tâches permettant de sélectionner rapidement les options que l'on veut activer.

![alt text](https://github.com/ArthurSaurel/EzLeague/blob/master/img/ezleague_menu.PNG)

Pour rassurer ceux qui sont inquiets de se faire ban, je les invite à lire [cet article](https://developer.riotgames.com/league-client-apis.html) par Riot qui traite de la technologie utilisée pour EzLeague.

Et pour avoir plus de détails techniques sur le programme ou des suggestions, je suis dispo sur discord ArthurFU#2380.

Détail des fonctionnalités disponibles. 

### EzProc 
Accepte la partie pour vous après un délai défini dans les options.

### EzRunes
Récupère et crée la page de runes de votre personnage la plus populaire sur [League of Graphs](https://www.leagueofgraphs.com/fr/)

### EzSpells 
Dans le même esprit que EzRunes mais pour les sorts d'invocateurs de votre role. (Pour remplacer le Flash par l'Ignite avec Shaco par exemple)

### EzGuide
Affiche une bulle de notification qui en cliquant dessus redige vers un guide sur le champion en cours.

### EzLobby
Au lancement de la partie, affiche une bulle de notification qui cette fois-ci redirige vers [Porofessor.gg](https://porofessor.gg/) pour avoir les informations des joueurs de la partie.

### EzMuteAll
Après le chargement de la partie, ecrit /mute all dans le chat du jeu. 

### EzPing
Permet de tester rapidement votre ping avec le serveur **EUW**.

### Clic Gauche sur l'icone
Lorsqu'un champion est sélectionné ou échangé, cela déclenche un traitement qui effectuera les tâches EzRunes, EzSpells et EzGuide (celles  activées). Cliquer sur l'icone relance alors ce traitement. (Par exemple pour rafraichir les runes ou afficher de nouveau la fenêtre du guide). 

### CTRL + Clic Gauche l'icone
Maintenir la touche **CONTROLE** relancera aussi le traitement mais avec la subtilité d'ouvrir la fenêtre de choix de role. Cela est utile lorsqu'on souhaite avoir les runes associées à un role différent de celui qui nous est attibué par le jeu en mode draft.








