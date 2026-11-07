# Sincronização com o Google Sheets

Com a sincronização ligada, o painel acompanha sozinho a planilha de registro de pesquisas no Google Sheets: quem edita a planilha não precisa importar nada. A importação manual em `/importar` continua funcionando (veja [Convivência com a importação manual](#convivência-com-a-importação-manual)).

```text
Escola edita a planilha no Google Sheets
   → GitHub Actions, a cada 5 minutos (src/sincronizar.js):
       baixa a planilha em CSV, converte com as mesmas regras do /importar
       e descarta nomes, e-mails, títulos e anotações
   → só se algo mudou: PUT /api/dados (com a senha) → o Worker grava no KV
Painel aberto → consulta /api/dados a cada minuto e se atualiza sem recarregar a página
```

Do salvamento na planilha até o painel, o tempo costuma ficar entre 5 e 15 minutos: o GitHub atrasa execuções agendadas em horários de pico, e o painel leva até mais 1 minuto para buscar os dados novos.

## Configurar (uma vez)

Faça antes os passos de [deploy.md](deploy.md): a sincronização publica no mesmo Worker, com a mesma senha.

1. **Compartilhar a planilha:** no Google Sheets, selecione *Compartilhar → Acesso geral → Qualquer pessoa com o link* e mantenha o papel *Leitor*. Em *Arquivo → Configurações*, a localidade deve ser *Brasil*, para as datas saírem como DD/MM/AAAA.
2. **Cadastrar os secrets no GitHub:** no repositório, abra *Settings → Secrets and variables → Actions → Secrets → New repository secret* e crie:

   | Nome | Valor |
   |---|---|
   | `URL_PLANILHA` | o link de compartilhamento da planilha. Para ler outra aba, use o link com o `#gid=` dela |
   | `SENHA_IMPORTACAO` | a mesma senha do secret `SENHA_IMPORTACAO` do Worker (passo 3 de [deploy.md](deploy.md)) |

   A variável `API_URL`, com o endereço do Worker, é a mesma do passo 5 de [deploy.md](deploy.md); se ela ainda não existe, crie-a em *Variables*.
3. **Ativar:** faça push na `main`. Execuções agendadas só rodam na branch padrão. A partir daí, o workflow *Sincronizar planilha do Google Sheets* roda a cada 5 minutos.

O link da planilha fica só no secret. Quem tem o link vê a planilha inteira, inclusive nomes e e-mails, por isso ele não deve aparecer no código, em issues ou em mensagens.

## Como testar se está sincronizando

### Na produção

1. **Rodar na hora:** em *Actions → Sincronizar planilha do Google Sheets*, selecione **Run workflow**. Abra a execução e o passo *Sincronizar*:
   - na primeira vez, aparece `Painel atualizado: N pesquisas publicadas em <data e hora>.` (em UTC, como todo o log do Actions);
   - nas seguintes, sem edição na planilha, aparece `Sem mudanças: o painel já mostra as N pesquisas da planilha.`
2. **Conferir os dados publicados:** abra `<API_URL>/api/dados` no navegador. O campo `atualizadoEm` traz a data e a hora (UTC) da última publicação, e a lista `pesquisas` deve ter o mesmo número do log. No painel, a mesma data e hora aparece no cabeçalho, no horário de Brasília.
3. **Testar uma edição:** abra o painel e deixe a aba visível. Na planilha, altere um valor que apareça no painel, como o distrito de uma pesquisa. Rode o workflow de novo ou espere a próxima execução agendada: o log mostra `Painel atualizado`, e em até 1 minuto o painel aberto muda sozinho. Desfaça a edição e repita para voltar ao estado anterior.
4. **Acompanhar:** a aba *Actions* lista cada execução. Verde significa que a sincronização rodou, publicando ou não; vermelho significa falha, com o motivo no log.

### No computador, sem mexer na produção

O KV local começa vazio e fica em `frontend/.wrangler/`, separado do publicado. Para testar edições sem alterar a planilha oficial, use uma cópia (*Arquivo → Fazer uma cópia*) compartilhada por link.

```bash
cp .env.example frontend/.dev.vars    # preencha URL_PLANILHA e uma SENHA_IMPORTACAO local
cd frontend && npm install && npm run dev       # terminal 1: painel + API + KV em http://localhost:5173
node --env-file=frontend/.dev.vars src/sincronizar.js   # terminal 2, na raiz do repositório
```

1. A primeira execução publica tudo (`Painel atualizado: …`), e o painel em <http://localhost:5173> passa a mostrar os dados.
2. Rodando de novo sem editar a planilha, aparece `Sem mudanças`.
3. Edite a cópia da planilha, rode o comando outra vez e veja `Painel atualizado`. O painel aberto muda em até 1 minuto, sem recarregar.

## Mensagens do log

| Mensagem | Significado |
|---|---|
| `Painel atualizado: N pesquisas publicadas …` | a planilha mudou e os dados novos foram publicados |
| `Sem mudanças: …` | a planilha não mudou desde a última publicação; nada foi gravado |
| `Sincronização desligada: URL_PLANILHA não foi configurada.` | falta o secret `URL_PLANILHA`; a execução termina sem erro |
| `Aviso da planilha: <tipo> (n)` | os mesmos avisos do relatório do `/importar`. O log mostra só o tipo e a quantidade, porque é público; para ver as linhas, baixe a planilha como `.xlsx` e confira em `/importar` |
| `Sincronização falhou: A planilha não está acessível …` | a planilha não está compartilhada por link (passo 1) |
| `Sincronização falhou: Planilha não encontrada …` | o link em `URL_PLANILHA` está errado ou a planilha foi apagada |
| `Sincronização falhou: Senha incorreta.` | `SENHA_IMPORTACAO` do GitHub difere da do Worker |
| `Sincronização falhou: Não foi possível acessar o Google Sheets …` | instabilidade de rede; a próxima execução tenta de novo |
| `Sincronização falhou: Nenhuma aba tem as colunas do modelo …` | os cabeçalhos da planilha não seguem o modelo de `docs/dados/` (mesmos erros do `/importar`) |

Quando uma execução agendada falha, o GitHub envia um e-mail para quem alterou o agendamento do workflow por último.

## Convivência com a importação manual

Com `URL_PLANILHA` configurada, a planilha do Google é a fonte dos dados. Se alguém importar em `/importar` um arquivo com dados diferentes, a próxima execução substitui esses dados pelos da planilha do Google. Para voltar a usar só a importação manual, apague o secret `URL_PLANILHA` ou desative o workflow (*Actions → Sincronizar planilha do Google Sheets → ⋯ → Disable workflow*).

## Diferenças em relação ao `.xlsx`

- **Uma aba só:** a sincronização lê a aba do link (a primeira, se o link não tem `#gid=`). A importação manual lê todas as abas do arquivo.
- **Valores como aparecem na tela:** o CSV traz o texto exibido nas células. Por isso, números de protocolo como `08/2024`, que o Google Sheets guarda como data, continuam corretos. No `.xlsx` exportado pelo Google, esses números viram datas, e o `/importar` pode tratar protocolos diferentes como repetidos. Nos testes com a planilha atual, 3 das 50 pesquisas foram descartadas assim.

## Limites

- **GitHub Actions:** 5 minutos é o menor intervalo de agendamento. Em repositórios públicos, a execução é gratuita, mas o GitHub desativa workflows agendados depois de 60 dias sem atividade no repositório; para reativar, use *Actions → Sincronizar planilha do Google Sheets → Enable workflow*. Se o repositório ficar privado, cada execução consome pelo menos 1 minuto da cota (cerca de 8.600 minutos por mês, acima dos 2.000 gratuitos).
- **Cloudflare:** a sincronização faz 1 leitura da API a cada 5 minutos (288 por dia) e só grava no KV quando algo muda. O painel aberto e visível faz 1 requisição por minuto. Os totais estão em [deploy.md](deploy.md#limites-do-plano-gratuito).

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/planilhaGoogle.js` | monta o link do CSV, baixa a planilha e reaproveita a conversão de `frontend/src/planilha/` |
| `src/sincronizar.js` | compara com a base publicada e publica pela API |
| `.github/workflows/sincronizar-planilha.yml` | agenda a execução a cada 5 minutos e permite rodar à mão |
| `frontend/src/hooks/useBaseDePesquisas.js` | atualiza o painel aberto a cada minuto |
| `.env.example` | variáveis usadas no computador (copie para `frontend/.dev.vars`) |
