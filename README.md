# Fechamento Diário — Grupo Londrino

Painel de fechamento financeiro diário. É um arquivo só (`index.html`), publicado na Vercel.

## Como usar no dia a dia

1. Abra o painel.
2. Em **Importar planilha**, escolha o extrato do dia (`.xlsx` ou `.csv`). O painel pula sozinho
   para a data do extrato e preenche entradas, saídas, saldo inicial, composição das saídas,
   fechamento real por banco e a tabela por loja.
3. Ajuste na mão o que o extrato não traz: despesas urgentes, limites, transferências entre
   contas, aportes GAMEL e projeção da semana. Tudo salva sozinho enquanto você digita.
4. Clique em **Publicar este dia**. A partir daí, qualquer pessoa que abrir o link vê esse dia.

Enquanto você não publica, os números ficam só no seu computador — o painel avisa isso na tela.

## Onde os dados ficam

| Camada | Onde | Quem enxerga |
|---|---|---|
| Rascunho | `localStorage` do navegador | só quem está naquele computador |
| Publicado | `dados.json` deste repositório, via `/api/dados` | qualquer pessoa com o link |

Cada publicação é um commit, então o histórico de quem publicou o quê e quando fica registrado
no próprio GitHub.

## Configuração (uma vez só)

O botão Publicar precisa de duas variáveis de ambiente na Vercel. Sem elas o painel continua
funcionando, mas só localmente — e avisa na tela que a publicação não está disponível.

### 1. Criar o token do GitHub

1. Acesse **https://github.com/settings/personal-access-tokens/new**
2. **Token name**: `painel-fechamento`
3. **Expiration**: escolha o prazo que preferir (se expirar, o botão Publicar para de funcionar
   e é só gerar outro e atualizar na Vercel)
4. **Repository access** → *Only select repositories* → selecione **Sal---Fechamento-Diario-Financeiro**
5. **Permissions** → *Repository permissions* → **Contents** → mude para **Read and write**
6. Clique em **Generate token** e copie o código que aparece (ele só é mostrado uma vez)

### 2. Colocar as variáveis na Vercel

No projeto da Vercel → **Settings** → **Environment Variables**, adicione duas:

| Name | Value |
|---|---|
| `GITHUB_TOKEN` | o token que você acabou de copiar |
| `PUBLISH_PASSWORD` | a senha que quem for publicar vai digitar no painel |

Marque as duas para **Production** (e Preview, se quiser testar em branch).

### 3. Republicar

Em **Deployments**, no deploy mais recente, clique nos três pontinhos → **Redeploy**.
Variáveis de ambiente só passam a valer em um deploy novo.

Pronto. Quem for alimentar o painel digita o nome e essa senha uma vez — o navegador guarda os
dois e nas próximas é só clicar em Publicar.

### Variáveis opcionais

| Name | Padrão |
|---|---|
| `GITHUB_REPO` | `financeirogr01-hash/Sal---Fechamento-Diario-Financeiro` |
| `GITHUB_BRANCH` | `main` |

## Regras permanentes de classificação

Estão documentadas no topo do `<script>` em `index.html` e valem para todo extrato importado.
Todas são aplicadas automaticamente na importação:

- **1** — saldo inicial do resumo considera só as contas Sicredi
- **2** — entradas do Bradesco entram como receita operacional
- **3** — mora/encargos do Bradesco ficam fora do resultado
- **4** — na conta GAMEL, só a categoria que começa com "Aporte" é tratada como aporte; ela sai
  do resultado operacional e alimenta o bloco de Aportes GAMEL com as duas pontas
- **5** — saída cujo favorecido é outra empresa do grupo é transferência interna: sai das saídas
  operacionais e vai para o bloco de Transferências

A lista de empresas do grupo usada pela regra 5 é montada a partir da coluna **Empresa** do
próprio extrato, e a comparação usa o nome inteiro ("ELMA FOODS"), nunca só o começo — cortar
em "SICA" faria um Pix de uma cliente chamada Jessica virar transferência interna. Como
consequência, uma transferência para uma empresa do grupo cuja conta não esteja no arquivo não
é identificada, e precisa ser lançada à mão.
