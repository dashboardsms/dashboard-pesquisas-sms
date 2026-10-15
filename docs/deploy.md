# Publicação do Dashboard (Cloudflare, plano gratuito)

O dashboard roda na Cloudflare Workers: o mesmo projeto serve o painel público e a API que recebe a planilha. Tudo é feito pelo navegador; não é preciso instalar nada.

```text
Responsável → /importar (com senha) → escolhe a planilha .xlsx
   o navegador lê a planilha, descarta nomes, e-mails, títulos e anotações, e mostra um relatório
   → "Publicar" → API confere a senha e grava os dados (armazenamento KV)
Público → painel → API devolve os dados publicados
```

## Antes de começar

- **Código no GitHub:** faça commit e push das alterações para a branch `main` (no VS Code: *Source Control → Commit → Sync Changes*).
- **Acesso ao repositório:** a Cloudflare precisa ser autorizada a ler o repositório `heldersantosufg/dashboard-pesquisas-sms`. Como ele pertence a outra conta, quem administra o repositório precisa aprovar a instalação do aplicativo da Cloudflare no GitHub (ou fazer o passo 2 com a própria conta).

## 1. Criar a conta na Cloudflare

Crie uma conta gratuita em <https://dash.cloudflare.com/sign-up> e confirme o e-mail.

## 2. Conectar o repositório e fazer o primeiro deploy

1. No painel da Cloudflare, abra **Workers & Pages** e selecione **Create application**.
2. Em **Import a repository**, selecione **Get started**.
3. Escolha a conta do GitHub (autorize o aplicativo da Cloudflare, se for pedido) e selecione o repositório `dashboard-pesquisas-sms`.
4. Configure o projeto exatamente assim:

   | Campo | Valor |
   |---|---|
   | Project name | `dashboard-pesquisas-sms` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` (já vem preenchido) |
   | Root directory (em *Advanced settings*) | `frontend` |
   | Branch | `main` |

   O nome do projeto precisa ser igual ao `name` de `frontend/wrangler.jsonc`; com outro nome, o build falha.
5. Selecione **Save and Deploy** e aguarde o build (1 a 2 minutos).

No primeiro deploy, a Cloudflare cria sozinha o armazenamento KV `DADOS`, onde ficam os dados importados. Os deploys seguintes reaproveitam o mesmo armazenamento.

## 3. Definir a senha de importação

1. Em **Workers & Pages**, abra o Worker `dashboard-pesquisas-sms` e vá em **Settings**.
2. Em **Variables and Secrets**, selecione **Add**.
3. Escolha o tipo **Secret**, use o nome `SENHA_IMPORTACAO` e, como valor, uma senha forte (por exemplo, quatro ou mais palavras aleatórias).
4. Selecione **Deploy** para salvar.

A senha fica guardada só na Cloudflare: não vai para o GitHub e continua valendo nos próximos deploys. Para trocá-la, edite o mesmo secret.

## 4. Importar a planilha

1. Abra o endereço do Worker com `/importar` no final, por exemplo `https://dashboard-pesquisas-sms.SEU-SUBDOMINIO.workers.dev/importar` (o endereço aparece na página do Worker).
2. Selecione a planilha `.xlsx` e confira o relatório: erros impedem a publicação; avisos apontam linhas a revisar.
3. Informe a senha e selecione **Publicar**.
4. Abra o endereço sem `/importar`: o painel já mostra os novos dados.

## 5. Publicar o painel também no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica o painel em <https://heldersantosufg.github.io/dashboard-pesquisas-sms/> a cada push na `main` que mexa em `frontend/`. O Pages só hospeda o site; os dados continuam vindo da API do Worker da Cloudflare.

1. Faça os passos 1 a 3 e copie o endereço do Worker (por exemplo, `https://dashboard-pesquisas-sms.SEU-SUBDOMINIO.workers.dev`).
2. No GitHub, abra o repositório e vá em *Settings → Secrets and variables → Actions → Variables → New repository variable*. Use o nome `API_URL` e, como valor, o endereço do Worker, sem barra no final.
3. Em *Actions → Deploy frontend to GitHub Pages*, selecione **Run workflow** para publicar com o novo endereço.

O Worker só aceita chamadas de outros domínios listados em `ORIGENS_PERMITIDAS` (`frontend/wrangler.jsonc`), que já inclui `https://heldersantosufg.github.io`. Sem a variável `API_URL`, o painel no Pages abre, mas mostra "Nenhuma planilha foi importada ainda". A importação também funciona pelo Pages (`/dashboard-pesquisas-sms/importar`), com a mesma senha.

## Rotina

- **Atualizar os dados:** repita o passo 4 com a planilha nova. Cada importação **substitui** todos os dados publicados, então a planilha deve conter todas as pesquisas que devem aparecer (em uma ou mais abas com o cabeçalho do modelo).
- **Mudar o código:** commit e push na `main`; a Cloudflare faz o build e publica sozinha. Os dados importados e a senha são mantidos.
- **Divulgar no site da SMS:** use um link para o endereço do Worker. Um domínio próprio pode ser configurado em *Settings → Domains & Routes*, mas exige que o DNS do domínio esteja na Cloudflare.

## Formato da planilha

A importação aceita a estrutura de `dados/Registro pesquisas 2026 template.xlsx`: colunas A a V, com os mesmos cabeçalhos e na mesma ordem (maiúsculas, acentos e espaços extras não importam). A página `/importar` lista as colunas e o uso de cada uma.

Para o painel ficar completo, a planilha precisa:

- trazer em **Situação** um destes valores: *Em análise*, *Em execução*, *Finalizada* ou *Cancelada*. Com anotações livres, a situação é inferida das outras colunas (critérios em “Sobre os dados”, no painel);
- ter **Distrito Sanitário** e **Unidade de Saúde** preenchidos (vários valores na mesma célula, separados por ponto e vírgula).

## Limites do plano gratuito

| Recurso | Limite | Uso deste painel |
|---|---|---|
| Requisições à API | 100 mil por dia | 1 por visita ao painel |
| Arquivos do painel (HTML, JS, CSS) | ilimitados | — |
| Leituras do KV | 100 mil por dia | 1 por visita |
| Gravações do KV | mil por dia | 1 por importação |
| Tamanho de um valor no KV | 25 MiB | cerca de 11 KB para 50 pesquisas |

## Problemas comuns

- **O build falha citando o nome do Worker:** confira se o *Project name* é `dashboard-pesquisas-sms`.
- **“A senha de importação não foi configurada no servidor”:** faça o passo 3.
- **“Senha incorreta”:** confira o valor do secret `SENHA_IMPORTACAO`.
- **O build falha ao criar o KV:** crie-o à mão em *Storage & Databases → KV → Create* (qualquer nome). Depois, no Worker, vá em *Settings → Bindings → Add → KV namespace*, use o nome de variável `DADOS`, selecione o namespace criado e rode o deploy de novo (*Deployments → Retry*).
