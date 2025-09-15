#!/usr/bin/env python3
"""
Teste simples para verificar se as dependências Python estão funcionando
"""

import sys
import json

def test_dependencies():
    """Test if all required Python dependencies are available."""
    results = {
        'python_version': sys.version,
        'dependencies': {},
        'errors': []
    }
    
    # Test each dependency
    dependencies = [
        ('cv2', 'opencv-python'),
        ('pyzbar', 'pyzbar'),
        ('numpy', 'numpy'),
        ('PIL', 'Pillow'),
        ('pandas', 'pandas')
    ]
    
    for module_name, package_name in dependencies:
        try:
            module = __import__(module_name)
            version = getattr(module, '__version__', 'unknown')
            results['dependencies'][package_name] = {
                'status': 'OK',
                'version': version
            }
            print(f"✅ {package_name}: {version}")
        except ImportError as e:
            results['dependencies'][package_name] = {
                'status': 'MISSING',
                'error': str(e)
            }
            results['errors'].append(f"Missing: {package_name}")
            print(f"❌ {package_name}: MISSING")
    
    # Test basic OpenCV functionality
    try:
        import cv2
        import numpy as np
        
        # Create test image
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        
        # Test grayscale conversion
        gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
        
        print("✅ OpenCV basic functionality: OK")
        results['opencv_test'] = 'OK'
        
    except Exception as e:
        print(f"❌ OpenCV basic functionality: {e}")
        results['opencv_test'] = str(e)
        results['errors'].append(f"OpenCV test failed: {e}")
    
    # Test pyzbar
    try:
        from pyzbar import pyzbar
        print("✅ pyzbar import: OK")
        results['pyzbar_test'] = 'OK'
    except Exception as e:
        print(f"❌ pyzbar import: {e}")
        results['pyzbar_test'] = str(e)
        results['errors'].append(f"pyzbar test failed: {e}")
    
    # Overall status
    results['success'] = len(results['errors']) == 0
    
    return results

if __name__ == "__main__":
    print("🔍 Testing Python dependencies for PhotoLab...\n")
    
    results = test_dependencies()
    
    print(f"\n📊 Summary:")
    print(f"   Python: {sys.version.split()[0]}")
    print(f"   Dependencies: {len([d for d in results['dependencies'].values() if d['status'] == 'OK'])}/{len(results['dependencies'])} OK")
    
    if results['success']:
        print("✅ All dependencies are working correctly!")
    else:
        print("❌ Some dependencies are missing or not working:")
        for error in results['errors']:
            print(f"   - {error}")
        print("\nTo install missing dependencies:")
        print("   pip install opencv-python pyzbar Pillow pandas numpy")
    
    # Output JSON for programmatic use
    print(f"\n==JSON_START==")
    print(json.dumps(results, indent=2))
    print("==JSON_END==")
