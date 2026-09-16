# CAXETA ROYALE — Escopo Completo v1.0

> Jogo de cartas multiplayer mobile que combina a mecânica da **Caxeta** brasileira com o sistema de poderes e progressão do **Balatro**.

---

## 01 — Visão Geral do Produto

**Nome:** Caxeta Royale
**Plataforma primária:** Mobile Android (landscape, APK via WebView nativo)
**Plataforma de testes:** Web via servidor Go em `localhost:8080`
**Jogadores:** 2 a 5 (humanos locais hot-seat + bots, qualquer combinação)
**Duração média:** Partida rápida 2–3 min, Campeonato 8–20 min
**Público:** Casual, para jogar com amigos. Sem competitivo online.
**Monetização:** Zero. Moeda interna "Fichas (₣)" ganha apenas jogando.

---

## 02 — Regras Base da Caxeta (Implementação Completa)

### 2.1 — Setup

- 2 baralhos de 52 cartas = 104 cartas totais (sem jokers do baralho físico).
- Cada jogador recebe **9 cartas**, distribuídas uma a uma, alternadamente.
- O restante forma o **Maço** (monte de compra).
- A primeira carta do topo do Maço é virada: esta é a **Vira**.

### 2.2 — Sistema da Vira e Curinga

- A Vira determina os curingas da rodada.
- O curinga é a carta de valor **imediatamente superior** à Vira, **da mesma cor** (vermelho ou preto).
- Exemplo: Vira = 8♣ (Paus) → curingas = todos os 9 pretos (9♣ e 9♠).
- Exemplo: Vira = J♥ (Copas) → curingas = todos os Q vermelhos (Q♥ e Q♦).
- Se a Vira for um K, o curinga é o Ás da mesma cor.
- Máximo de **1 curinga por combinação** (trinca ou sequência).
- Proibido formar combinação composta **apenas** de curingas.
- Curinga substitui qualquer carta de qualquer valor/naipe dentro de uma combinação.

### 2.3 — Ordem das Cartas

```
A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
```

- O Ás vale como **1** (abaixo do 2: A-2-3) ou como **14** (acima do K: Q-K-A).
- **Não dá a volta:** K-A-2 é inválido.

### 2.4 — Combinações Válidas

**Trinca:**
- 3 cartas do **mesmo valor**, de **naipes diferentes**.
- Pode agregar 4ª ou 5ª carta do mesmo valor, desde que seja de naipe já presente na trinca (dobrada).
- Exemplo válido: 5♥ 5♣ 5♦ + 5♦ (dobrou Ouros).
- Exemplo inválido: 5♥ 5♥ 5♣ (dois do mesmo naipe sem ser dobrada de trinca existente).

**Sequência:**
- 3 ou mais cartas **do mesmo naipe** em **ordem consecutiva**.
- Exemplo: 7♠ 8♠ 9♠ ou 10♥ J♥ Q♥ K♥.
- Ás como ponta baixa: A♦ 2♦ 3♦ — válido.
- Ás como ponta alta: Q♣ K♣ A♣ — válido.
- K-A-2 — **inválido**.

### 2.5 — Fluxo de Turno

1. Jogador à esquerda do distribuidor começa.
2. **Compra:** pega 1 carta do Maço OU da Lixeira (topo visível).
3. **Organiza:** tenta montar combinações na mão.
4. **Descarta:** coloca 1 carta na Lixeira.
5. Vez passa ao próximo jogador no sentido horário.

### 2.6 — Bater (Condição de Vitória da Rodada)

**Bater com 9 cartas:**
- Baixar as 9 cartas da mão formando **exatamente 3 combinações** válidas (3 × 3 cartas).
- O jogador bate **antes** de descartar (não compra nem descarta).

**Bater com 10 cartas:**
- Usar as 9 cartas + a carta recém-comprada.
- Forma 3 combinações onde **pelo menos uma** tem 4+ cartas (ponta).
- Bater com 10 é mais valioso (bônus de vidas e fichas).

**Mão Batida:**
- Se o jogador já tem 9 cartas formando 3 combinações válidas após a distribuição (antes de jogar qualquer turno), pode declarar mão batida na sua primeira vez.
- Mão batida é o resultado mais raro e valioso.

### 2.7 — Mecânicas Especiais

**Na Boa:**
- Quando falta **1 carta** para bater, o jogador pode declarar "tô na boa".
- Direito adquirido: pode furar a fila para pegar da Lixeira fora de vez.
- Declarar na boa é opcional — pode guardar em segredo.

**Furar a Fila:**
- Jogador "na boa" pode interceptar um descarte na Lixeira fora de sua vez para bater imediatamente.
- Só pode furar para **bater** — não pode furar para montar e continuar jogando.

**Queimar:**
- Se furar a fila e a carta **não servir** para bater, o jogador fica "queimado".
- Queimado = perde o direito de furar fila pelo resto da rodada.
- Continua jogando normalmente em sua vez.

**Pifar (Blefe):**
- Declarar estar "na boa" (pifado) mesmo sem estar, para intimidar adversários.
- Adversários ficam com medo de descartar cartas que podem servir.
- Se tentar furar a fila blefando → queima.

### 2.8 — Sistema de Vidas

- Cada jogador começa com **7 ou 10 vidas** (configurável no lobby).
- Quando alguém bate: todos os outros perdem **1 vida**.
- Jogador com 0 vidas = eliminado da partida.
- Último jogador de pé = **vencedor**.

**Bônus do Caxeta Royale (sistema próprio):**

| Tipo de Batida | Penalidade aos Adversários |
|---|---|
| Bater com 9 | −1 vida |
| Bater com 10 | −2 vidas |
| Mão Batida | −3 vidas |
| Bater com flush total (todas do mesmo naipe) | −2 vidas + 50₣ bônus |

### 2.9 — Variação Cachetão (Modo Opcional)

- Antes de jogar cada rodada, cada jogador decide: **Jogar** ou **Correr (Fold)**.
- Correr = perde **1 vida** automaticamente, mas não participa da rodada.
- Jogar e perder = perde **2 vidas**.
- Jogar e bater = adversários que jogaram perdem vidas normalmente; quem correu já perdeu 1.
- Ativável como modo separado no lobby.

### 2.10 — Lixeira e Maço

- **Lixeira:** pilha de descartes, apenas a carta do topo é visível.
- **Maço:** monte de compra, cartas viradas para baixo.
- Se o Maço acabar: a Lixeira (exceto a carta do topo) é embaralhada e vira o novo Maço.
- A Vira permanece a mesma durante toda a rodada.

---

## 03 — Sistema de Poderes (Inspiração Balatro)

O Balatro possui 150 Jokers, 22 Tarot Cards, 12 Planet Cards, 18 Spectral Cards, 32 Vouchers, 15 Decks, e um sistema de Enhancements/Editions/Seals. Adaptamos todos esses conceitos ao universo da Caxeta com nomes, temáticas e efeitos contextualizados.

### 3.1 — Coringas Especiais (60 cartas) — Equivalente aos Jokers do Balatro

Cartas que ocupam **slots separados** (máximo 3 por partida) e aplicam efeitos **persistentes** durante toda a partida. Compráveis na loja antes da partida. Divididos em 7 tipos funcionais (como no Balatro):

**Tipos funcionais:**

| Tipo | Descrição | Qtd |
|---|---|---|
| Ofensivo | Aumenta penalidade de vidas aos adversários | 12 |
| Defensivo | Protege suas vidas ou reduz penalidades | 8 |
| Econômico | Gera mais Fichas (₣) | 10 |
| Manipulação | Altera cartas, turnos ou regras | 12 |
| Informação | Revela informações dos adversários | 8 |
| Sorte | Altera probabilidades de compra | 5 |
| Lendário | Efeitos extremos com drawbacks | 5 |

**Raridades:**

| Raridade | Quantidade | Custo (₣) | Cor do brilho |
|---|---|---|---|
| Comum | 25 | 50–150 | Cinza |
| Incomum | 18 | 200–400 | Verde |
| Raro | 12 | 500–800 | Azul |
| Lendário | 5 | 1500–2500 | Dourado |

**Lista completa dos 60 Coringas Especiais:**

COMUNS (25):

| # | Nome | Tipo | Efeito |
|---|---|---|---|
| 1 | Olho de Gato | Ofensivo | Ao bater, adversários perdem +1 vida extra. |
| 2 | Mão de Ouro | Manipulação | Primeiro turno: compra 2 cartas ao invés de 1. |
| 3 | Pé de Coelho | Sorte | +10% chance de comprar curinga do maço. |
| 4 | Bolso Fundo | Econômico | +10₣ por rodada jogada (mesmo perdendo). |
| 5 | Escudo de Papel | Defensivo | 1x por partida: anula a perda de vida ao ser batido. |
| 6 | Dedo Rápido | Manipulação | Pode descartar e comprar na mesma ação (2 cartas por turno). |
| 7 | Isca | Informação | Vê a 2ª carta da Lixeira além da 1ª. |
| 8 | Cara de Pau | Manipulação | Pifar (blefar) nunca queima na 1ª vez por rodada. |
| 9 | Moedeiro | Econômico | Ganha +5₣ toda vez que descarta uma figura (J/Q/K). |
| 10 | Casco Duro | Defensivo | Se tiver 3+ vidas, penalidade de batida é reduzida em 1. |
| 11 | Catador | Manipulação | Pode comprar a 2ª carta da Lixeira (não só a do topo). |
| 12 | Apressado | Ofensivo | Se bater nos primeiros 3 turnos, penalidade +1 vida extra. |
| 13 | Reserva | Defensivo | Começa com +1 vida extra. |
| 14 | Trevo | Sorte | 1x por rodada: se comprar do maço e não servir, pode devolver e comprar outra. |
| 15 | Faro | Informação | No início de cada rodada, revela o valor (não naipe) de 1 carta aleatória de cada adversário. |
| 16 | Artesão | Manipulação | Trincas de 3 cartas podem incluir 2 do mesmo naipe (ignora regra de naipes diferentes). |
| 17 | Comerciante | Econômico | Itens da loja custam -10%. |
| 18 | Acumulador | Econômico | +2₣ para cada carta que sobrar na mão quando alguém bater. |
| 19 | Persistente | Defensivo | Se for eliminado, volta com 1 vida (1x por partida). |
| 20 | Curioso | Informação | Ao comprar da Lixeira, vê a próxima carta do Maço. |
| 21 | Contador | Informação | Mostra quantas cartas cada adversário tem na mão. |
| 22 | Velocista | Ofensivo | Se bater com 9 cartas, ganha bônus como se fosse 10. |
| 23 | Reciclador | Manipulação | Pode pegar do próprio descarte (1x por rodada). |
| 24 | Sorriso Falso | Manipulação | Ao declarar "Na Boa", adversários não sabem se é blefe ou verdade (ícone escondido). |
| 25 | Colecionador | Econômico | +15₣ bônus se bater com 3 trincas (sem sequência). |

INCOMUNS (18):

| # | Nome | Tipo | Efeito |
|---|---|---|---|
| 26 | Baralho Marcado | Informação | Revela 1 carta aleatória da mão de cada adversário permanentemente. |
| 27 | Embaralha Tudo | Manipulação | A cada 3 turnos, troca 1 carta da mão com o topo do maço sem descartar. |
| 28 | Sorte Grande | Sorte | +15% de chance de comprar curinga do maço. |
| 29 | Ladrão de Sorte | Ofensivo | Quando adversário declara "Na Boa", ele perde o privilégio até o próximo turno. |
| 30 | Muralha | Defensivo | Penalidade máxima que você recebe é 1 vida (ignora bônus de batida com 10/mão batida). |
| 31 | Espião | Informação | Vê todas as cartas descartadas na rodada (mesmo as enterradas na Lixeira). |
| 32 | Alquimista | Manipulação | 1x por rodada: converte 1 carta para o naipe que precisar. |
| 33 | Seguro de Vida | Defensivo | Se ficar com 1 vida, ganha +2 vidas de bônus (1x por partida). |
| 34 | Investidor | Econômico | A cada 5 rodadas, ganha 50₣ de juros. |
| 35 | Sabotador | Ofensivo | 1x por partida: força 1 adversário a descartar 1 carta aleatória extra no próximo turno. |
| 36 | Dono da Mesa | Manipulação | Você escolhe o sentido de jogo (horário/anti-horário) no início da rodada. |
| 37 | Duplicador | Manipulação | 1x por partida: duplica 1 Carta de Benção que você tenha. |
| 38 | Presságio | Informação | No início da rodada, vê as 3 primeiras cartas do Maço. |
| 39 | Cobrador | Ofensivo | Adversário que queimar perde 1 vida extra. |
| 40 | Ímã | Manipulação | Se a carta do topo da Lixeira completar sua trinca/sequência, pode pegá-la gratuitamente sem gastar turno. |
| 41 | Armadilha | Ofensivo | Se adversário furar fila e bater, ele não recebe bônus de fichas. |
| 42 | Banqueiro | Econômico | Dobra as Fichas ganhas na rodada final (quando alguém é eliminado). |
| 43 | Trocador | Manipulação | 1x por rodada: troca 1 carta com 1 carta aleatória de adversário aleatório. |

RAROS (12):

| # | Nome | Tipo | Efeito |
|---|---|---|---|
| 44 | Mestre da Vira | Sorte | A carta 2 posições acima da Vira também vira curinga (curingas extras). |
| 45 | Olho do Furacão | Defensivo | Ao declarar "Na Boa", imunidade a queimar por 1 rodada inteira. |
| 46 | Trickster | Manipulação | Pode pifar 2x por rodada sem penalidade. Blefes nunca queimam. |
| 47 | Mão Fantasma | Manipulação | Pode manter 1 carta escondida que não conta para limite de mão. |
| 48 | Executor | Ofensivo | Bater com 10 cartas = adversários perdem 3 vidas (ao invés de 2). |
| 49 | Curandeiro | Defensivo | Ao bater, recupera 1 vida própria. |
| 50 | Magnata | Econômico | Começa a partida com +200₣. |
| 51 | Vidente | Informação | Vê a mão completa de 1 adversário escolhido durante toda a rodada. |
| 52 | Caos | Manipulação | A cada rodada, a Vira muda aleatoriamente (curingas mudam). |
| 53 | Parasita | Ofensivo | Quando adversário bater, se você estiver "Na Boa", rouba 1 vida dele. |
| 54 | Forja | Manipulação | Pode usar 2 curingas na mesma combinação (ignora limite de 1). |
| 55 | Oráculo | Informação | No início da partida, vê qual carta será a Vira antes da distribuição. |

LENDÁRIOS (5):

| # | Nome | Tipo | Efeito | Drawback |
|---|---|---|---|---|
| 56 | Rei da Mesa | Ofensivo | Se bater com 10 cartas sendo todas do mesmo naipe, elimina todos os adversários. | −2 vidas próprias no início da partida. |
| 57 | Espelho Negro | Manipulação | Copia o Coringa Especial mais forte do adversário com mais vidas. | Perde 1₣ por turno jogado. |
| 58 | Fênix | Defensivo | Ao ser eliminado, ressurge com 3 vidas e mão nova. | Só pode carregar 1 Coringa Especial (inclui este). |
| 59 | Midas | Econômico | Toda carta que tocar (comprar) ganha Selo Dourado (+5₣). | Adversários ganham +1 vida no início. |
| 60 | Coringa Supremo | Manipulação | Todas as cartas da sua mão são tratadas como curingas adicionais. | Apenas 5 vidas iniciais (fixo, ignora config). |

### 3.2 — Cartas de Benção (20 cartas) — Equivalente às Tarot Cards

Consumíveis de **uso único**. Usáveis no início do seu turno (antes de comprar). Máximo de **2 em mãos** por vez. Compradas na loja ou ganhas como drop ao bater.

| # | Nome | Efeito |
|---|---|---|
| 1 | Troca Divina | Converte o naipe de 1 carta da mão para qualquer outro. |
| 2 | Ascensão | Aumenta o rank de 1 carta em +1 (ex: 5→6, Q→K). |
| 3 | Queda | Diminui o rank de 1 carta em -1 (ex: 8→7, 3→2). |
| 4 | Espelho | Duplica 1 carta da mão (gera cópia exata, mão fica com 10). |
| 5 | Purificação | Remove o status "queimado" de você imediatamente. |
| 6 | Olho da Verdade | Revela toda a mão de 1 adversário durante 2 turnos. |
| 7 | Destruição | Destrói 1 carta da mão e compra 2 do Maço. |
| 8 | Roda da Fortuna | 50% chance de dobrar Fichas ganhas na rodada, 50% perde metade. |
| 9 | Congelamento | Próximo adversário pula 1 turno. |
| 10 | Terremoto | Todos os jogadores (inclusive você) descartam 1 carta aleatória. |
| 11 | Renascimento | Recupera 1 vida (máximo = vida inicial). |
| 12 | Metamorfose | Transforma 1 carta em curinga permanente (dura a rodada). |
| 13 | Invisibilidade | Suas declarações de "Na Boa" ficam ocultas por 1 rodada. |
| 14 | Teleporte | Troca 2 cartas da sua mão entre si com 2 do Maço (sem ver antes). |
| 15 | Bênção do Maço | Próximas 3 compras do Maço: vê a carta antes de decidir comprar. |
| 16 | Reversão | Inverte a ordem de jogo (horário ↔ anti-horário) por 1 rodada. |
| 17 | Duplicata | Copia o efeito da última Benção usada por qualquer jogador. |
| 18 | Proteção | Imunidade total a efeitos de Coringas adversários por 1 rodada. |
| 19 | Caça ao Tesouro | Ganha 30₣ imediatamente. |
| 20 | Maldição | Escolhe 1 adversário: ele não pode declarar "Na Boa" por 2 rodadas. |

### 3.3 — Cartas Astrais (12 cartas) — Equivalente às Planet Cards

Consumíveis que melhoram **permanentemente** um tipo de combinação pelo restante da partida. Cada nível empilha. Compradas na loja ou como drop raro.

| # | Nome | Combinação | Efeito (por nível) |
|---|---|---|---|
| 1 | Lua | Trinca simples (3 cartas) | Ao bater com trinca: +1 vida recuperada. |
| 2 | Sol | Sequência longa (4+ cartas) | Adversários perdem +1 vida extra por sequência longa. |
| 3 | Estrela | Bater com 10 | Bônus ₣ ×2 ao bater com 10. |
| 4 | Cometa | Mão Batida | Mão batida dá ₣ ×5 de bônus. |
| 5 | Vênus | Trinca de figuras (J/Q/K) | Trinca de figuras: adversários perdem +1 vida. |
| 6 | Marte | Sequência com curinga | Curinga em sequência conta como 2 cartas. |
| 7 | Júpiter | Trinca de Ases | Trinca de Ases vale como 2 combinações válidas. |
| 8 | Saturno | Sequência baixa (A-2-3 ou 2-3-4) | Sequência baixa: ganha +20₣ bônus. |
| 9 | Urano | Todas as 3 combinações do mesmo tipo (3 trincas ou 3 sequências) | +2 vidas de penalidade aos adversários. |
| 10 | Netuno | Bater com curinga em todas as 3 combinações | Adversários perdem +1 vida por curinga usado. |
| 11 | Plutão | Bater sem usar nenhum curinga | +50₣ bônus por batida "pura". |
| 12 | Buraco Negro | Todas as combinações (upgrade geral) | +1 vida recuperada e +10₣ em qualquer batida. |

### 3.4 — Selos e Melhorias — Equivalente a Enhancements/Editions/Seals

Melhorias aplicáveis a cartas individuais do deck. Persistem durante toda a partida. Máximo de **1 selo** e **1 melhoria** por carta. Compradas na loja (Deck Builder).

**Selos (aplicados a cartas específicas):**

| Selo | Efeito | Custo |
|---|---|---|
| Selo Dourado | Carta ganha +5₣ quando usada para bater. | 30₣ |
| Selo Rubi | Carta re-ativa 1x (conta como 2 na combinação). | 80₣ |
| Selo Safira | Ao descartar esta carta, compra 1 Benção aleatória. | 60₣ |
| Selo Esmeralda | Ao descartar, próximo adversário não pode comprar da Lixeira. | 70₣ |
| Selo Ametista | Se estiver na mão quando alguém bater, ganha 10₣ de consolação. | 40₣ |

**Melhorias (edições da carta):**

| Melhoria | Efeito | Custo |
|---|---|---|
| Carta Selvagem | Conta como qualquer naipe. | 50₣ |
| Carta de Vidro | Ao bater com ela: adversários −2 vidas, mas 50% chance de quebrar (some do deck). | 100₣ |
| Carta Holográfica | Visual especial + 10₣ bônus por uso em batida. | 60₣ |
| Carta Negativa | Permite +1 slot de Coringa Especial extra. | 200₣ |
| Carta de Aço | Enquanto na mão (não usada), reduz penalidade de batida alheia em 1. | 120₣ |
| Carta Dourada | Se estiver na mão no final da rodada, ganha 3₣. | 40₣ |

### 3.5 — Pergaminhos / Vouchers (16 itens)

Melhorias passivas compradas na loja. Persistem durante toda a **sessão de jogo** (múltiplas rodadas até alguém ser eliminado). Máximo de **3 ativos** por vez. Cada um tem uma versão avançada desbloqueável.

| # | Nome | Efeito | Versão Avançada |
|---|---|---|---|
| 1 | Bolso Extra | +1 slot de Benção (3 total). | Bolso Duplo: +2 slots (4 total). |
| 2 | Mão Grande | Recebe 10 cartas na distribuição ao invés de 9. | Mão Gigante: 11 cartas. |
| 3 | Mercador | Itens da loja custam −20%. | Mercado Negro: −35%. |
| 4 | Olho Vivo | Vê a 2ª carta da Lixeira. | Raio-X: vê as 3 primeiras. |
| 5 | Maço Infinito | Quando Maço acabar, Lixeira re-embaralha como novo Maço. | Maço Eterno: acontece 2x antes de acabar de vez. |
| 6 | Blefe Mestre | Pifar não queima. | Blefe Supremo: pifar dá +10₣ bônus. |
| 7 | Sortudo | +5% chance de comprar curinga do Maço. | Abençoado: +15%. |
| 8 | Corrida | Começa com prioridade de vez (joga primeiro). | Sprint: joga primeiro E compra 2 cartas no 1º turno. |
| 9 | Cofre | +50₣ no início da sessão. | Tesouro: +150₣. |
| 10 | Resistência | −1 vida de penalidade em qualquer batida contra você. | Fortaleza: −1 vida E ganha 5₣ de consolação. |
| 11 | Coletor | Drops de Bençãos e Astrais têm +20% chance. | Coletor Mestre: +40% e garantido a cada 3 batidas. |
| 12 | Barreira | 1x por sessão: anula completamente uma batida (ninguém perde vida). | Barreira Dupla: 2x por sessão. |
| 13 | Telescópio | Vê a Vira antes da distribuição de cartas. | Observatório: vê Vira + escolhe 1 carta da mão para trocar. |
| 14 | Recuperação | Ao sobreviver uma rodada, recupera 1 vida. | Regeneração: recupera 1 vida a cada 2 rodadas sobrevividas. |
| 15 | Foco | +1 slot de Coringa Especial (4 total). | Hiperfoco: +2 slots (5 total). |
| 16 | Rede de Segurança | Se cair para 1 vida, recebe 1 Benção aleatória grátis. | Rede Dupla: recebe 2 Bençãos + 1 Astral. |

---

## 04 — Sistema de Loja e Economia

### 4.1 — Moeda: Fichas (₣)

Moeda interna exclusiva. Sem compra com dinheiro real. Ganhos:

| Ação | Fichas Ganhas |
|---|---|
| Vitória (bater) | 50₣ |
| Bater com 10 cartas | +25₣ bônus |
| Mão Batida | +50₣ bônus |
| Cada rodada jogada | 5₣ |
| Desafio diário concluído | 100₣ |
| Combo especial (flush, trinca pura, etc.) | 30₣ |
| Primeiro jogo do dia | 20₣ |
| Eliminação de adversário (você bateu e ele morreu) | 40₣ |

### 4.2 — As 4 Lojas

**Loja 1 — Coringas Especiais (🃏)**
Compre e monte seu loadout de até 3 Coringas antes da partida. Permanentes após compra. Organizados por raridade com filtro. Preço: 50–2500₣.

**Loja 2 — Deck Builder (✨)**
Aplique Selos e Melhorias a cartas específicas. Escolha entre 10 Decks Temáticos. Visualize o deck completo antes de jogar. Preço: 30–200₣ por selo/melhoria.

**Loja 3 — Pergaminhos e Consumíveis (📜)**
Compre Pergaminhos (vouchers) para a sessão. Compre pacotes de Bençãos e Astrais para usar durante a partida. Preço: 50–500₣.

**Loja 4 — Cosméticos (🎨)**
Puramente visual, zero vantagem gameplay:

| Item | Exemplos | Preço |
|---|---|---|
| Verso de carta | Clássico, Neon, Copag Retrô, Pixel Art, Ouro | 50–200₣ |
| Tapete de mesa | Feltro verde, Madeira, Neon roxo, Espaço | 80–300₣ |
| Animação de batida | Confete, Explosão, Raios, Fogos, Pó dourado | 100–250₣ |
| Moldura de avatar | Bronze, Prata, Ouro, Diamante, Chamas | 30–150₣ |
| Tema de cor UI | Escuro, Claro, Retro, Neon, Pastel | 60–120₣ |
| Som de batida | Clássico, Moedas, Trovão, Sino, Aplausos | 40–100₣ |

### 4.3 — Decks Temáticos (10)

| Deck | Modificador | Custo |
|---|---|---|
| Padrão | Sem modificadores. | Grátis |
| Vermelho | +2 vidas, −1 slot Coringa. | 100₣ |
| Azul | Começa com 1 Benção aleatória. | 100₣ |
| Dourado | +100₣ iniciais, −2 vidas. | 200₣ |
| Fantasma | Cartas espectrais (Astrais) surgem com mais frequência. −1 vida. | 300₣ |
| Caos | Vira muda a cada 5 turnos. Curingas mudam com ela. | 400₣ |
| Minimalista | 7 cartas na mão, curingas contam como 2 cartas na combinação. | 300₣ |
| Zodíaco | Começa com 1 Astral + 1 Pergaminho grátis. | 500₣ |
| Blefador | Pifar nunca queima. −1 slot Benção. | 350₣ |
| Lendário | +1 Coringa Lendário garantido, −3 vidas iniciais. | 1000₣ |

### 4.4 — Desafios Diários

Cada dia gera 3 desafios que concedem Fichas bônus:

- "Bata 3 vezes usando curingas" → 100₣
- "Vença 1 partida sem usar Bençãos" → 150₣
- "Elimine 2 adversários em uma sessão" → 120₣
- "Bata com mão batida" → 200₣
- "Use 5 Cartas de Benção em uma sessão" → 80₣
- "Vença usando o Deck Minimalista" → 150₣

---

## 05 — Modos de Jogo e Multiplayer

### 5.1 — Modos

| Modo | Descrição | Duração |
|---|---|---|
| Partida Rápida | 1 rodada única. Quem bater primeiro vence. | 2–3 min |
| Campeonato | Vidas completas (7 ou 10). Joga até restar 1. Loja abre entre eliminações. | 8–20 min |
| Cachetão | Variante com Fold. Correr perde 1, jogar e perder perde 2. | 10–25 min |
| Solo vs Bots | Treino contra 1–4 bots com IA de 3 níveis. | Variável |

### 5.2 — Multiplayer Local (Hot-Seat)

- Mesmo dispositivo, passando de mão em mão.
- Tela de transição obrigatória entre jogadores: fundo opaco, nome do próximo jogador, botão "Estou Pronto" com timer de 3 segundos.
- Cartas do jogador anterior ficam completamente ocultas.
- Suporte para qualquer combinação: 1–5 humanos, 0–4 bots.
- Jogadores eliminados podem assistir como espectadores (vêem mesa mas não cartas).

### 5.3 — Configurações do Lobby

| Configuração | Opções |
|---|---|
| Número de jogadores | 2, 3, 4, 5 |
| Humanos vs Bots | Qualquer mix (slider) |
| Dificuldade dos bots | Iniciante, Normal, Difícil |
| Vidas iniciais | 5, 7, 10 |
| Modo | Rápida, Campeonato, Cachetão |
| Coringas Especiais | Ligado / Desligado |
| Bençãos e Astrais | Ligado / Desligado |
| Pergaminhos | Ligado / Desligado |
| Regra K-A-2 | Inválido (padrão) / Válido |
| Limite de curingas por combinação | 1 (padrão) / 2 |
| Timer por turno | Desligado / 15s / 30s / 60s |

### 5.4 — IA dos Bots

**Nível Iniciante:**
- Compra aleatória (maço ou lixeira com 50/50).
- Descarta a carta com menor conexão ao resto da mão.
- Nunca declara "Na Boa" estrategicamente.
- Nunca blefa.
- Não usa Bençãos nem Astrais.

**Nível Normal:**
- Prioriza completar combinações parciais.
- Descarta cartas isoladas e sem conexão.
- Declara "Na Boa" quando realmente falta 1 carta.
- Compra da Lixeira se a carta servir.
- Usa Bençãos de forma básica (Ascensão, Troca Divina).
- Raramente blefa (10% chance).

**Nível Difícil:**
- Rastreia todas as cartas descartadas por todos os jogadores.
- Deduz mãos possíveis baseado nos descartes.
- Evita descartar cartas que adversários possam precisar.
- Blefa estrategicamente (pifar quando mão está quase pronta).
- Usa todas as Bençãos e Astrais de forma otimizada.
- Fura fila quando a probabilidade de bater é alta.
- Prioriza Coringas Especiais com sinergia ao seu deck.
- Resposta em menos de 500ms (sem delay perceptível).

---

## 06 — UI/UX e Design Mobile

### 6.1 — Especificações de Tela

- Orientação: **Landscape forçado** (horizontal).
- Resolução lógica: 960×540 (16:9), escalável.
- Input: toque primário, arraste para cartas.
- Fonte mínima: 14px para legibilidade mobile.
- Alvos de toque: mínimo 44×44px.

### 6.2 — Layout da Mesa de Jogo

```
┌─────────────────────────────────────────────────────────┐
│ [P1 ♥7] [P2 ♥5] [P3 ♥9] [P4 ♥3] [P5 ♥6]  ← Vidas   │
│                                                         │
│  [Coringa1]     ┌──────┐  ┌──────┐  ┌──────┐           │
│  [Coringa2]     │ MAÇO │  │ LIXO │  │ VIRA │  [Benção1]│
│  [Coringa3]     │  ??  │  │  7♠  │  │  8♣  │  [Benção2]│
│                 └──────┘  └──────┘  └──────┘           │
│                                                         │
│  [Na Boa!]  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐     │
│  [Bater!]   │3♥││5♦││5♥││5♣││8♠││9♠││10♠││J♦││Q♦│     │
│  [Benção]   └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘     │
│             ↑ Mão do jogador atual (arrastável)         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 — Fluxo de Telas

```
[Splash] → [Menu Principal] → [Lobby Config] → [Mesa de Jogo]
                ↓                                    ↓
           [Loja]                           [Tela Hot-Seat]
                ↓                                    ↓
        [Coringas|Deck|Pergaminhos|Cosméticos]  [Jogo em si]
                                                     ↓
                                              [Fim de Rodada]
                                                     ↓
                                        [Loja entre rodadas]
                                                     ↓
                                         [Fim de Partida]
                                                     ↓
                                           [Resultado + ₣]
```

### 6.4 — Identidade Visual

- **Fundo:** verde escuro feltro (#1a3a2a) para mesa, preto (#0c0f14) para menus.
- **Acento primário:** dourado (#e8c547) para destaques, brilhos, bônus.
- **Cartas:** fundo branco, borda dourada sutil, arte limpa tipo Copag.
- **Coringas Especiais:** cada raridade com brilho de cor (cinza, verde, azul, dourado).
- **Tipografia:** sans-serif condensada bold para números e vidas; sans-serif regular para UI.
- **Animações:** cartas com physics leve ao arrastar; confete ao bater; flash ao ativar Coringa; partículas ao usar Benção. Leve e rápido — sem shaders.

---

## 07 — Arquitetura Técnica

### 7.1 — Visão Geral

```
[Vanilla JS + Canvas 2D]  ←── Game Engine (client-side)
        ↓
[HTML5 Canvas]             ←── Renderização 60fps
        ↓
[LocalStorage]             ←── Saves, inventário, fichas
        ↓
[Go HTTP Server :8080]     ←── Serve estáticos + API save
        ↓
[Android WebView APK]      ←── Empacotamento mobile
```

Toda a lógica roda no client. O servidor Go é um file server com 1 endpoint de backup. O APK é um wrapper WebView.

### 7.2 — Game State Machine

```
INIT → DEALING → TURN_START → BUY_PHASE → ORGANIZE → DISCARD → CHECK_WIN
  ↑                                                        ↓
  └──────────── NEXT_PLAYER ←──── no ←──── BATEU? ───→ yes → ROUND_END
                                                              ↓
                                                         LIVES_UPDATE
                                                              ↓
                                                      ELIMINATION_CHECK
                                                              ↓
                                                    [Loja entre rodadas]
                                                              ↓
                                                         GAME_OVER?
                                                         ↓        ↓
                                                        yes       no
                                                         ↓        ↓
                                                    RESULTS    NEXT_ROUND
```

### 7.3 — Módulos do Engine

| Módulo | Arquivo | Responsabilidade |
|---|---|---|
| Deck Engine | `core/deck.js` | Criação, embaralhamento, distribuição, 2 baralhos (104 cartas). |
| Rules Engine | `core/rules.js` | Validação de trincas, sequências, batidas, curinga, Na Boa, queima. |
| Game Controller | `core/game.js` | State machine, turnos, rodadas, eliminação. |
| Player Entity | `core/player.js` | Mão, vidas, fichas, coringas, bençãos, status. |
| Bot AI | `ai/bot.js` | 3 níveis de IA, decision trees, heurísticas. |
| Jokers System | `powers/jokers.js` | 60 coringas, registro, ativação, efeitos. |
| Blessings | `powers/blessings.js` | 20 bençãos consumíveis. |
| Astral Cards | `powers/astral.js` | 12 upgrades permanentes. |
| Seals System | `powers/seals.js` | Selos e melhorias de cartas. |
| Vouchers | `powers/vouchers.js` | 16 pergaminhos passivos. |
| Shop | `shop/store.js` | Catálogo, preços, inventário, compra. |
| Canvas Renderer | `render/canvas.js` | Renderização 2D, sprites, mesa, cartas. |
| Sprite Manager | `render/sprites.js` | Load e cache de sprites. |
| Animation Engine | `render/animations.js` | Tweens, partículas, transições. |
| HUD | `ui/hud.js` | Vidas, fichas, turno, botões. |
| Screens | `ui/screens.js` | Menu, lobby, loja, hot-seat, resultado. |
| Audio | `audio/sfx.js` | Web Audio API, SFX, música. |
| Save System | `save/storage.js` | LocalStorage + sync com Go API. |
| Main | `main.js` | Bootstrap, game loop, event binding. |

---

## 08 — Stack de Tecnologias

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Linguagem do jogo | JavaScript ES2022 (Vanilla) | Zero overhead de framework. Módulos nativos. Performance máxima. |
| Renderização | Canvas 2D API | Suficiente para card game 2D. 60fps. Compatível com tudo. |
| Servidor web | Go 1.22+ (net/http stdlib) | Single binary, leve, rápido. Serve estáticos + API mínima. |
| Empacotamento mobile | Android WebView nativo (Kotlin) | APK mínimo, sem Cordova/Capacitor. WebView fullscreen landscape. |
| Persistência | LocalStorage + JSON files | Save game, inventário. Backup via endpoint Go. |
| Áudio | Web Audio API | SFX procedurais, samples curtos, música loop. Nativo. |
| Build Android | Gradle + Android SDK | Projeto mínimo com MainActivity + WebView. |
| Assets | SVG (cartas) + PNG (sprites) | SVG escalável para cartas. PNG comprimido para UI. Total <5MB. |
| Versionamento | Git | Branches por feature, tags por release. |

**Por que NÃO frameworks/engines:**
O jogo é um card game 2D com lógica complexa (regras + IA) mas renderização simples (cartas estáticas, tweens, partículas leves). Phaser/Pixi adicionam 500KB+ sem necessidade real. A complexidade está nos sistemas de regras e poderes, não na renderização. Vanilla JS com Canvas 2D é a opção mais leve e performática possível.

---

## 09 — Estrutura de Diretórios

```
caxeta-royale/
├── server/
│   ├── main.go                 # Go server: estáticos + /api/save
│   └── go.mod
├── web/
│   ├── index.html              # Entry point
│   ├── css/
│   │   ├── game.css            # Mesa, cartas, animações
│   │   ├── ui.css              # Menus, loja, HUD, screens
│   │   └── animations.css      # Keyframes
│   ├── js/
│   │   ├── main.js             # Bootstrap, game loop
│   │   ├── core/
│   │   │   ├── deck.js
│   │   │   ├── rules.js
│   │   │   ├── game.js
│   │   │   └── player.js
│   │   ├── ai/
│   │   │   └── bot.js
│   │   ├── powers/
│   │   │   ├── jokers.js
│   │   │   ├── blessings.js
│   │   │   ├── astral.js
│   │   │   ├── seals.js
│   │   │   └── vouchers.js
│   │   ├── shop/
│   │   │   └── store.js
│   │   ├── render/
│   │   │   ├── canvas.js
│   │   │   ├── sprites.js
│   │   │   └── animations.js
│   │   ├── ui/
│   │   │   ├── hud.js
│   │   │   └── screens.js
│   │   ├── audio/
│   │   │   └── sfx.js
│   │   └── save/
│   │       └── storage.js
│   └── assets/
│       ├── cards/              # SVG das 52 cartas (×2 baralhos)
│       ├── jokers/             # Arte dos 60 coringas especiais
│       ├── blessings/          # Ícones das 20 bençãos
│       ├── astral/             # Ícones das 12 astrais
│       ├── ui/                 # Botões, ícones, fundos
│       ├── sounds/             # SFX (.ogg) curtos
│       └── themes/             # Versos, tapetes, animações de batida
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/caxetaroyale/
│   │   │   │   └── MainActivity.kt
│   │   │   ├── assets/web/     # Cópia de /web/ (embedded)
│   │   │   └── res/
│   │   │       ├── drawable/   # Ícone do app
│   │   │       └── values/     # Strings, styles
│   │   └── build.gradle
│   ├── build.gradle
│   └── settings.gradle
├── docs/
│   └── ESCOPO.md               # Este documento
└── README.md
```

---

## 10 — Milestones de Desenvolvimento

| Fase | Nome | Entregáveis |
|---|---|---|
| M1 | Core Caxeta | Regras completas: deck 104 cartas, distribuição 9 cartas, vira/curinga, compra/descarte, trinca/sequência, bater 9 e 10, vidas, Na Boa, furar fila, queimar, pifar. Canvas básico. 1 humano vs 1 bot Iniciante. Servidor Go servindo estáticos. |
| M2 | Multiplayer Local | Hot-seat 2–5 jogadores, tela de transição, lobby de configuração, mix humanos+bots, espectador para eliminados. |
| M3 | Sistema de Poderes | 60 Coringas Especiais, 20 Bençãos, 12 Astrais, 5 Selos, 6 Melhorias, 16 Pergaminhos. Integração com rules engine. Efeitos visuais de ativação. |
| M4 | Loja e Economia | 4 lojas funcionais, sistema de Fichas, 10 Decks temáticos, cosméticos, persistência de inventário, desafios diários. |
| M5 | Polish e IA | IA Difícil completa, SFX/música, animações (bater, comprar, transição), modo Cachetão, tutorial interativo, balanceamento de coringas. |
| M6 | Build Final | Servidor Go testado em localhost:8080. APK Android via WebView. Testes em devices reais. Otimização de performance (<10MB, 60fps em mid-range). |

---

## 11 — Build e Distribuição

### Web (Testes)

```bash
cd server
go run main.go
# Acessa: http://localhost:8080
```

O Go server serve tudo de `/web/` como arquivos estáticos. Endpoint `/api/save` para persistir JSON de progresso.

### Android APK

```bash
# 1. Copiar web/ para assets
cp -r web/* android/app/src/main/assets/web/

# 2. Build
cd android
./gradlew assembleDebug

# 3. APK gerado em:
# android/app/build/outputs/apk/debug/app-debug.apk
```

Requisitos Android: API 24+ (Android 7.0), WebView atualizado (Chrome 90+).
Meta de tamanho: <10MB.

---

## 12 — Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Performance Canvas em Android antigo | Alto | Média | Sprite batching, throttle de partículas, fallback 30fps, teste em low-end. |
| Hot-seat UX (espiar cartas) | Médio | Alta | Tela obrigatória com timer + botão. Animação de ocultação. |
| Balanceamento dos 60 Coringas | Alto | Alta | Testes extensivos, Lendários com drawbacks, limite 3 slots, ajuste iterativo pós-play. |
| IA Difícil muito lenta | Médio | Baixa | Limitar profundidade de busca, cache de avaliações, turno <500ms. |
| Regras regionais conflitantes | Baixo | Média | Regra oficial como base, variações como toggles no lobby. |
| Tamanho do APK | Baixo | Baixa | SVG para cartas, OGG comprimido, PNG otimizado. Meta <10MB. |
| Complexidade do sistema de poderes | Alto | Média | Implementar por fases: M3 foca nos 25 comuns primeiro, depois expande. Toggle para desativar poderes. |

---

## 13 — Resumo de Números

| Item | Quantidade |
|---|---|
| Coringas Especiais | 60 (25 comuns + 18 incomuns + 12 raros + 5 lendários) |
| Cartas de Benção | 20 |
| Cartas Astrais | 12 |
| Selos | 5 tipos |
| Melhorias | 6 tipos |
| Pergaminhos (Vouchers) | 16 (cada um com versão avançada = 32 efeitos) |
| Decks Temáticos | 10 |
| Itens Cosméticos | ~30 (versos, tapetes, animações, molduras, temas, sons) |
| Modos de Jogo | 4 (Rápida, Campeonato, Cachetão, Solo) |
| Níveis de IA | 3 (Iniciante, Normal, Difícil) |
| Jogadores Suportados | 2–5 (qualquer mix humano + bot) |
| Desafios Diários | 3 por dia (pool de ~20 possíveis) |
| Total de cartas no baralho | 104 (2 × 52) |
| Módulos JS | 18 arquivos |

---

*Caxeta Royale — Escopo v1.0 — Pronto para desenvolvimento. Próximo passo: Milestone 1 (Core Caxeta).*
