# Guia de cache – Titanium Gestão de Cursos

Quando um cliente relata que está vendo **versão antiga** do site (só em um navegador), quase sempre é cache. Este guia cobre onde pode estar e como resolver.

---

## 1. Onde pode estar o cache

| Lugar | Comum? | O que fazer |
|-------|--------|-------------|
| **Browser do cliente** | Muito | Hard reload, aba anônima, limpar cache |
| **Service Worker (PWA)** | Muito (nosso caso) | Unregister no DevTools ou esperar autoUpdate |
| **CDN / Vercel** | Às vezes | Purge / redeploy |
| **Build sem hash** | Raro (já tratado) | Assets com hash no nome |

---

## 2. Teste rápido para o cliente

Peça para o cliente testar **nesta ordem**:

1. **Hard reload**
   - **Windows:** `Ctrl + Shift + R`
   - **Mac:** `Cmd + Shift + R`
2. **Aba anônima** (Ctrl/Cmd + Shift + N)
3. **Outro navegador** (Chrome, Edge, Firefox, Safari)
4. **Limpar cache** manualmente (Configurações → Privacidade → Limpar dados)

- Se **resolver** → era cache de browser (e/ou Service Worker).
- Se **não resolver** → seguir com purge na CDN e checagem de deploy.

---

## 3. Service Worker (PWA) – o que fizemos no projeto

O projeto usa **Vite PWA** (Service Worker). Ajustes feitos:

- **Cache versionado:** `cacheId` usa `VERCEL_BUILD_ID` ou versão do package, mudando a cada deploy.
- **skipWaiting + clientsClaim:** novo Service Worker ativa logo e assume as abas abertas.
- **cleanupOutdatedCaches:** caches antigos são removidos quando o novo SW ativa.
- **Assets com hash no build:** JS/CSS saem como `assets/[name]-[hash].js` para invalidar cache ao atualizar.

### Se o cliente ainda tiver versão antiga (solução manual no navegador dele)

1. Abrir o site.
2. Abrir **DevTools** (F12).
3. Aba **Application** (Chrome/Edge) ou **Storage** (Firefox).
4. No menu lateral: **Service Workers**.
5. Clicar em **Unregister** no worker listado.
6. Opcional: marcar **“Update on reload”** antes, para testes.
7. Fechar DevTools e dar **hard reload** (Ctrl/Cmd + Shift + R).

Depois disso, o próximo carregamento usa a versão nova do servidor (sem SW antigo).

---

## 4. CDN / Hospedagem (Vercel)

- **Redeploy:** um novo deploy na Vercel já entrega build novo; o edge pode servir HTML novo.
- **Purge (se usar cache extra):** no dashboard da Vercel, não há “Purge Everything” como no Cloudflare; o fluxo é **fazer novo deploy** (e, se precisar, “Clear cache and deploy” na configuração do projeto, se existir).
- Garantir que o **build realmente gerou arquivos novos** (nomes com hash diferentes em `dist/assets/`).

---

## 5. Build – arquivos realmente mudaram?

Após `npm run build`:

- Em `dist/assets/` os arquivos devem ter **hash no nome**, por exemplo:
  - `index-a1b2c3d4.js`
  - `index-e5f6g7h8.css`
- Se o **hash mudou** entre deploys, o browser (e o SW) passam a buscar os novos arquivos.

Configuração no projeto: `vite.config.ts` com `entryFileNames`, `chunkFileNames` e `assetFileNames` usando `[hash]`.

---

## 6. Headers HTTP (já configurados)

No **Vercel** (`vercel.json`):

- **HTML / páginas:** `Cache-Control: no-cache, no-store, must-revalidate` (para `/(.*)`).
- **Assets em `/assets/`:** `Cache-Control: public, max-age=31536000, immutable` (só para arquivos com hash).

No **index.html** há meta tags de apoio:

- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

---

## 7. Prova final (sem discussão com cliente)

Se o cliente insistir que “não é cache”, peça para acessar:

```text
https://SEU-DOMINIO.com/?v=2026
```

(ou `?v=2`, `?v=hoje`, etc.)

- Se **a tela mudar** (versão nova) com `?v=2026` e **continuar antiga** sem o `?v=`, é **cache** (browser e/ou Service Worker). Aí vale hard reload, unregister do SW ou aba anônima no mesmo link.

---

## Resumo rápido

1. Cliente: **hard reload** ou **aba anônima** ou **Unregister** do Service Worker.
2. Projeto: **cache versionado** + **skipWaiting/clientsClaim** + **hash nos assets** já aplicados.
3. Deploy: **novo deploy** na Vercel para servir build novo.
4. Prova: **?v=2026** (ou outro) para confirmar que é cache quando a versão “muda” só com o query string.
