# Jogar no mesmo wifi

O multiplayer do Caxeta Royale é local: todo mundo na mesma rede, sem conta, sem
servidor na internet e sem nada saindo do seu wifi.

![Sala aberta, do lado de quem criou](imagens/20-sala-dono.png)

## Como funciona por dentro

O servidor Go **não conhece a caxeta**. Ele só guarda quem está em cada sala e entrega
mensagem de um cliente pro outro. Quem manda na partida é o aparelho que abriu a mesa —
o *dono* — que roda o `CR.Game` de verdade.

```
  celular da Ana  ──┐                        ┌── roda CR.Game
  celular do Zé   ──┼── servidor Go (relay) ─┤   toca os bots
  tablet do Bola  ──┘   salas + SSE + POST   └── monta um retrato por jogador
                                                 (aparelho do dono)
```

- **Dono → convidado:** um *retrato* da mesa por jogador. A mão dos outros nunca entra no
  pacote, então não existe "abrir o devtools e ver a mão do vizinho".
- **Convidado → dono:** só a jogada (`comprar`, `descartar`, `bater`, `furar`...). O dono
  valida se é mesmo a vez daquele jogador antes de aplicar.
- Quem entra na sala não roda o motor: monta um `CR.Espelho`, que responde às mesmas
  perguntas que o `CR.Game` responde. A mesa não sabe a diferença entre os dois.

## O transporte

SSE pra receber, POST pra mandar. Sem dependência externa no Go e sem handshake de
WebSocket pra dar errado dentro do WebView do APK.

| Rota | O que faz |
|---|---|
| `POST /api/sala/criar` | Abre a sala, devolve o código de 4 letras e o token |
| `POST /api/sala/entrar` | Entra numa sala existente pelo código |
| `GET /api/sala/eventos` | Fluxo SSE com os eventos daquele jogador |
| `POST /api/sala/enviar` | Manda mensagem pra mesa toda ou pra um jogador |
| `POST /api/sala/sair` | Sai da sala; se for o dono, a sala fecha |
| `GET /api/rede` | Os endereços deste servidor na rede local |

O código sai de um alfabeto sem letra que se confunde no grito: nada de I, O, S, Z, 0, 1,
2, 5 ou 8. A sala vive na memória e some quando o dono fecha ou depois de 3 horas parada.

## No APK

O APK carrega de `file://`, então ele não tem um servidor embutido pra falar. Nas telas de
criar e entrar aparece um campo a mais pedindo o endereço do aparelho que abriu a mesa
(`http://192.168.0.12:8080`). As rotas de sala respondem com CORS liberado justamente pra
isso funcionar.

## O que o teste verifica

`node tools/test-lan.js` sobe dois navegadores de verdade, abre uma sala num, entra pelo
código no outro, coloca um bot na mesa e joga até a partida acabar. Ele falha se:

- os dois aparelhos ficarem em estados diferentes depois que a poeira assenta;
- qualquer carta da mão de um aparecer no outro;
- alguma exceção estourar em qualquer um dos dois.

`node tools/test-lan-queda.js` fecha o navegador de um dos jogadores no meio da partida e
verifica que a cadeira dele vira bot e a mesa continua andando.

## Quando alguém cai

Celular travou, wifi caiu, alguém fechou o navegador: o dono percebe pela lista da sala,
troca aquela cadeira por um bot e a partida segue. O nome fica marcado no registro da mesa.
Se quem cair for o dono, a sala fecha e todo mundo volta pro menu — a partida morava no
aparelho dele.

O tempo por vez, quando ligado, vale pra mesa inteira: é o dono quem conta, senão um
celular esquecido em cima da mesa travaria o jogo dos outros.
