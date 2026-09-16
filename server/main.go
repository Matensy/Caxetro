// Caxeta Royale — servidor de desenvolvimento.
// Serve /web como estatico e guarda um backup do progresso em JSON.
package main

import (
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const maxSave = 1 << 20 // 1 MiB: o save cabe folgado

type saveStore struct {
	mu   sync.RWMutex
	path string
}

func (s *saveStore) read() ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return os.ReadFile(s.path)
}

func (s *saveStore) write(b []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func (s *saveStore) handle(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		b, err := s.read()
		if err != nil {
			http.Error(w, `{"erro":"sem backup"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(b)

	case http.MethodPost:
		b, err := io.ReadAll(io.LimitReader(r.Body, maxSave))
		if err != nil {
			http.Error(w, `{"erro":"leitura falhou"}`, http.StatusBadRequest)
			return
		}
		var qualquer map[string]any
		if err := json.Unmarshal(b, &qualquer); err != nil {
			http.Error(w, `{"erro":"json invalido"}`, http.StatusBadRequest)
			return
		}
		if err := s.write(b); err != nil {
			log.Printf("nao consegui gravar o save: %v", err)
			http.Error(w, `{"erro":"gravacao falhou"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write([]byte(`{"ok":true}`))

	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, `{"erro":"metodo nao suportado"}`, http.StatusMethodNotAllowed)
	}
}

// semCache evita que o WebView e o navegador segurem uma versao velha durante o desenvolvimento.
func semCache(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".woff2") {
			w.Header().Set("Cache-Control", "public, max-age=604800")
		} else {
			w.Header().Set("Cache-Control", "no-store")
		}
		h.ServeHTTP(w, r)
	})
}

func main() {
	addr := flag.String("addr", ":8080", "endereco de escuta")
	raiz := flag.String("web", "", "pasta do jogo (padrao: ../web ao lado do binario)")
	saveEm := flag.String("save", "save.json", "arquivo de backup do progresso")
	flag.Parse()

	dir := *raiz
	if dir == "" {
		if _, err := os.Stat("web"); err == nil {
			dir = "web"
		} else {
			dir = filepath.Join("..", "web")
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "index.html")); err != nil {
		log.Fatalf("nao achei index.html em %q — aponte com -web", dir)
	}

	store := &saveStore{path: *saveEm}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/save", store.handle)
	novoRegistro().rotas(mux)
	mux.HandleFunc("/api/saude", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write([]byte(`{"ok":true,"jogo":"Caxeta Royale"}`))
	})
	mux.Handle("/", semCache(http.FileServer(http.Dir(dir))))

	srv := &http.Server{
		Addr:              *addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("Caxeta Royale servindo %q em http://localhost%s", dir, *addr)
	for _, e := range enderecosDaRede(&http.Request{Host: "x" + *addr}) {
		log.Printf("  no mesmo wifi, os amigos abrem %s", e)
	}
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
