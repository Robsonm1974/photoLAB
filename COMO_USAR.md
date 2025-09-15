# 🚀 Como Usar o PhotoLab - Guia Rápido

## 📋 Pré-requisitos

Você precisa ter preparado:
1. **Pasta com fotos** - Diretório contendo os arquivos JPG do evento
2. **Arquivo CSV** - Lista de participantes com as colunas: `name`, `turma`, `qrCode`

### Formato do CSV
```csv
name,turma,qrCode
Ana Silva,1A,QR001
Bruno Santos,1A,QR002
Carla Oliveira,1B,QR003
```

## 🏃‍♂️ Passos para Usar

### 1. Iniciar a Aplicação
```bash
npm run dev
```

### 2. Configurar o Projeto

**Passo 1: Pasta de Origem**
- Clique em "Clique para selecionar pasta"
- Escolha a pasta que contém suas fotos JPG
- A aplicação validará e contará os arquivos

**Passo 2: Lista de Participantes** 
- Clique em "Clique para selecionar arquivo CSV"
- Escolha seu arquivo CSV com a lista de participantes
- A aplicação validará o formato e mostrará um preview

**Passo 3: Nome do Evento**
- Digite o nome do evento (ex: "Festa Junina 2024")
- Será usado como nome da pasta principal

### 3. Criar Estrutura

- Quando todos os campos estiverem preenchidos, clique em **"Iniciar Projeto"**
- A aplicação criará automaticamente:
  ```
  [Pasta Origem]/
  └── [Nome do Evento]/
      ├── [Turma 1]/
      │   ├── [Participante 1 - QR001]/
      │   ├── [Participante 2 - QR002]/
      │   └── ...
      ├── [Turma 2]/
      │   ├── [Participante 3 - QR003]/
      │   └── ...
      └── ...
  ```

### 4. Resultado

- Após a criação, você será direcionado para a página de sucesso
- Clique em **"Abrir Pasta Criada"** para ver a estrutura no explorador
- Clique em **"Voltar ao Início"** para processar outro evento

## ✅ Status Atual - Fase 1 Completa

### 🎉 Funcionalidades Implementadas
- ✅ Seleção de pasta origem com validação JPG
- ✅ Upload e validação de arquivo CSV
- ✅ Parser CSV robusto (vírgula ou ponto-vírgula)
- ✅ Criação automática de estrutura de diretórios
- ✅ Interface profissional e intuitiva
- ✅ Tratamento de erros e validações
- ✅ Abertura automática da pasta criada

### 🔄 Próximas Fases (Em Desenvolvimento)

**Fase 2 - OCR Processing:**
- Detecção automática de QR codes nas fotos
- Agrupamento temporal das fotos
- Interface para correção manual
- Cópia e renomeação automática das fotos

**Fase 3 - Licenciamento:**
- Integração com PhotoManager API
- Controle de limites de uso
- Verificação online/offline

**Fase 4 - Relatórios:**
- Relatórios HTML detalhados
- Estatísticas de processamento
- Export de logs

## 🐛 Resolução de Problemas

### CSV não carrega
- Verifique se o arquivo tem as colunas: `name`, `turma`, `qrCode`
- Certifique-se que não há QR codes duplicados
- Tente usar vírgula (,) ou ponto-vírgula (;) como separador

### Pasta não valida
- Verifique se a pasta contém arquivos .jpg ou .jpeg
- Certifique-se que você tem permissão de leitura na pasta

### Erro ao criar diretórios
- Verifique se você tem permissão de escrita na pasta de origem
- Certifique-se que há espaço suficiente no disco
- Evite caracteres especiais no nome do evento

---

**Versão:** 1.0.0 - Fase 1 MVP  
**Data:** 15/09/2025  
**Status:** ✅ Funcional para criação de estrutura de diretórios
