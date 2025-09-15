#!/usr/bin/env python3
"""
PhotoLab QR Code Detector

This module handles QR code detection from images using OpenCV and pyzbar.
Follows the architecture specified in project_rules.md - Phase 2.
"""

import cv2
import numpy as np
from pyzbar import pyzbar
import json
import sys
import os
from pathlib import Path
import time
import logging
import re

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class QRDetector:
    """
    QR Code detection engine with multiple optimization strategies.
    """
    
    def __init__(self):
        self.cache = {}
        self.processed_count = 0
        
    def detect_qr_code(self, image_path):
        """
        Detect QR code from a single image with multiple attempts.
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            dict: Detection result with code, confidence, and metadata
        """
        try:
            # Check cache first
            if image_path in self.cache:
                return self.cache[image_path]
            
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return self._create_result(False, None, 0.0, "Could not load image")
            
            # Try multiple detection strategies
            strategies = [
                self._detect_standard,
                self._detect_enhanced_contrast,
                self._detect_resized,
                self._detect_rotated
            ]
            
            for strategy in strategies:
                result = strategy(image)
                if result['found']:
                    # Cache successful result
                    self.cache[image_path] = result
                    logger.info(f"QR detected in {os.path.basename(image_path)}: {result['code']}")
                    return result
            
            # No QR code found
            result = self._create_result(False, None, 0.0, "No QR code detected")
            self.cache[image_path] = result
            return result
            
        except Exception as e:
            logger.error(f"Error processing {image_path}: {str(e)}")
            return self._create_result(False, None, 0.0, f"Processing error: {str(e)}")
    
    def _detect_standard(self, image):
        """Standard detection with grayscale conversion."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        codes = pyzbar.decode(gray)
        
        if codes:
            # Try to find the best QR code (largest or most central)
            best_code = self._select_best_qr_code(codes, image.shape)
            return self._create_result(True, best_code.data.decode('utf-8'), 0.9, "Standard detection")
        return self._create_result(False, None, 0.0, "Standard detection failed")
    
    def _detect_enhanced_contrast(self, image):
        """Detection with enhanced contrast and brightness."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Enhance contrast using CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        codes = pyzbar.decode(enhanced)
        if codes:
            best_code = self._select_best_qr_code(codes, image.shape)
            return self._create_result(True, best_code.data.decode('utf-8'), 0.8, "Enhanced contrast")
        return self._create_result(False, None, 0.0, "Enhanced contrast failed")
    
    def _detect_resized(self, image):
        """Detection with image resizing for better QR visibility."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Try different scales
        scales = [1.5, 2.0, 0.5]
        for scale in scales:
            height, width = gray.shape
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            resized = cv2.resize(gray, (new_width, new_height))
            codes = pyzbar.decode(resized)
            
            if codes:
                best_code = self._select_best_qr_code(codes, image.shape)
                return self._create_result(True, best_code.data.decode('utf-8'), 0.7, f"Resized {scale}x")
        
        return self._create_result(False, None, 0.0, "Resize detection failed")
    
    def _detect_rotated(self, image):
        """Detection with rotations to handle camera angles and orientations."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Try major rotations first (90, 180, 270) - CRITICAL FIX
        major_angles = [90, 180, 270]
        for angle in major_angles:
            height, width = gray.shape
            center = (width // 2, height // 2)
            
            # Use rotateBound to avoid cropping
            rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            
            # Calculate new dimensions to avoid cropping
            cos = np.abs(rotation_matrix[0, 0])
            sin = np.abs(rotation_matrix[0, 1])
            new_width = int((height * sin) + (width * cos))
            new_height = int((height * cos) + (width * sin))
            
            # Adjust rotation matrix for new center
            rotation_matrix[0, 2] += (new_width / 2) - center[0]
            rotation_matrix[1, 2] += (new_height / 2) - center[1]
            
            rotated = cv2.warpAffine(gray, rotation_matrix, (new_width, new_height))
            
            codes = pyzbar.decode(rotated)
            if codes:
                best_code = self._select_best_qr_code(codes, image.shape)
                return self._create_result(True, best_code.data.decode('utf-8'), 0.8, f"Major rotation {angle}°")
        
        # Try small rotations as fallback
        small_angles = [-5, 5, -10, 10]
        for angle in small_angles:
            height, width = gray.shape
            center = (width // 2, height // 2)
            
            rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(gray, rotation_matrix, (width, height))
            
            codes = pyzbar.decode(rotated)
            if codes:
                best_code = self._select_best_qr_code(codes, image.shape)
                return self._create_result(True, best_code.data.decode('utf-8'), 0.6, f"Small rotation {angle}°")
        
        return self._create_result(False, None, 0.0, "Rotation detection failed")
    
    def _natural_sort_files(self, file_list):
        """
        Sort files using natural sorting (photo1, photo2, ..., photo10).
        CRITICAL: Preserves sequential order for proper grouping.
        """
        def natural_sort_key(file_path):
            # Extract filename without extension
            name = file_path.stem
            
            # Split into text and number parts
            parts = re.split(r'(\d+)', name)
            
            # Convert number parts to integers for proper sorting
            key_parts = []
            for part in parts:
                if part.isdigit():
                    key_parts.append(int(part))
                else:
                    key_parts.append(part.lower())
            
            return key_parts
        
        return sorted(file_list, key=natural_sort_key)
    
    def _select_best_qr_code(self, codes, image_shape):
        """
        Select the best QR code when multiple are detected.
        Prioritizes larger codes and those closer to center.
        """
        if len(codes) == 1:
            return codes[0]
        
        best_code = codes[0]
        best_score = 0
        
        height, width = image_shape[:2]
        center_x, center_y = width // 2, height // 2
        
        for code in codes:
            # Calculate QR code area
            if hasattr(code, 'rect') and code.rect:
                qr_area = code.rect.width * code.rect.height
                qr_center_x = code.rect.left + code.rect.width // 2
                qr_center_y = code.rect.top + code.rect.height // 2
                
                # Distance from image center
                distance_from_center = np.sqrt((qr_center_x - center_x)**2 + (qr_center_y - center_y)**2)
                
                # Score: larger area is better, closer to center is better
                # Normalize by image size
                area_score = qr_area / (width * height)
                center_score = 1.0 - (distance_from_center / np.sqrt(center_x**2 + center_y**2))
                
                total_score = area_score * 0.7 + center_score * 0.3
                
                if total_score > best_score:
                    best_score = total_score
                    best_code = code
        
        return best_code
    
    def _create_result(self, found, code, confidence, method):
        """Create standardized result dictionary."""
        return {
            'found': found,
            'code': code,
            'confidence': confidence,
            'method': method,
            'timestamp': time.time()
        }
    
    def process_folder(self, folder_path, progress_callback=None):
        """
        Process all JPG files in a folder for QR code detection.
        CORRIGIDO: Agora preserva ordem sequencial dos arquivos.
        
        Args:
            folder_path (str): Path to folder containing images
            progress_callback (callable): Optional callback for progress updates
            
        Returns:
            list: List of detection results for each image
        """
        try:
            folder = Path(folder_path)
            if not folder.exists():
                raise FileNotFoundError(f"Folder not found: {folder_path}")
            
            # Find all JPG files
            jpg_files = []
            for ext in ['*.jpg', '*.jpeg', '*.JPG', '*.JPEG']:
                found_files = list(folder.glob(ext))
                jpg_files.extend(found_files)
                logger.debug(f"Found {len(found_files)} files with extension {ext}")
            
            # Remove duplicates preserving order (CRITICAL FIX)
            seen = set()
            jpg_files = [f for f in jpg_files if f not in seen and not seen.add(f)]
            
            if not jpg_files:
                logger.warning(f"No JPG files found in {folder_path}")
                return []
            
            # CRITICAL: Sort files deterministically by name (natural sort)
            jpg_files = self._natural_sort_files(jpg_files)
            
            logger.info(f"Found {len(jpg_files)} unique JPG files to process")
            logger.info("Files sorted in natural order (photo1, photo2, ..., photo10)")
            
            # Log first few filenames for verification
            for i, file_path in enumerate(jpg_files[:5]):
                logger.info(f"  {i+1}. {file_path.name}")
            if len(jpg_files) > 5:
                logger.info(f"  ... and {len(jpg_files) - 5} more files")
            
            results = []
            for i, image_path in enumerate(jpg_files):
                # Progress callback
                if progress_callback:
                    progress_callback(i + 1, len(jpg_files), str(image_path))
                
                # Detect QR code
                detection_result = self.detect_qr_code(str(image_path))
                
                # Add file info to result
                detection_result.update({
                    'file_path': str(image_path),
                    'file_name': image_path.name,
                    'file_size': image_path.stat().st_size,
                    'modified_time': image_path.stat().st_mtime
                })
                
                results.append(detection_result)
                self.processed_count += 1
            
            logger.info(f"Processing complete. {self.processed_count} images processed.")
            return results
            
        except Exception as e:
            logger.error(f"Error processing folder {folder_path}: {str(e)}")
            return []

def main():
    """
    Command-line interface for QR detection.
    Expected usage: python qr_detector.py <folder_path>
    """
    if len(sys.argv) != 2:
        print("Usage: python qr_detector.py <folder_path>")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    
    # Progress callback for command line
    def progress_callback(current, total, file_name):
        progress = (current / total) * 100
        print(f"Progress: {progress:.1f}% ({current}/{total}) - {os.path.basename(file_name)}")
    
    # Initialize detector and process folder
    detector = QRDetector()
    results = detector.process_folder(folder_path, progress_callback)
    
    # Output results as JSON
    output = {
        'success': True,
        'total_images': len(results),
        'qr_detected': len([r for r in results if r['found']]),
        'results': results
    }
    
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
