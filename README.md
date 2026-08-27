# Rosini — site premium de prezentare

Site static, generat la build din conținutul Markdown administrat prin Decap CMS.

## Build

`npm run build`

Publicarea se face în `_site`. Netlify folosește repository-ul GitHub și rulează `node build.mjs`.

## Admin

Panoul este la `/admin/` și folosește Decap CMS + Netlify Identity + Git Gateway. Activarea Identity/Git Gateway și invitarea administratorilor se fac manual în Netlify.

Conținutul public nu depinde de `/api/site-data`: build-ul generează datele și HTML-ul static. Funcțiile Netlify existente sunt păstrate pentru compatibilitate și audit; frontendul nou nu le solicită critic.
