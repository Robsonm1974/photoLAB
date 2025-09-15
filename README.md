# PhotoLab - Organizador de Fotos Escolares

Desktop application for automating school event photo organization through QR code detection and physical folder structure creation.

## 🎯 Visão Geral

PhotoLab é uma aplicação desktop multiplataforma que automatiza a organização de fotos de eventos escolares, integrando-se ao SaaS PhotoManager para criar estruturas de pastas físicas baseadas em detecção de QR codes.

### Problema Resolvido
Fotógrafos escolares gastam horas organizando manualmente milhares de fotos por evento, criando estruturas de pastas e renomeando arquivos para associar fotos aos participantes corretos.

### Solução
- Lê lista CSV de participantes
- Cria estrutura de pastas organizada
- Detecta QR codes automaticamente nas fotos
- Copia e renomeia arquivos JPG
- Gera relatórios de processamento

## 🏗️ Arquitetura

```
Frontend: Electron + React + Tailwind CSS
Backend: Node.js (APIs internas)
Processamento: Python scripts (OCR + Computer Vision)
Banco Local: SQLite (cache e configurações apenas)
```

## 📁 Estrutura do Projeto

```
photolab/
├── src/
│   ├── main/                    # Processo principal Electron
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── menu.js
│   ├── renderer/               # Interface React
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── FileSelectors/
│   │   │   ├── Progress/
│   │   │   └── Reports/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Processing.jsx
│   │   │   └── Reports.jsx
│   │   ├── hooks/
│   │   └── utils/
│   ├── python/                 # Scripts de processamento
│   └── assets/
├── public/
├── build/
├── dist/
├── package.json
├── electron-builder.json
└── requirements.txt
```

## 🚀 Desenvolvimento

### Pré-requisitos
- Node.js ^20.0.0
- Python ^3.11
- Git

### Instalação
```bash
# Clone o repositório
git clone [repository-url]
cd photolab

# Instale dependências Node.js
npm install

# Instale dependências Python
pip install -r requirements.txt
```

### Scripts Disponíveis
```bash
# Desenvolvimento
npm run dev              # Inicia React + Electron em modo desenvolvimento
npm run dev:react        # Apenas servidor React (http://localhost:5173)
npm run dev:electron     # Apenas Electron

# Build
npm run build            # Build da aplicação React
npm run build:electron   # Build do Electron
npm run dist             # Build completo para distribuição

# Desenvolvimento
npm run lint             # ESLint
npm run preview          # Preview do build
```

## 📋 Roadmap de Desenvolvimento

### 🚀 FASE 1 - MVP Core (Semana 1) - PRIORIDADE ATUAL
```
✅ PRIORIDADE 1 - Escolha do diretório origem
✅ PRIORIDADE 2 - Carregar lista participantes CSV  
✅ PRIORIDADE 3 - Criar diretórios baseado na lista
```

### ⚡ FASE 2 - Processamento OCR (Semana 2-3)
```
🔄 PRIORIDADE 4 - Detecção QR codes (CORE COMPLEXO)
- OCR Detection Engine (OpenCV + pyzbar)
- Sequenciamento de Fotos
- Painel Confirmação Manual
- Cópia e Renomeação
```

### 🔐 FASE 3 - Licenciamento (Semana 4)
```
⏳ PRIORIDADE 5 - Verificação licença funcional
- Integração PhotoManager API
- Enforcement limits
- Interface status assinatura
```

### 📊 FASE 4 - Relatórios (Semana 5)
```
⏳ PRIORIDADE 6 - Sistema relatórios
- Relatório HTML standalone
- Estatísticas processamento
- Export logs detalhados
```

## 🎨 Tech Stack

### Frontend
- **Electron** ^27.0.0 - Desktop application framework
- **React** ^18.2.0 - UI library
- **Tailwind CSS** ^3.4.0 - Utility-first CSS framework
- **Lucide React** - Icon library
- **Vite** - Build tool

### Backend/Processamento
- **Node.js** ^20.0.0 - JavaScript runtime
- **Python** ^3.11 - OCR and image processing
- **OpenCV-Python** - Computer vision (Phase 2)
- **pyzbar** - QR code detection (Phase 2)
- **Pillow** - Image manipulation (Phase 2)
- **SQLite3** - Local cache/config

## 📄 Documentação

- `agent_rules.md` - Regras para desenvolvimento e padrões de código
- `project_rules.md` - Especificações técnicas e arquitetura
- `photolab_todo.md` - Lista detalhada de implementação
- `photolab.prd` - Product Requirements Document

## 🔒 Compatibilidade

- **Windows:** 10/11 (x64)
- **macOS:** 10.15+ (Intel/Apple Silicon)  
- **Linux:** Ubuntu 20.04+ (x64)

## 📞 Status do Projeto

**Status Atual:** FASE 1 - MVP Core em desenvolvimento
**Última Atualização:** 15/09/2025
**Versão:** 1.0.0-alpha

---

## 🎯 Quick Start (MVP)

1. **Executar em modo desenvolvimento:**
```bash
npm run dev
```

2. **Testar funcionalidades implementadas:**
   - Seleção de pasta origem ✅
   - Upload e validação CSV ✅  
   - Criação de estrutura de diretórios ✅

3. **Próximos passos:**
   - Implementar detecção OCR (Fase 2)
   - Integrar licenciamento (Fase 3)
   - Adicionar sistema de relatórios (Fase 4)

---

*Este projeto segue rigorosamente as especificações definidas nos documentos de regras e PRD inclusos.*
