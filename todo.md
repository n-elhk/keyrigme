- Qui est ce
- Qui est ce tete flouté 
- Dogme
- Versets
- Logo
- Rebus
- Paroles traduites en FR
- Culture G
- 4 Images 1 Mot

## Technique : passage à plusieurs instances (Kubernetes)

Aujourd'hui le back ne fonctionne correctement qu'avec **une seule instance**. Avant d'avoir plusieurs replicas :

- **Événements des salles (`RoomHub`)** : ils ne circulent qu'en mémoire. Deux joueurs d'une même salle connectés à deux pods différents ne verraient pas les mêmes événements.
  - Passer `RoomHub` sur RabbitMQ : un exchange `rooms`, avec l'id de la salle comme clé de routage.
  - Une file `exclusive` et `auto-delete` par flux `SubscribeRoom`. RabbitMQ la supprime quand le joueur se déconnecte, donc le compteur d'abonnés actuel n'est plus utile.
  - Garder l'interface `publish` / `subscribe` de `RoomHub` : seule l'implémentation change.
  - Éviter `LISTEN/NOTIFY` de Postgres : un message est limité à 8 Ko, et `ShowAnswers` peut dépasser.
- **Minutage des parties (`QuizzRunner`, `GameRecovery`)** : au démarrage, chaque pod relance toutes les parties en `Started`. Avec plusieurs replicas, ou pendant un déploiement progressif, une même partie tournerait plusieurs fois.
  - Ajouter un bail en base : le pod qui fait tourner la partie, et la date de son dernier signe de vie.
  - Un seul pod fait tourner chaque partie. Un autre ne la reprend que si le bail a expiré.
