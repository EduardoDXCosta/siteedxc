# Deploy do site EDXC no Portainer

Guia passo-a-passo para subir o site institucional `edxcautomacao.com.br` na VPS (Portainer + Traefik v2.11.2 + Let's Encrypt + Cloudflare).

## Arquivos gerados nesta pasta

| Arquivo | Função |
|---|---|
| `Dockerfile` | Imagem nginx:alpine servindo os HTMLs estáticos |
| `nginx.conf` | gzip, cache headers, security headers, fallback 404 |
| `.github/workflows/docker.yml` | Action que builda + push para GHCR a cada push em `main` |
| `docker-compose.yml` | Stack para colar no editor do Portainer |
| `.dockerignore` | Evita copiar `skills-main-anthropic`, `.git`, etc. para a imagem |
| `.gitignore` | Lixo do filesystem fora do repo |

---

## 1. Inicializar o repo git e subir para o GitHub

```powershell
cd D:\ProjetosAntigravity\siteEDXC
git init -b main
git add .
git commit -m "feat(site): setup deploy via docker + traefik"
```

Cria um repo **privado ou público** em `github.com/EduardoDXCosta` chamado `siteedxc` (sem README, sem .gitignore, sem license — já estão criados aqui). Em seguida:

```powershell
git remote add origin https://github.com/EduardoDXCosta/siteedxc.git
git push -u origin main
```

## 2. Configurar permissões da Action (uma vez só)

No GitHub, no repo recém-criado:

1. **Settings → Actions → General → Workflow permissions**
2. Marca **"Read and write permissions"**
3. **Save**

Sem isso, o `GITHUB_TOKEN` não consegue dar push na imagem para o GHCR e a Action falha com `denied: permission_denied`.

## 3. Aguardar a primeira Action ficar verde

Acompanha em `github.com/EduardoDXCosta/siteedxc/actions`. Quando estiver com check verde, vai em:

- **Perfil → Packages** (`github.com/EduardoDXCosta?tab=packages`)
- Clica em `siteedxc`
- **Package settings → Danger Zone → Change visibility → Public**

Sem tornar público, o Portainer falha em puxar a imagem com `unauthorized` (a VPS não está logada no GHCR).

## 4. Configurar DNS no Cloudflare

1. Cloudflare → `edxcautomacao.com.br` → **DNS**
2. Adiciona **registro A**:
   - Type: `A`
   - Name: `@` (representa o apex `edxcautomacao.com.br`)
   - IPv4 address: `178.156.149.91` (IP atual da VPS — confirma se ainda é esse)
   - Proxy status: **DNS only** (nuvem CINZA, NÃO laranja)
   - TTL: Auto
3. Salva.

> ⚠️ **Importante**: Cloudflare proxy laranja quebra o desafio HTTP-01 do Let's Encrypt. Deixa cinza até o certificado emitir; depois pode ativar o proxy se quiser CDN.

Verifica propagação:

```powershell
nslookup edxcautomacao.com.br
```

Tem que retornar `178.156.149.91`.

## 5. Criar a stack no Portainer

1. Acessa `https://portainer.edxcautomacao.com.br`
2. **Stacks → Add stack**
3. Nome: `siteedxc`
4. Build method: **Web editor**
5. Cola o conteúdo do `docker-compose.yml` desta pasta
6. **Environment variables** (Advanced mode) — vazio, não precisa setar nada
7. **Deploy the stack**

## 6. Verificar deploy

- Portainer → **Services** → `siteedxc_web` deve mostrar `1/1` running
- Portainer → **Containers** → clica no container → **Logs** → deve aparecer `nginx ... start worker processes`

## 7. Testar em aba anônima

Abre `https://edxcautomacao.com.br` em aba anônima (pra evitar cache):

- Cadeado verde (Let's Encrypt) ✅
- Página carrega com logo, hero, serviços ✅

Se demorar mais de 2 minutos pro cert sair, conferir checklist de debug abaixo.

---

## Atualizar o site depois

Fluxo padrão:

```powershell
# editar arquivos localmente
git add .
git commit -m "feat(site): atualiza secao de servicos"
git push
```

Action builda nova imagem `:latest`. No Portainer:

- **Stacks → siteedxc → "Pull and redeploy"**

Pra fixar versão específica em vez de `:latest`:

- Pega o tag `sha-XXXXXXX` da Action que passou
- No Portainer, **Stacks → siteedxc → Editor** → muda env `IMAGE_TAG=sha-XXXXXXX` → **Update the stack**

---

## Debug — certificado não emite

1. **Resolver name está como `letsencryptresolver`** (não `letsencrypt`)? Confere no docker-compose.yml.
2. **Cloudflare proxy CINZA** (não laranja)?
3. **DNS propagou**? `nslookup edxcautomacao.com.br` → `178.156.149.91`.
4. **EDXCNET na lista de redes do container**? Portainer → Service → Networks.
5. **Logs do Traefik**: Portainer → Containers → `traefik_xxx` → Console → bash:
   ```bash
   tail -100 /var/log/traefik/traefik.log
   ```
   (NÃO usa a aba "Logs" do Portainer pro Traefik — ele escreve em arquivo)
6. **Rate limit Let's Encrypt**: 5 emissões por domínio por semana. Se queimou tentativa, espera 1h.

## Debug — site retorna 404 ou 502

- **404 do Traefik**: roteamento não casou. Confere se o Host na label bate exatamente com o domínio acessado.
- **502 Bad Gateway**: container nginx não está respondendo. Confere logs do container.
- **Conexão recusada**: rede `EDXCNET` não está associada. Confere `traefik.docker.network=EDXCNET` na label.

---

## Resumo do fluxo

```
git push main
   ↓
GitHub Action builda imagem
   ↓
Push para ghcr.io/eduardodxcosta/siteedxc:latest
   ↓
Portainer → "Pull and redeploy"
   ↓
Container nginx novo sobe (start-first: zero downtime)
   ↓
Traefik roteia edxcautomacao.com.br → container:80
```
