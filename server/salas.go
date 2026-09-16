// Salas de jogo na rede local.
//
// O servidor nao conhece a caxeta: ele so guarda quem esta em cada sala e
// entrega mensagem de um cliente pro outro. Quem manda na partida e o cliente
// que criou a sala (o "dono"), que roda o motor de verdade e distribui o
// estado ja filtrado pra cada jogador — assim ninguem recebe a mao alheia.
//
// Transporte: SSE (servidor -> cliente) + POST (cliente -> servidor). Sem
// dependencia externa e sem handshake de WebSocket pra dar errado no WebView.
package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	maxJogadores   = 5
	salaOciosa     = 3 * time.Hour
	batidaDoPulso  = 20 * time.Second
	filaPorJogador = 64
	// Alfabeto sem letra que se confunde no grito: nada de I, O, S, Z, 0, 1, 2, 5, 8.
	alfabeto = "ACDEFGHJKLMNPQRTUVWXY34679"
)

type jogadorSala struct {
	ID    string `json:"id"`
	Nome  string `json:"nome"`
	Dono  bool   `json:"dono"`
	token string
	fila  chan []byte
	visto time.Time
}

type sala struct {
	mu      sync.Mutex
	Codigo  string
	ordem   []string
	membro  map[string]*jogadorSala
	dono    string
	criada  time.Time
	visto   time.Time
	fechada bool
}

type registroDeSalas struct {
	mu sync.RWMutex
	m  map[string]*sala
}

func novoRegistro() *registroDeSalas {
	r := &registroDeSalas{m: map[string]*sala{}}
	go r.faxina()
	return r
}

func (r *registroDeSalas) faxina() {
	for range time.Tick(5 * time.Minute) {
		agora := time.Now()
		r.mu.Lock()
		for codigo, s := range r.m {
			s.mu.Lock()
			morta := s.fechada || agora.Sub(s.visto) > salaOciosa
			s.mu.Unlock()
			if morta {
				s.encerrar()
				delete(r.m, codigo)
			}
		}
		r.mu.Unlock()
	}
}

func sorteio(n int) string {
	b := make([]byte, n)
	for i := range b {
		k, err := rand.Int(rand.Reader, big.NewInt(int64(len(alfabeto))))
		if err != nil {
			return ""
		}
		b[i] = alfabeto[k.Int64()]
	}
	return string(b)
}

func (r *registroDeSalas) nova() *sala {
	r.mu.Lock()
	defer r.mu.Unlock()
	for tentativa := 0; tentativa < 40; tentativa++ {
		codigo := sorteio(4)
		if codigo == "" || r.m[codigo] != nil {
			continue
		}
		s := &sala{
			Codigo: codigo,
			membro: map[string]*jogadorSala{},
			criada: time.Now(),
			visto:  time.Now(),
		}
		r.m[codigo] = s
		return s
	}
	return nil
}

func (r *registroDeSalas) busca(codigo string) *sala {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.m[strings.ToUpper(strings.TrimSpace(codigo))]
}

/* ------------------------------------------------------------- mensagens */

type envelope struct {
	Tipo  string          `json:"tipo"`
	De    string          `json:"de,omitempty"`
	Dados json.RawMessage `json:"dados,omitempty"`
	Sala  []jogadorSala   `json:"sala,omitempty"`
}

func (s *sala) listaSemSegredo() []jogadorSala {
	out := make([]jogadorSala, 0, len(s.ordem))
	for _, id := range s.ordem {
		if j := s.membro[id]; j != nil {
			out = append(out, jogadorSala{ID: j.ID, Nome: j.Nome, Dono: j.Dono})
		}
	}
	return out
}

// entrega enfileira sem travar: cliente lento perde evento, nao segura a sala.
func (j *jogadorSala) entrega(b []byte) {
	select {
	case j.fila <- b:
	default:
	}
}

func (s *sala) transmitir(env envelope, exceto string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if env.Tipo == "sala" {
		env.Sala = s.listaSemSegredo()
	}
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	for id, j := range s.membro {
		if id == exceto {
			continue
		}
		j.entrega(b)
	}
}

func (s *sala) mandarPara(destino string, env envelope) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.membro[destino]
	if j == nil {
		return false
	}
	b, err := json.Marshal(env)
	if err != nil {
		return false
	}
	j.entrega(b)
	return true
}

func (s *sala) encerrar() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fechada {
		return
	}
	s.fechada = true
	b, _ := json.Marshal(envelope{Tipo: "sala-fechada"})
	for _, j := range s.membro {
		j.entrega(b)
		close(j.fila)
	}
	s.membro = map[string]*jogadorSala{}
	s.ordem = nil
}

func (s *sala) entrar(nome string, dono bool) (*jogadorSala, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fechada {
		return nil, fmt.Errorf("sala encerrada")
	}
	if len(s.ordem) >= maxJogadores {
		return nil, fmt.Errorf("a sala ja tem %d jogadores", maxJogadores)
	}
	nome = strings.TrimSpace(nome)
	if nome == "" {
		nome = "Jogador"
	}
	if len([]rune(nome)) > 16 {
		nome = string([]rune(nome)[:16])
	}
	j := &jogadorSala{
		ID:    sorteio(8),
		Nome:  nome,
		Dono:  dono,
		token: sorteio(16),
		fila:  make(chan []byte, filaPorJogador),
		visto: time.Now(),
	}
	s.membro[j.ID] = j
	s.ordem = append(s.ordem, j.ID)
	if dono {
		s.dono = j.ID
	}
	s.visto = time.Now()
	return j, nil
}

func (s *sala) sair(id string) (eraDono bool) {
	s.mu.Lock()
	j := s.membro[id]
	if j == nil {
		s.mu.Unlock()
		return false
	}
	eraDono = j.Dono
	delete(s.membro, id)
	for i, x := range s.ordem {
		if x == id {
			s.ordem = append(s.ordem[:i], s.ordem[i+1:]...)
			break
		}
	}
	close(j.fila)
	s.mu.Unlock()
	return eraDono
}

func (s *sala) autentica(id, token string) *jogadorSala {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.membro[id]
	if j == nil || j.token != token {
		return nil
	}
	j.visto = time.Now()
	s.visto = time.Now()
	return j
}

/* ------------------------------------------------------------ handlers */

// liberaOrigem deixa o APK (que carrega de file://, origem "null") e outros
// aparelhos do wifi falarem com a sala. E um servidor de jogo na rede de casa;
// nao ha sessao nem cookie pra proteger — o token da sala e o que vale.
func liberaOrigem(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Max-Age", "600")
		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h(w, req)
	}
}

func responde(w http.ResponseWriter, codigo int, corpo any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(codigo)
	json.NewEncoder(w).Encode(corpo)
}

func erro(w http.ResponseWriter, codigo int, msg string) {
	responde(w, codigo, map[string]string{"erro": msg})
}

type entradaCriar struct {
	Nome string `json:"nome"`
}
type entradaEntrar struct {
	Codigo string `json:"codigo"`
	Nome   string `json:"nome"`
}
type entradaEnviar struct {
	Codigo string          `json:"codigo"`
	Peer   string          `json:"peer"`
	Token  string          `json:"token"`
	Para   string          `json:"para"`
	Tipo   string          `json:"tipo"`
	Dados  json.RawMessage `json:"dados"`
}

func (r *registroDeSalas) rotas(mux *http.ServeMux) {
	mux.HandleFunc("/api/sala/criar", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			erro(w, http.StatusMethodNotAllowed, "use POST")
			return
		}
		var in entradaCriar
		json.NewDecoder(http.MaxBytesReader(w, req.Body, 4096)).Decode(&in)
		s := r.nova()
		if s == nil {
			erro(w, http.StatusInternalServerError, "nao consegui abrir a sala")
			return
		}
		j, err := s.entrar(in.Nome, true)
		if err != nil {
			erro(w, http.StatusConflict, err.Error())
			return
		}
		log.Printf("sala %s aberta por %s", s.Codigo, j.Nome)
		responde(w, http.StatusOK, map[string]any{
			"codigo": s.Codigo, "peer": j.ID, "token": j.token, "dono": true,
			"enderecos": enderecosDaRede(req),
		})
	}))

	mux.HandleFunc("/api/sala/entrar", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			erro(w, http.StatusMethodNotAllowed, "use POST")
			return
		}
		var in entradaEntrar
		if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 4096)).Decode(&in); err != nil {
			erro(w, http.StatusBadRequest, "json invalido")
			return
		}
		s := r.busca(in.Codigo)
		if s == nil {
			erro(w, http.StatusNotFound, "nao achei essa sala")
			return
		}
		j, err := s.entrar(in.Nome, false)
		if err != nil {
			erro(w, http.StatusConflict, err.Error())
			return
		}
		s.transmitir(envelope{Tipo: "sala"}, "")
		responde(w, http.StatusOK, map[string]any{
			"codigo": s.Codigo, "peer": j.ID, "token": j.token, "dono": false,
		})
	}))

	mux.HandleFunc("/api/sala/eventos", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		codigo := req.URL.Query().Get("codigo")
		peer := req.URL.Query().Get("peer")
		token := req.URL.Query().Get("token")
		s := r.busca(codigo)
		if s == nil {
			erro(w, http.StatusNotFound, "nao achei essa sala")
			return
		}
		j := s.autentica(peer, token)
		if j == nil {
			erro(w, http.StatusForbidden, "credencial invalida")
			return
		}
		lavanderia, ok := w.(http.Flusher)
		if !ok {
			erro(w, http.StatusInternalServerError, "servidor sem streaming")
			return
		}
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)
		lavanderia.Flush()

		s.transmitir(envelope{Tipo: "sala"}, "")
		pulso := time.NewTicker(batidaDoPulso)
		defer pulso.Stop()

		for {
			select {
			case <-req.Context().Done():
				if s.sair(peer) {
					log.Printf("sala %s: o dono saiu, encerrando", s.Codigo)
					s.encerrar()
				} else {
					s.transmitir(envelope{Tipo: "sala"}, "")
				}
				return
			case b, aberto := <-j.fila:
				if !aberto {
					return
				}
				fmt.Fprintf(w, "data: %s\n\n", b)
				lavanderia.Flush()
			case <-pulso.C:
				fmt.Fprint(w, ": pulso\n\n")
				lavanderia.Flush()
			}
		}
	}))

	mux.HandleFunc("/api/sala/enviar", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			erro(w, http.StatusMethodNotAllowed, "use POST")
			return
		}
		var in entradaEnviar
		if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 1<<20)).Decode(&in); err != nil {
			erro(w, http.StatusBadRequest, "json invalido")
			return
		}
		s := r.busca(in.Codigo)
		if s == nil {
			erro(w, http.StatusNotFound, "nao achei essa sala")
			return
		}
		j := s.autentica(in.Peer, in.Token)
		if j == nil {
			erro(w, http.StatusForbidden, "credencial invalida")
			return
		}
		env := envelope{Tipo: in.Tipo, De: j.ID, Dados: in.Dados}
		if in.Para != "" {
			if !s.mandarPara(in.Para, env) {
				erro(w, http.StatusNotFound, "esse jogador saiu")
				return
			}
		} else {
			s.transmitir(env, j.ID)
		}
		responde(w, http.StatusOK, map[string]bool{"ok": true})
	}))

	mux.HandleFunc("/api/sala/sair", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		var in entradaEnviar
		json.NewDecoder(http.MaxBytesReader(w, req.Body, 4096)).Decode(&in)
		s := r.busca(in.Codigo)
		if s == nil {
			responde(w, http.StatusOK, map[string]bool{"ok": true})
			return
		}
		if j := s.autentica(in.Peer, in.Token); j != nil {
			if s.sair(in.Peer) {
				s.encerrar()
			} else {
				s.transmitir(envelope{Tipo: "sala"}, "")
			}
		}
		responde(w, http.StatusOK, map[string]bool{"ok": true})
	}))

	mux.HandleFunc("/api/rede", liberaOrigem(func(w http.ResponseWriter, req *http.Request) {
		responde(w, http.StatusOK, map[string]any{"enderecos": enderecosDaRede(req)})
	}))
}

/* ---------------------------------------------------- endereco na rede */

// enderecosDaRede monta as URLs que os amigos digitam no celular.
func enderecosDaRede(req *http.Request) []string {
	porta := "8080"
	if _, p, err := net.SplitHostPort(req.Host); err == nil && p != "" {
		porta = p
	}
	var out []string
	ifaces, err := net.Interfaces()
	if err != nil {
		return out
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		enderecos, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range enderecos {
			ipnet, ok := a.(*net.IPNet)
			if !ok || ipnet.IP.IsLoopback() {
				continue
			}
			ip := ipnet.IP.To4()
			if ip == nil {
				continue
			}
			out = append(out, fmt.Sprintf("http://%s:%s", ip.String(), porta))
		}
	}
	sort.Strings(out)
	return out
}
