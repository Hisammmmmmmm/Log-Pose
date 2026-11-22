# Project memory

## Product intent & audience

- Outil de visualisation de globe/cartographie avec rendu interactif et détection de collisions.
- Utilisateur travaille directement dans GitHub (remplacement manuel de fichiers).

## Brand personality & voice

- Communication en français, ton direct et concis.
- Privilégie les réponses courtes avec listes claires de fichiers/actions.

## Visual design & UX direction

- Palette incluant des couleurs de terres (earth/land colors) ajustées récemment.
- Rendu carte/globe avec calculs mathématiques dédiés (`globeMath`).

## Decisions, constraints & rationale

- Framework : Vite + React + TypeScript.
- Ne pas remplacer les fichiers `dist/` : générés automatiquement à la compilation.
- Fichiers source modifiés pour correction carte/collisions : `src/utils/globeMath.ts`, `src/utils/mapProcessor.ts`.
- Fichier de test associé : `src/utils/globeMath.test.ts` (facultatif, vérifie nouvelles couleurs de terres).
- Aucun fichier d'île ou de coordonnées modifié lors de cette correction.
- Tests présents dans le projet (convention `*.test.ts`).

## Open questions & assumptions

- On suppose que l'utilisateur compile localement ou via CI pour régénérer `dist/`.
- Structure exacte du projet (autres modules, routing, état global) encore inconnue — à affiner selon les prochains échanges.