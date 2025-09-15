# PhotoLab - Lista de Implementação (TODO) - PRIORIDADE DEFINIDA

## 🎯 **PRIMEIRA ENTREGA - MVP CRÍTICO** 

### **🥇 PRIORIDADE 1 - Escolha Diretório Origem**
- [ ] **Setup Projeto Base**
  - [ ] Criar projeto Electron + React
  - [ ] Instalar Tailwind CSS + Lucide icons
  - [ ] Configurar estrutura pastas básica
  - [ ] Setup scripts desenvolvimento

- [ ] **Interface Folder Picker**
  - [ ] Componente FolderSelector
  - [ ] Electron dialog.showOpenDialog
  - [ ] Validação: pasta existe
  - [ ] Scan arquivos JPG na pasta
  - [ ] Display: path + contagem JPGs
  - [ ] Estado global (Context/Redux)

### **🥈 PRIORIDADE 2 - Carregar Lista CSV**
- [ ] **Interface File Picker**
  - [ ] Componente FileSelector (.csv only)
  - [ ] Electron dialog.showOpenDialog
  - [ ] Validação extensão arquivo
  - [ ] Estado upload file

- [ ] **Parser CSV**
  - [ ] Node.js CSV parser (csv-parse)
  - [ ] Detectar delimiter automático
  - [ ] Validar colunas: nome, turma, qr_code
  - [ ] Limpeza dados (trim, normalize)
  - [ ] Validação QR codes únicos

- [ ] **Preview Interface**
  - [ ] Tabela primeiras 5 linhas
  - [ ] Estatísticas: total participantes, turmas
  - [ ] Indicador erros/warnings
  - [ ] Botão "Confirmar Lista"

### **🥉 PRIORIDADE 3 - Criar Diretórios**
- [ ] **Input Nome Evento**
  - [ ] Campo texto nome evento
  - [ ] Validação caracteres especiais
  - [ ] Preview estrutura que será criada
  - [ ] Botão "Criar Estrutura"

- [ ] **Criação Física Diretórios**
  - [ ] Função sanitizeName() 
  - [ ] Node.js fs.mkdirSync recursivo
  - [ ] Estrutura: /Evento/Turma/Participante-QRCode/
  - [ ] Verificar permissões escrita
  - [ ] Tratamento erros I/O
  - [ ] Progress feedback para muitas pastas

- [ ] **Confirmação Estrutura**
  - [ ] Lista diretórios criados
  - [ ] Botão "Abrir Pasta Raiz"  
  - [ ] Status: "✅ Estrutura pronta para processamento"

---

## ⚡ **SEGUNDA ENTREGA - PROCESSAMENTO CORE**

### **🎯 PRIORIDADE 4 - Detecção QR Codes (MAIS COMPLEXO)**

#### **4.1 - Setup Python OCR**
- [ ] **Ambiente Python**
  - [ ] requirements.txt (opencv, pyzbar, pillow)
  - [ ] Script instalação dependências
  - [ ] Comunicação Node.js ↔ Python (spawn)
  - [ ] Teste OCR básico funcionando

#### **4.2 - Engine OCR**
- [ ] **qr_detector.py**
  - [ ] Função detectQRCode(imagePath)
  - [ ] Pipeline: load → grayscale → decode
  - [ ] Múltiplas tentativas (resize, contrast)
  - [ ] Return: {found: bool, code: string, confidence: float}
  
- [ ] **Batch Processing**  
  - [ ] Função processFolder(folderPath)
  - [ ] Scan todos JPGs sequencialmente
  - [ ] Cache resultados para performance
  - [ ] Progress callback para UI

#### **4.3 - Agrupamento Sequencial**
- [ ] **Algoritmo Temporal**
  - [ ] Ordenar fotos por timestamp/nome
  - [ ] Identificar fotos com QR (marcadores)
  - [ ] Agrupar fotos entre marcadores
  - [ ] Associar grupos aos participantes

- [ ] **photo_grouper.py**
  - [ ] Classe PhotoGroup(qr_code, photos[])
  - [ ] Função groupByQRCodes(detectionResults)
  - [ ] Tratamento casos especiais:
    - [ ] Primeira foto sem QR
    - [ ] Múltiplos QRs em sequência
    - [ ] Participante sem fotos

#### **4.4 - Interface Confirmação Manual**
- [ ] **Tela Revisão**
  - [ ] Lista grupos detectados automaticamente
  - [ ] Cards: QRCode → Participante → Fotos count
  - [ ] Status: ✅ Detectado | ⚠️ Precisa revisão | ❌ Erro

- [ ] **Modal Correção Manual**
  - [ ] Preview foto sem QR detectado
  - [ ] Dropdown participantes disponíveis
  - [ ] Input manual QR code
  - [ ] Botão "Associar Grupo"

- [ ] **Lista Problemas**
  - [ ] Participantes sem fotos
  - [ ] QRs detectados não na lista
  - [ ] Grupos grandes demais (>50 fotos)
  - [ ] Sugestões correção

#### **4.5 - Cópia e Renomeação**
- [ ] **file_organizer.py**  
  - [ ] Função copyAndRename(groupedPhotos)
  - [ ] Copy preservando metadados
  - [ ] Rename: original_QRcode.jpg
  - [ ] Verificação integridade (filesize)
  
- [ ] **Progress Interface**
  - [ ] Progress bar: X/Total fotos
  - [ ] Estatísticas tempo real
  - [ ] Log operações (scrollable)
  - [ ] Botão cancelar processo

---

## 🔐 **TERCEIRA ENTREGA - LICENCIAMENTO**

### **🔒 PRIORIDADE 5 - Verificação Licença**
- [ ] **PhotoManager API Integration**
  - [ ] Endpoint /api/photolab-license.php
  - [ ] Função checkLicense(userId)
  - [ ] Cache resposta local (6h TTL)
  - [ ] Offline mode (24h grace period)

- [ ] **Interface Licenciamento**  
  - [ ] Modal configuração inicial
  - [ ] Input User ID PhotoManager
  - [ ] Display status atual assinatura
  - [ ] Progress bars usage (fotos/eventos)
  - [ ] Link upgrade plano

- [ ] **Enforcement**
  - [ ] Verificar antes processar evento
  - [ ] Bloquear se limite atingido  
  - [ ] Counter local fotos processadas
  - [ ] Sincronizar com PhotoManager

---

## 📊 **QUARTA ENTREGA - RELATÓRIOS**

### **📋 PRIORIDADE 6 - Sistema Relatórios**
- [ ] **Template HTML**
  - [ ] CSS inline standalone
  - [ ] Header com logo/data
  - [ ] Seções: resumo, detalhes, problemas
  - [ ] Responsive para impressão

- [ ] **Conteúdo Relatório**
  - [ ] Estatísticas gerais
  - [ ] Tabela participantes processados  
  - [ ] Lista problemas encontrados
  - [ ] Performance metrics
  - [ ] Timestamp e versão app

---

## 🎯 **MILESTONES DE ENTREGA REVISADOS**

### **🚩 Milestone 1 - MVP Funcional** (Semana 1)
```
✅ Diretório origem selecionado
✅ CSV carregado e validado  
✅ Estrutura diretórios criada
✅ Interface básica funcionando

CRITÉRIO SUCESSO: Estrutura completa criada fisicamente
```

### **🚩 Milestone 2 - OCR Core** (Semana 2-3)  
```
✅ OCR detectando QR codes
✅ Agrupamento automático funcional
✅ Interface correção manual
✅ Cópia/rename arquivos

CRITÉRIO SUCESSO: Processa evento completo ponta-a-ponta
```

### **🚩 Milestone 3 - Licenciamento** (Semana 4)
```
✅ Integração PhotoManager
✅ Verificação online/offline
✅ Enforcement limites
✅ Interface usuário

CRITÉRIO SUCESSO: Licenciamento totalmente funcional
```

### **🚩 Milestone 4 - Relatórios** (Semana 5)
```
✅ Relatório HTML gerado
✅ Estatísticas completas
✅ Lista problemas
✅ Export logs

CRITÉRIO SUCESSO: Relatório profissional completo
```

---

## 📋 **CHECKLIST MVP CRÍTICO** 

### **Primeira Entrega (Deve funcionar 100%)**
- [ ] ✅ Seleciona pasta origem
- [ ] ✅ Carrega e valida CSV
- [ ] ✅ Cria estrutura diretórios completa
- [ ] ✅ Interface intuitiva e responsiva
- [ ] ✅ Tratamento erros básico

### **Segunda Entrega (Core Business)**
- [ ] ✅ Detecta QR codes > 80% precisão
- [ ] ✅ Agrupa fotos corretamente
- [ ] ✅ Interface correção manual funcional
- [ ] ✅ Copia arquivos sem corrupção
- [ ] ✅ Renomeia com padrão correto

### **Entregas Seguintes**
- [ ] ✅ Licenciamento integrado
- [ ] ✅ Relatórios profissionais
- [ ] ✅ Performance otimizada
- [ ] ✅ Build multiplataforma

---

*Focus absoluto: completar Primeira Entrega antes de partir para OCR!*

---

## 🎨 FASE 2: INTERFACE DO USUÁRIO

### **2.1 Tela Principal (Setup)**
- [ ] **Componentes de Input**
  - [ ] File picker para CSV (com validação)
  - [ ] Folder picker para pasta origem
  - [ ] Input nome do evento
  - [ ] Preview CSV (primeiras 5 linhas)
  - [ ] Validação de campos obrigatórios

- [ ] **Validações**
  - [ ] Verificar formato CSV (colunas necessárias)
  - [ ] Validar pasta existe e contém JPGs  
  - [ ] Verificar permissões de escrita
  - [ ] Mostrar erros de validação claros

### **2.2 Tela de Processamento**
- [ ] **Progress Tracking**
  - [ ] Progress bar animada
  - [ ] Estatísticas em tempo real:
    - [ ] QR codes detectados X/Total
    - [ ] Fotos processadas X/Total  
    - [ ] Tempo decorrido/estimado
    - [ ] Taxa de sucesso atual

- [ ] **Log de Atividades**  
  - [ ] Lista scrollable de operações
  - [ ] Diferentes níveis (info, warning, error)
  - [ ] Auto-scroll para últimas atividades
  - [ ] Filtros por tipo de log

- [ ] **Controles**
  - [ ] Botão pausar/retomar
  - [ ] Botão cancelar (com confirmação)
  - [ ] Preview da foto sendo processada
  - [ ] Indicador de performance (CPU/RAM)

### **2.3 Tela de Resultados**
- [ ] **Resumo Estatístico**
  - [ ] Cards com métricas principais
  - [ ] Gráficos simples (taxa sucesso)
  - [ ] Comparação com sessões anteriores
  - [ ] Tempo total de processamento

- [ ] **Lista de Problemas**
  - [ ] Participantes sem fotos
  - [ ] QR codes não identificados  
  - [ ] Arquivos com erro
  - [ ] Sugestões de correção

- [ ] **Ações Finais**
  - [ ] Botão "Abrir Pasta Resultado"
  - [ ] Botão "Ver Relatório Completo"
  - [ ] Botão "Processar Novo Evento"
  - [ ] Botão "Exportar Log"

---

## 🔍 FASE 3: PROCESSAMENTO CORE

### **3.1 Parser de CSV**
- [ ] **Leitura e Validação**
  - [ ] Detectar delimiter (vírgula, ponto-vírgula)
  - [ ] Validar colunas obrigatórias
  - [ ] Limpar dados (trim spaces, normalizar)
  - [ ] Detectar encoding (UTF-8, Latin1)

- [ ] **Estruturas de Dados**
  - [ ] Classe Participante (nome, turma, qr_code)
  - [ ] Lista de participantes indexada por QR
  - [ ] Validação QR codes únicos
  - [ ] Export para JSON para Python

### **3.2 Detecção OCR**
- [ ] **Setup OpenCV + pyzbar**
  - [ ] Configurar pyzbar para QR detection
  - [ ] Otimizar parâmetros OpenCV
  - [ ] Pipeline de pré-processamento:
    - [ ] Resize para otimizar velocidade
    - [ ] Conversão grayscale
    - [ ] Ajuste contraste/brilho
    - [ ] Filtros anti-noise

- [ ] **Algoritmo de Detecção**
  - [ ] Scan completo da imagem
  - [ ] Múltiplas tentativas com diferentes configs
  - [ ] Cache de resultados OCR
  - [ ] Confidence score para cada detecção

### **3.3 Organização de Arquivos**
- [ ] **Criação de Estrutura**
  - [ ] Sanitizar nomes (caracteres especiais)
  - [ ] Criar árvore de diretórios
  - [ ] Verificar espaço em disco
  - [ ] Tratar paths longos (Windows)

- [ ] **Cópia de Arquivos**
  - [ ] Operações batch para performance
  - [ ] Verificação integridade (checksum)
  - [ ] Renomeação: original_QRcode.jpg
  - [ ] Preservar metadados EXIF
  - [ ] Progress callback para UI

---

## 🔐 FASE 4: SISTEMA DE LICENCIAMENTO

### **4.1 Integração PhotoManager**
- [ ] **Cliente HTTP**
  - [ ] Configurar fetch/axios para requests
  - [ ] Headers authentication se necessário
  - [ ] Timeout e retry logic
  - [ ] Offline handling (grace period)

- [ ] **Verificação de Licença**
  - [ ] Endpoint /api/photolab-license.php
  - [ ] Cache local da última verificação
  - [ ] Background checks (6h intervals)
  - [ ] UI de status da licença

### **4.2 Controles de Acesso**
- [ ] **Enforcement**
  - [ ] Bloquear processamento se limite atingido
  - [ ] Mostrar modal upgrade plano
  - [ ] Modo demonstração (somente preview)
  - [ ] Counter local de fotos processadas

- [ ] **Interface de Licença**
  - [ ] Tela de login/configuração
  - [ ] Display limits atuais
  - [ ] Progress bar usage
  - [ ] Link para upgrade PhotoManager

---

## 📊 FASE 5: RELATÓRIOS E LOGS

### **5.1 Geração de Relatórios**
- [ ] **Template HTML**
  - [ ] CSS inline (standalone)
  - [ ] Responsivo para impressão
  - [ ] Gráficos com Chart.js embarcado
  - [ ] Export para PDF opcional

- [ ] **Conteúdo do Relatório**
  - [ ] Header com logo e data
  - [ ] Resumo executivo
  - [ ] Tabela participantes processados
  - [ ] Lista de problemas encontrados
  - [ ] Estatísticas detalhadas
  - [ ] Footer com versão PhotoLab

### **5.2 Sistema de Logs**
- [ ] **Configuração Winston**
  - [ ] Arquivo rotativo ~/PhotoLab/logs/
  - [ ] Níveis: error, warn, info, debug
  - [ ] Format: timestamp, level, message
  - [ ] Max 7 dias de histórico

- [ ] **Log Events**
  - [ ] Início/fim de processamento
  - [ ] Cada QR code detectado
  - [ ] Erros de OCR ou I/O
  - [ ] Performance metrics
  - [ ] User actions importantes

---

## 🚀 FASE 6: BUILD E DISTRIBUIÇÃO

### **6.1 Electron Builder**
- [ ] **Configuração Multi-Platform**
  - [ ] Windows: NSIS installer
  - [ ] macOS: DMG + app bundle
  - [ ] Linux: AppImage + .deb
  - [ ] Code signing (futuro)

- [ ] **Assets e Resources**
  - [ ] Ícones para cada platform
  - [ ] Python runtime embarcado
  - [ ] Dependências nativas (OpenCV)
  - [ ] Installer customization

### **6.2 Auto-Updater**
- [ ] **Electron-Updater Setup**
  - [ ] Server para hospedar updates
  - [ ] Verificação na inicialização
  - [ ] Download em background
  - [ ] UI de notification update

- [ ] **Release Process**
  - [ ] Scripts build automatizado
  - [ ] Versionamento semântico
  - [ ] Release notes generation
  - [ ] Upload distribuição automática

---

## 🧪 FASE 7: TESTES E QA

### **7.1 Testes Automatizados**
- [ ] **Unit Tests**
  - [ ] CSV parser
  - [ ] File operations
  - [ ] OCR algorithms
  - [ ] Validation functions

- [ ] **Integration Tests**
  - [ ] End-to-end workflows
  - [ ] Electron main process
  - [ ] Python ↔ Node communication
  - [ ] File system operations

### **7.2 Testes Manuais**
- [ ] **Cenários de Uso**
  - [ ] Dataset pequeno (10 fotos)
  - [ ] Dataset médio (500 fotos)  
  - [ ] Dataset grande (5000 fotos)
  - [ ] Edge cases (QR não detectado)

- [ ] **Compatibilidade**
  - [ ] Windows 10/11
  - [ ] macOS Monterey+  
  - [ ] Ubuntu 20.04+
  - [ ] Diferentes resoluções tela

---

## 🔧 FASE 8: POLIMENTO E OTIMIZAÇÃO

### **8.1 Performance**
- [ ] **Otimizações OCR**
  - [ ] Parallel processing
  - [ ] Memory management
  - [ ] Cache inteligente
  - [ ] Batch operations

- [ ] **Otimizações UI**
  - [ ] Virtual scrolling (logs)
  - [ ] Lazy loading components
  - [ ] Debounce user inputs
  - [ ] Smooth animations

### **8.2 UX Improvements**
- [ ] **Keyboard Shortcuts**
  - [ ] Ctrl+O: Open file
  - [ ] Ctrl+P: Start processing
  - [ ] Esc: Cancel/back
  - [ ] F11: Full screen

- [ ] **Accessibility**
  - [ ] Screen reader support
  - [ ] High contrast mode
  - [ ] Keyboard navigation
  - [ ] Focus indicators

---

## 📚 FASE 9: DOCUMENTAÇÃO

### **9.1 Documentação Técnica**
- [ ] **README.md**
  - [ ] Setup desenvolvimento
  - [ ] Build instructions  
  - [ ] API documentation
  - [ ] Troubleshooting guide

- [ ] **Code Documentation**
  - [ ] JSDoc comments
  - [ ] Python docstrings
  - [ ] Architecture diagrams
  - [ ] Database schemas

### **9.2 Documentação do Usuário**
- [ ] **Manual do Usuário**
  - [ ] Guia instalação
  - [ ] Tutorial passo-a-passo
  - [ ] FAQ comum
  - [ ] Solução problemas

- [ ] **Help Integrado**
  - [ ] Tooltips na interface
  - [ ] Help contextual
  - [ ] Wizard primeira execução
  - [ ] Video tutorials (links)

---

## 🎯 MILESTONES DE ENTREGA

### **🚩 Milestone 1 - MVP Core** (Semana 1-2)
```
Entregáveis:
✅ Interface básica funcional
✅ OCR básico QR codes  
✅ Organização arquivos simples
✅ Relatório texto básico
```

### **🚩 Milestone 2 - Licenciamento** (Semana 3)
```
Entregáveis:  
✅ Integração PhotoManager API
✅ Sistema controle acesso
✅ Interface licenciamento
✅ Verificação online/offline
```

### **🚩 Milestone 3 - Polish** (Semana 4)
```
Entregáveis:
✅ Interface profissional
✅ Performance otimizada
✅ Tratamento erros robusto
✅ Relatórios HTML
```

### **🚩 Milestone 4 - Release** (Semana 5)
```
Entregáveis:
✅ Builds multiplataforma
✅ Auto-updater funcional
✅ Documentação completa
✅ Testes QA aprovados
```

---

## 📋 CHECKLIST FINAL PRÉ-RELEASE

### **Funcional**
- [ ] Processa 1000+ fotos sem crashes
- [ ] Taxa detecção QR > 90%
- [ ] Estrutura pastas 100% correta  
- [ ] Licenciamento funcional
- [ ] Relatórios gerados sempre

### **Técnico**
- [ ] Instaladores para 3 plataformas
- [ ] Auto-updater testado
- [ ] Performance benchmarks OK
- [ ] Memory leaks testados
- [ ] Error handling robusto

### **Usabilidade**
- [ ] Interface intuitiva (teste usuário)
- [ ] Mensagens erro claras
- [ ] Progress feedback adequado
- [ ] Documentação disponível
- [ ] Suporte básico implementado

---

*Esta lista será atualizada conforme progresso do desenvolvimento*