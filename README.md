# Qur'an Comparative Study — Prototype 0.1

A first PWA shell for comparative ayah study.

## Current status
- Responsive workspace layout
- Add/remove ayah reference placeholders
- Individual notes and group notes
- Local browser storage and JSON backup import/export
- A5 print stylesheet
- PWA manifest and service worker shell

## Important limitations
This prototype intentionally does **not** contain Quran text, Bengali translation, or tajweed color markup yet. Those must be integrated from a verified, legally reusable Greentech source. Do not treat placeholder cells as Quran content.

## Run locally
Serve this folder over localhost/HTTPS. Service workers do not work from `file://`.

## Deploy
Upload the folder contents to a new GitHub repository named `quran-comparative-study`, then enable GitHub Pages from the repository's Settings > Pages.

## Next development gate
Verify the Greentech repository's license, data format, Bengali translation attribution, and tajweed markup before integration.
