# PhotoLab Project Rules

## 📋 PROJECT OVERVIEW

**PhotoLab** é uma aplicação desktop Electron que automatiza a organização de fotos de eventos escolares através de detecção de QR codes e criação de estrutura de pastas física.

### Key Information
- **Stack:** Electron + React + Node.js + Python
- **Target Platforms:** Windows, macOS, Linux
- **Processing:** Local apenas (sem cloud)
- **Integration:** PhotoManager SaaS (licenciamento)

---

## 🏗️ ARCHITECTURE RULES

### Tech Stack Requirements
```
Frontend: 
- Electron ^27.0.0
- React ^18.2.0  
- Tailwind CSS ^3.4.0
- Lucide React (icons only)

Backend:
- Node.js ^20.0.0
- Python ^3.11 (embedded)
- SQLite3 (cache/config only)

Processing Libraries:
- OpenCV-Python (QR detection)
- pyzbar (QR decoding)
- Pillow (image processing)
- csv-parse (Node.js CSV)
```

### Project Structure (MANDATORY)
```
photolab/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── ipc-handlers.js
│   ├── renderer/               # React frontend
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── FileSelectors/
│   │   │   ├── Progress/
│   │   │   └── Reports/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Processing.jsx
│   │   │   └── Results.jsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── python/                 # Python processing scripts
│   │   ├── qr_detector.py
│   │   ├── file_organizer.py
│   │   ├── csv_parser.py
│   │   └── main.py
│   └── assets/
├── public/
├── build/
├── dist/
├── package.json
├── electron-builder.json
├── requirements.txt
├── projectrules.md
└── agentrules.md
```

---

## 📁 FILE ORGANIZATION RULES

### Component Naming
- **PascalCase:** React components (FolderSelector.jsx)
- **camelCase:** Functions, variables, files (.js/.py)
- **kebab-case:** CSS classes, HTML attributes
- **UPPER_CASE:** Constants, environment configs

### Import Order (MANDATORY)
```javascript
// 1. Node.js built-ins
import path from 'path'
import fs from 'fs'

// 2. External libraries  
import React from 'react'
import { BrowserRouter } from 'react-router-dom'

// 3. Internal utilities
import { parseCSV } from '../utils/csvParser'

// 4. Internal components
import Layout from './Layout/Layout'

// 5. Relative imports
import './Component.css'
```

### File Size Limits
- **React Components:** Max 300 lines
- **Python Scripts:** Max 500 lines  
- **Utils Functions:** Max 100 lines
- **Break into smaller files if exceeded**

---

## 🎯 DEVELOPMENT PRIORITIES (CRITICAL)

### Phase Priority Order (DO NOT DEVIATE)
```
PHASE 1 (Week 1): MVP Core - ABSOLUTE PRIORITY
├── 1. Directory selector (folder picker)
├── 2. CSV loader + validation  
├── 3. Directory structure creation
└── Basic UI working end-to-end

PHASE 2 (Week 2-3): OCR Processing
├── 4. Python OCR setup
├── 5. QR code detection
├── 6. Photo grouping algorithm
├── 7. Manual correction interface
└── File copy + rename

PHASE 3 (Week 4): Licensing  
PHASE 4 (Week 5): Reports + Polish
```

**RULE:** Complete current phase 100% before starting next phase.

---

## 🔒 SECURITY & DATA RULES

### Data Handling
```
✅ ALLOWED:
- Local file system access (read/write)
- SQLite for cache/config only
- HTTP requests to PhotoManager API (licensing)
- Python subprocess communication

❌ FORBIDDEN:
- Upload photos to any server
- Store personal data in cloud
- External analytics tracking
- Unnecessary network requests
```

### File System Rules
```
Source Directory: READ-ONLY (never modify originals)
Destination: CREATE new organized structure
Cache: ~/PhotoLab/cache/ (can be deleted anytime)
Logs: ~/PhotoLab/logs/ (rotate after 7 days)
Config: ~/PhotoLab/config.json (user settings only)
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### Benchmarks (MUST MEET)
```
Small Dataset (100 photos): < 2 minutes total
Medium Dataset (1000 photos): < 15 minutes total  
Large Dataset (5000 photos): < 45 minutes total

Memory Usage: < 1GB during processing
CPU: Utilize all available cores for OCR
Storage: No unnecessary file duplication
```

### OCR Performance Rules
```python
# OCR must be optimized:
- Parallel processing (multiprocessing)
- Image preprocessing pipeline
- Cache results (avoid reprocessing)
- Progress callbacks every 10 files
- Graceful cancellation support
```

---

## 🎨 UI/UX REQUIREMENTS

### Design Standards
```css
Theme: Professional, clean, modern
Colors: Blue primary (#3B82F6), Gray neutrals  
Typography: System fonts (Inter fallback)
Layout: Responsive (min 1024x768)
Animations: Subtle, purposeful (< 300ms)
```

### User Experience Rules
```
✅ REQUIRED:
- Progress feedback for all operations
- Clear error messages (no technical jargon)
- Keyboard shortcuts (Ctrl+O, Ctrl+P, Esc)
- Undo capability where possible
- Offline functionality (except licensing)

❌ AVOID:
- Loading states > 3 seconds without feedback
- Technical error messages to users
- Blocking UI during processing
- Auto-actions without confirmation
```

---

## 🧪 TESTING REQUIREMENTS

### Test Data Requirements
```
CSV Test Files:
├── small.csv (10 participants)
├── medium.csv (100 participants)  
├── large.csv (500 participants)
├── malformed.csv (testing validation)
└── unicode.csv (special characters)

Photo Test Sets:
├── perfect-qr/ (clear QR codes)
├── blurry-qr/ (challenging detection)
├── no-qr/ (missing QR codes)
└── mixed/ (realistic scenario)
```

### Error Handling (CRITICAL)
```
MUST handle gracefully:
- File permissions denied
- Disk space full
- Corrupted image files
- Invalid CSV format
- Network timeout (licensing)
- Python process crashes
- User cancellation
```

---

## 📦 BUILD & DEPLOYMENT RULES

### Build Configuration
```json
Electron Builder Targets:
- Windows: NSIS installer (.exe)
- macOS: DMG + app notarization
- Linux: AppImage + .deb package

Bundle Requirements:
- Python runtime embedded
- All dependencies included
- No external installations required
- Auto-updater configured
```

### Version Management
```
Semantic Versioning: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: New features  
- PATCH: Bug fixes only

Release Channels:
- stable: Production releases
- beta: Testing releases  
- alpha: Development builds
```

---

## 🔗 INTEGRATION RULES

### PhotoManager API Integration
```javascript
Endpoint: /api/photolab-license.php
Method: GET
Params: ?user_id=string
Response: {
  active: boolean,
  plan: "free|basic|pro",
  photos_limit: number,
  photos_used: number
}

Verification Schedule:
- On app startup
- Every 6 hours (background)
- Before processing events
- Manual refresh option
```

### License Enforcement
```
Free Plan: 100 photos/month, 2 events/month
Basic Plan: 1000 photos/month, 10 events/month  
Pro Plan: Unlimited

Actions on Limit Exceeded:
- Block new processing
- Show upgrade modal
- Allow viewing existing results
- 24h grace period if offline
```

---

## 🚫 WHAT NOT TO BUILD

### Out of Scope (DO NOT IMPLEMENT)
```
❌ Photo editing capabilities
❌ Cloud storage integration
❌ User authentication system  
❌ Multi-user support
❌ Real-time collaboration
❌ Mobile app versions
❌ Plugin system
❌ Advanced image analysis (beyond QR)
❌ Social sharing features
❌ Payment processing
```

### Library Restrictions
```
❌ AVOID:
- Heavy frameworks (Angular, Vue in Electron)
- Unnecessary dependencies
- Beta/experimental libraries
- Libraries with security issues
- GPL licensed libraries (commercial conflict)
```

---

## 📝 CODE QUALITY STANDARDS

### JavaScript/React Rules
```javascript
// Use functional components only
const Component = ({ prop1, prop2 }) => {
  // Hooks at top
  const [state, setState] = useState()
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Implementation
  }, [dependencies])
  
  // Early returns
  if (loading) return <Loading />
  
  // JSX
  return <div>Content</div>
}

// Export at bottom
export default Component
```

### Python Rules  
```python
# Type hints required
def process_qr_code(image_path: str) -> dict:
    """Process QR code from image.
    
    Args:
        image_path: Path to image file
        
    Returns:
        Dict with detection results
    """
    pass

# Error handling required
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Specific error: {e}")
    return {"error": str(e)}
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Success (MVP)
- [ ] User can select source folder
- [ ] CSV loads and validates correctly  
- [ ] Directory structure creates perfectly
- [ ] UI is responsive and intuitive
- [ ] No crashes or data loss

### Phase 2 Success (OCR)  
- [ ] QR detection >90% accuracy on good images
- [ ] Photo grouping works correctly
- [ ] Manual correction interface functional
- [ ] Files copy without corruption
- [ ] Progress feedback smooth

### Final Success (Release)
- [ ] Handles 1000+ photos reliably
- [ ] Licensing integration works
- [ ] Professional reports generated
- [ ] Installers work on all platforms
- [ ] Performance meets benchmarks

---

*This document is the SINGLE SOURCE OF TRUTH for PhotoLab development. All decisions must align with these rules.*