# 🐍 Instalação das Dependências Python - PhotoLab

Para usar a **Fase 2 - Processamento OCR** do PhotoLab, você precisa instalar as dependências Python.

## 📋 Pré-requisitos

### 1. Python 3.11+
Se você não tem Python instalado:

**Windows:**
- Baixe em: https://www.python.org/downloads/
- ✅ Marque "Add Python to PATH" durante a instalação
- Teste no CMD: `python --version`

**macOS:**
```bash
# Via Homebrew
brew install python

# Ou baixe do site oficial
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip

# CentOS/RHEL
sudo yum install python3 python3-pip
```

## 🚀 Instalação Rápida

### Opção 1: Via requirements.txt (Recomendado)
```bash
# Navegue até a pasta do projeto
cd photolab

# Instale todas as dependências
pip install -r requirements.txt
```

### Opção 2: Instalação Manual
```bash
# Dependências principais
pip install opencv-python==4.8.1.78
pip install pyzbar==0.1.9
pip install Pillow==10.0.0
pip install pandas==2.0.3
pip install numpy==1.24.3
```

## ✅ Verificação da Instalação

### Teste Manual
```bash
python -c "import cv2, pyzbar, numpy; print('Todas as dependências OK!')"
```

### Teste via PhotoLab
1. Abra o PhotoLab
2. Vá para "Processamento"
3. Veja o status das dependências na interface

## 🔧 Resolução de Problemas

### Erro: "Python not found"
- **Windows:** Reinstale Python marcando "Add to PATH"
- **macOS/Linux:** Use `python3` em vez de `python`

### Erro: "pip not found"
```bash
# Windows
python -m ensurepip --upgrade

# macOS/Linux
sudo apt install python3-pip  # Ubuntu
```

### Erro: "Microsoft Visual C++ required" (Windows)
- Instale: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Ou use versão pré-compilada: `pip install opencv-python-headless`

### Erro: "Permission denied"
```bash
# Use --user para instalar apenas para seu usuário
pip install --user -r requirements.txt
```

### Erro com OpenCV
Se `opencv-python` não funcionar, tente:
```bash
# Versão mais leve
pip uninstall opencv-python
pip install opencv-python-headless==4.8.1.78
```

## 🌐 Ambientes Virtuais (Opcional)

Para evitar conflitos com outros projetos:

```bash
# Criar ambiente virtual
python -m venv photolab_env

# Ativar (Windows)
photolab_env\Scripts\activate

# Ativar (macOS/Linux)
source photolab_env/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Desativar quando terminar
deactivate
```

## 📦 Dependências Detalhadas

| Pacote | Versão | Função |
|--------|--------|---------|
| `opencv-python` | 4.8.1.78 | Processamento de imagens e detecção |
| `pyzbar` | 0.1.9 | Decodificação de QR codes |
| `Pillow` | 10.0.0 | Manipulação de imagens |
| `pandas` | 2.0.3 | Manipulação de dados CSV |
| `numpy` | 1.24.3 | Operações matemáticas |

## 🎯 Verificação Final

Após a instalação, a interface do PhotoLab deve mostrar:

```
✅ Todas as dependências OK
Python: 3.11.x
```

Se você ver esta mensagem, está pronto para usar o processamento OCR!

## 🆘 Ainda com Problemas?

1. **Verifique a versão do Python:**
   ```bash
   python --version
   ```

2. **Verifique o pip:**
   ```bash
   pip --version
   ```

3. **Reinstale uma dependência específica:**
   ```bash
   pip uninstall opencv-python
   pip install opencv-python==4.8.1.78
   ```

4. **Use o gerenciador de pacotes do sistema:**
   ```bash
   # Ubuntu
   sudo apt install python3-opencv python3-pil

   # macOS com Homebrew
   brew install opencv python-pillow
   ```

---

**💡 Dica:** Após instalar as dependências, reinicie o PhotoLab para que as mudanças sejam detectadas!

