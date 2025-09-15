#!/usr/bin/env python3
"""
PhotoLab Main Processing Script

Coordinates QR detection and photo grouping for the PhotoLab application.
This is the main entry point called from the Electron app.
"""

import json
import sys
import os
import tempfile
from pathlib import Path
import logging
import traceback

# Import our modules
from qr_detector import QRDetector
from photo_grouper import PhotoGrouper

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PhotoLabProcessor:
    """
    Main processor that coordinates QR detection and photo grouping.
    """
    
    def __init__(self):
        self.detector = QRDetector()
        self.temp_dir = None
        
    def process_photos(self, config):
        """
        Process photos with QR detection and grouping.
        
        Args:
            config (dict): Configuration with source_folder, participants, options
            
        Returns:
            dict: Complete processing results
        """
        try:
            logger.info("Starting PhotoLab processing...")
            
            # Validate config
            validation_result = self._validate_config(config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            source_folder = config['source_folder']
            participants = config['participants']
            
            # Create temporary directory for intermediate files
            self.temp_dir = tempfile.mkdtemp(prefix='photolab_')
            logger.info(f"Created temp directory: {self.temp_dir}")
            
            # Step 1: QR Code Detection
            logger.info("Step 1: Detecting QR codes...")
            detection_results = self._detect_qr_codes(source_folder, config.get('progress_callback'))
            
            if not detection_results:
                return {
                    'success': False,
                    'error': 'No images found or QR detection failed'
                }
            
            # Step 2: Photo Grouping
            logger.info("Step 2: Grouping photos...")
            grouping_results = self._group_photos(detection_results, participants)
            
            if not grouping_results['success']:
                return {
                    'success': False,
                    'error': f"Photo grouping failed: {grouping_results.get('error', 'Unknown error')}"
                }
            
            # Step 3: Copy photos to participant folders
            logger.info("Step 3: Copying photos to participant folders...")
            copy_results = self._copy_photos_to_folders(grouping_results, config)
            
            # Step 4: Prepare final results
            final_results = self._prepare_final_results(detection_results, grouping_results, config)
            final_results['photo_copying'] = copy_results
            
            logger.info("PhotoLab processing completed successfully!")
            return final_results
            
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }
        finally:
            # Cleanup temp directory
            self._cleanup()
    
    def _validate_config(self, config):
        """Validate processing configuration."""
        required_fields = ['source_folder', 'participants']
        
        for field in required_fields:
            if field not in config:
                return {
                    'valid': False,
                    'error': f"Missing required field: {field}"
                }
        
        # Check source folder exists
        source_folder = Path(config['source_folder'])
        if not source_folder.exists():
            return {
                'valid': False,
                'error': f"Source folder does not exist: {config['source_folder']}"
            }
        
        # Check participants list
        participants = config['participants']
        if not participants or len(participants) == 0:
            return {
                'valid': False,
                'error': "Participants list is empty"
            }
        
        # Validate participant data
        for i, participant in enumerate(participants):
            required_participant_fields = ['name', 'turma', 'qrCode']
            for field in required_participant_fields:
                if field not in participant:
                    return {
                        'valid': False,
                        'error': f"Participant {i+1} missing field: {field}"
                    }
        
        return {'valid': True}
    
    def _detect_qr_codes(self, source_folder, progress_callback=None):
        """Run QR code detection on all images."""
        try:
            # Create progress callback wrapper if provided
            def wrapped_callback(current, total, file_name):
                if progress_callback:
                    progress_callback({
                        'stage': 'qr_detection',
                        'current': current,
                        'total': total,
                        'file_name': os.path.basename(file_name),
                        'message': f"Detecting QR codes: {current}/{total}"
                    })
            
            # Run detection
            detection_results = self.detector.process_folder(source_folder, wrapped_callback)
            
            # Save intermediate results
            detection_file = os.path.join(self.temp_dir, 'detection_results.json')
            with open(detection_file, 'w') as f:
                json.dump({
                    'success': True,
                    'total_images': len(detection_results),
                    'results': detection_results
                }, f, indent=2)
            
            logger.info(f"QR detection completed. {len(detection_results)} images processed.")
            return detection_results
            
        except Exception as e:
            logger.error(f"QR detection error: {str(e)}")
            return []
    
    def _group_photos(self, detection_results, participants):
        """Group photos based on detection results."""
        try:
            grouper = PhotoGrouper(participants)
            grouping_results = grouper.group_photos(detection_results)
            
            # Save intermediate results
            grouping_file = os.path.join(self.temp_dir, 'grouping_results.json')
            with open(grouping_file, 'w') as f:
                json.dump(grouping_results, f, indent=2)
            
            # Add suggestions
            grouping_results['suggestions'] = grouper.get_manual_correction_suggestions()
            
            return grouping_results
            
        except Exception as e:
            logger.error(f"Photo grouping error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _prepare_final_results(self, detection_results, grouping_results, config):
        """Prepare final processing results."""
        qr_detected_count = len([r for r in detection_results if r['found']])
        
        results = {
            'success': True,
            'processing_summary': {
                'total_images': len(detection_results),
                'qr_detected': qr_detected_count,
                'qr_detection_rate': (qr_detected_count / len(detection_results) * 100) if detection_results else 0,
                'groups_created': len(grouping_results.get('groups', {})),
                'ungrouped_photos': len(grouping_results.get('ungrouped_photos', [])),
                'temp_directory': self.temp_dir
            },
            'qr_detection': {
                'results': detection_results,
                'cache_size': len(self.detector.cache)
            },
            'photo_grouping': grouping_results,
            'ready_for_copy': True,
            'next_steps': [
                'Review ungrouped photos',
                'Manual corrections if needed',
                'Copy and rename files'
            ]
        }
        
        return results
    
    def _copy_photos_to_folders(self, grouping_results, config):
        """Copy photos to their respective participant folders.

        Rules:
        - Use the existing directory structure created at the beginning:
          <destination>/<turma>/<participantName - QRCode>/
        - Rename files to include QR code suffix using underscore:
          originalName_qr1234567.jpg
        """
        import shutil
        
        try:
            results = {
                'success': True,
                'copied_files': [],
                'errors': [],
                'summary': {
                    'total_copied': 0,
                    'total_errors': 0
                }
            }
            
            # Get destination folder from config
            destination_base = config.get('destination_folder')
            if not destination_base:
                return {
                    'success': False,
                    'error': 'No destination folder specified in config'
                }
            
            # Create base destination folder if it doesn't exist
            os.makedirs(destination_base, exist_ok=True)
            
            def sanitize_path_component(text: str) -> str:
                """Sanitize a path component for cross-platform compatibility."""
                if text is None:
                    return ""
                # Replace forbidden characters and strip spaces
                forbidden = '<>:"/\\|?*'
                sanitized = ''.join('_' if ch in forbidden else ch for ch in str(text))
                return sanitized.strip()

            def fix_mojibake(text: str) -> str:
                """Fix common mojibake (UTF-8 seen as Latin-1) without breaking valid strings."""
                if not isinstance(text, str):
                    return text
                # Heuristic: if contains typical mojibake lead bytes
                if any(ch in text for ch in ['Ã', 'Â']):
                    try:
                        return text.encode('latin1', errors='ignore').decode('utf-8', errors='ignore')
                    except Exception:
                        return text
                return text

            def filename_with_qr(original_filename: str, qr_code: str) -> str:
                name, ext = os.path.splitext(original_filename)
                qr = str(qr_code or '').strip()
                # Normalize to lowercase 'qr' prefix with digits/content after
                if qr.lower().startswith('qr'):
                    qr_suffix = 'qr' + qr[2:]
                else:
                    qr_suffix = 'qr' + qr
                return f"{name}_{qr_suffix}{ext}"

            # Copy photos for each group
            groups = grouping_results.get('groups', {})
            for qr_code, group_data in groups.items():
                try:
                    participant = group_data.get('participant', {}) or {}
                    participant_name = participant.get('name', f'QR_{qr_code}')
                    turma = participant.get('turma') or group_data.get('turma') or 'SemTurma'

                    # Fix possible mojibake prior to creating directories
                    participant_name = fix_mojibake(participant_name)
                    turma = fix_mojibake(turma)

                    # Build target structure: <dest>/<turma>/<participant - QR>
                    turma_folder = os.path.join(destination_base, sanitize_path_component(turma))
                    participant_folder_name = f"{participant_name} - {qr_code}"
                    participant_folder = os.path.join(
                        turma_folder,
                        sanitize_path_component(participant_folder_name)
                    )
                    os.makedirs(turma_folder, exist_ok=True)
                    os.makedirs(participant_folder, exist_ok=True)
                    
                    # Copy photos to participant folder
                    for photo in group_data.get('photos', []):
                        try:
                            source_path = photo.get('file_path')
                            if not source_path or not os.path.exists(source_path):
                                results['errors'].append({
                                    'photo': photo.get('file_name', 'Unknown'),
                                    'error': f'Source file not found: {source_path}'
                                })
                                continue
                            
                            # Generate destination filename with _qr suffix
                            original_name = os.path.basename(source_path)
                            file_name = filename_with_qr(original_name, qr_code)
                            dest_path = os.path.join(participant_folder, file_name)
                            
                            # Copy file
                            shutil.copy2(source_path, dest_path)
                            
                            results['copied_files'].append({
                                'source': source_path,
                                'destination': dest_path,
                                'participant': participant_name,
                                'qr_code': qr_code,
                                'turma': turma
                            })
                            results['summary']['total_copied'] += 1
                            
                            logger.info(f"Copied {original_name} -> {file_name} to {participant_name}/{turma} folder")
                            
                        except Exception as e:
                            error_msg = f"Error copying {photo.get('file_name', 'Unknown')}: {str(e)}"
                            logger.error(error_msg)
                            results['errors'].append({
                                'photo': photo.get('file_name', 'Unknown'),
                                'error': error_msg
                            })
                            results['summary']['total_errors'] += 1
                            
                except Exception as e:
                    error_msg = f"Error processing group {qr_code}: {str(e)}"
                    logger.error(error_msg)
                    results['errors'].append({
                        'group': qr_code,
                        'error': error_msg
                    })
            
            # Create "Não Agrupadas" folder for ungrouped photos
            ungrouped_photos = grouping_results.get('ungrouped_photos', [])
            if ungrouped_photos:
                ungrouped_folder = os.path.join(destination_base, "Não Agrupadas")
                os.makedirs(ungrouped_folder, exist_ok=True)
                
                for photo in ungrouped_photos:
                    try:
                        source_path = photo.get('file_path')
                        if not source_path or not os.path.exists(source_path):
                            continue
                        
                        file_name = os.path.basename(source_path)
                        dest_path = os.path.join(ungrouped_folder, file_name)
                        
                        shutil.copy2(source_path, dest_path)
                        
                        results['copied_files'].append({
                            'source': source_path,
                            'destination': dest_path,
                            'participant': 'Não Agrupadas',
                            'reason': photo.get('reason', 'unknown')
                        })
                        results['summary']['total_copied'] += 1
                        
                        logger.info(f"Copied {file_name} to Não Agrupadas folder")
                        
                    except Exception as e:
                        error_msg = f"Error copying ungrouped {photo.get('file_name', 'Unknown')}: {str(e)}"
                        logger.error(error_msg)
                        results['errors'].append({
                            'photo': photo.get('file_name', 'Unknown'),
                            'error': error_msg
                        })
                        results['summary']['total_errors'] += 1
            
            # Final summary
            logger.info(f"Photo copying completed: {results['summary']['total_copied']} files copied, {results['summary']['total_errors']} errors")
            
            # Set success based on whether any files were copied
            results['success'] = results['summary']['total_copied'] > 0 or results['summary']['total_errors'] == 0
            
            return results
            
        except Exception as e:
            logger.error(f"Fatal error in photo copying: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _cleanup(self):
        """Clean up temporary files."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                import shutil
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temp directory: {self.temp_dir}")
            except Exception as e:
                logger.warning(f"Could not clean up temp directory: {str(e)}")

def main():
    """
    Command-line interface for PhotoLab processing.
    Expected usage: python main.py <config.json>
    """
    if len(sys.argv) != 2:
        print("Usage: python main.py <config.json>")
        print("\nConfig format:")
        print({
            "source_folder": "/path/to/photos",
            "participants": [
                {"name": "Ana Silva", "turma": "1A", "qrCode": "QR001"}
            ],
            "options": {
                "cache_results": True,
                "verbose": True
            }
        })
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    try:
        # Load configuration
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        # Progress callback for command line
        def progress_callback(progress_info):
            stage = progress_info.get('stage', 'processing')
            current = progress_info.get('current', 0)
            total = progress_info.get('total', 0)
            message = progress_info.get('message', '')
            
            if total > 0:
                percent = (current / total) * 100
                print(f"[{stage.upper()}] {percent:.1f}% - {message}")
            else:
                print(f"[{stage.upper()}] {message}")
        
        config['progress_callback'] = progress_callback
        
        # Initialize processor and run
        processor = PhotoLabProcessor()
        results = processor.process_photos(config)
        
        # Output results as JSON (separate from logs)
        print("==JSON_START==")
        print(json.dumps(results, indent=2))
        print("==JSON_END==")
        
        # Exit with appropriate code
        sys.exit(0 if results['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print("==JSON_START==")
        print(json.dumps(error_result, indent=2))
        print("==JSON_END==")
        sys.exit(1)

if __name__ == "__main__":
    main()
