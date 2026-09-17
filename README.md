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
Todas são aplicadas automaticamente:

- **1** — saldo inicial do resumo considera só as contas Sicredi
- **2** — entradas do Bradesco entram como receita operacional
- **3** — mora/encargos do Bradesco contam nas saídas, para o painel fechar com o extrato
- **4** — categoria "Aporte - Transf. entre contas (GAMEL)": uma loja emprestando para outra pela
  conta GAMEL. Sai do resultado e alimenta o bloco de Aportes, com as duas pontas e o ranking de
  quem mais empresta e quem mais recebe
- **5** — categoria "Transf. entre lojas": sai do resultado e vai para o bloco de Transferências
- **6** — vendas no iFood não entram no resultado do dia

Quem classifica os aportes e as transferências é a **categoria do próprio sistema**, nunca o nome
na descrição: o grupo paga Royalties à ML Consultoria, que é do grupo, e casar por nome
transformaria 17 pagamentos de Royalties em transferência interna.

A planilha de contas do Sicredi está no código como lista de CNPJs (`CONTAS_GRUPO`) e serve para
identificar a outra ponta de cada operação e para marcar transferência que saiu para conta fora
da lista. Quando as contas mudarem, é essa constante que precisa ser atualizada.

## Saldo inicial

O extrato exportado só traz "SALDO ANTERIOR" das contas que tiveram movimento no dia, então a
soma dele vem incompleta. O painel usa, nesta ordem:

1. o valor já digitado no campo (alguém conferiu no extrato do banco);
2. o fechamento do dia anterior no painel — saldo inicial + entradas − saídas;
3. a soma dos "SALDO ANTERIOR" do arquivo, se não houver dia anterior.

Digitado a mão, o valor não é sobrescrito pelas importações seguintes.

## Exportando o extrato

Deixe **todas as categorias selecionadas** antes de exportar. O painel é que aplica as regras.
Exportar filtrado remove do arquivo os aportes, as transferências entre lojas e o iFood, e os
blocos ficam vazios sem motivo aparente.
