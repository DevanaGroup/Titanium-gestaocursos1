# Configurar CORS no Firebase Storage (avatar)

O erro de CORS acontece porque o bucket do Storage não permite requisições do `localhost`. É preciso configurar CORS no bucket.

## Opção 1: Google Cloud Shell (mais fácil)

1. Abra: [console.cloud.google.com/storage](https://console.cloud.google.com/storage)
2. Entre com a conta do projeto **titanium-cursos**
3. Clique no ícone `>_` (Cloud Shell) no canto superior direito
4. No Cloud Shell, crie o arquivo CORS:

```bash
cat > cors.json << 'EOF'
[
  {
    "origin": ["*", "http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080", "http://127.0.0.1:5173"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "Content-Length", "Content-Disposition"]
  }
]
EOF
```

5. Aplique no bucket:

```bash
gsutil cors set cors.json gs://titanium-cursos.firebasestorage.app
```

6. Confirme com:

```bash
gsutil cors get gs://titanium-cursos.firebasestorage.app
```

## Opção 2: Local (gsutil instalado)

Se o `gsutil` estiver instalado:

```bash
cd /caminho/do/projeto
gsutil cors set storage.cors.json gs://titanium-cursos.firebasestorage.app
```

## Deploy das regras de Storage

Depois de configurar o CORS, faça o deploy das regras:

```bash
firebase deploy --only storage
```
