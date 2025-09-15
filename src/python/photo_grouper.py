#!/usr/bin/env python3
"""
PhotoLab Photo Grouper

Groups photos based on QR code detection results and temporal proximity.
Implements the sequential grouping algorithm from project_rules.md.
"""

import json
import sys
import os
from pathlib import Path
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class PhotoGroup:
    """Represents a group of photos for a single participant."""
    qr_code: str
    participant_name: str = ""
    photos: List[Dict[str, Any]] = None
    confidence_score: float = 0.0
    
    def __post_init__(self):
        if self.photos is None:
            self.photos = []
    
    def add_photo(self, photo_info):
        """Add a photo to this group."""
        self.photos.append(photo_info)
    
    def get_photo_count(self):
        """Get number of photos in this group."""
        return len(self.photos)
    
    def get_time_span(self):
        """Get time span of photos in this group."""
        if len(self.photos) < 2:
            return 0
        
        times = [photo['modified_time'] for photo in self.photos]
        return max(times) - min(times)

class PhotoGrouper:
    """
    Groups photos based on QR code detection and temporal sequence.
    """
    
    def __init__(self, participants_data):
        """
        Initialize grouper with participant information.
        
        Args:
            participants_data (list): List of participant dicts with name, turma, qrCode
        """
        self.participants = {p['qrCode']: p for p in participants_data}
        self.groups = {}
        self.ungrouped_photos = []
        
    def group_photos(self, detection_results):
        """
        Group photos based on QR detection results and temporal sequence.
        
        Args:
            detection_results (list): Results from QR detection
            
        Returns:
            dict: Grouped photos with statistics
        """
        try:
            logger.info(f"Grouping {len(detection_results)} photos...")
            
            # Sort photos by modified time (temporal sequence)
            sorted_photos = sorted(detection_results, key=lambda x: x['modified_time'])
            
            # Process photos sequentially
            current_group = None
            
            for photo in sorted_photos:
                if photo['found'] and photo['code']:
                    # Photo has QR code - start new group or continue existing
                    qr_code = photo['code']
                    
                    if qr_code in self.participants:
                        # Valid QR code from participant list
                        if current_group is None or current_group.qr_code != qr_code:
                            # Start new group
                            current_group = self._create_group(qr_code)
                        
                        current_group.add_photo(photo)
                        
                    else:
                        # QR code not in participant list
                        logger.warning(f"Unknown QR code detected: {qr_code}")
                        self.ungrouped_photos.append({
                            **photo,
                            'reason': 'unknown_qr_code'
                        })
                        current_group = None
                
                else:
                    # Photo without QR code
                    if current_group is not None:
                        # Add to current group (sequential logic)
                        current_group.add_photo(photo)
                    else:
                        # No current group - add to ungrouped
                        self.ungrouped_photos.append({
                            **photo,
                            'reason': 'no_qr_detected'
                        })
            
            # Calculate confidence scores
            self._calculate_confidence_scores()
            
            # Generate statistics
            stats = self._generate_statistics()
            
            logger.info(f"Grouping complete. {len(self.groups)} groups created.")
            
            return {
                'success': True,
                'groups': self._serialize_groups(),
                'ungrouped_photos': self.ungrouped_photos,
                'statistics': stats
            }
            
        except Exception as e:
            logger.error(f"Error grouping photos: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_group(self, qr_code):
        """Create a new photo group for a QR code."""
        participant = self.participants.get(qr_code, {})
        
        group = PhotoGroup(
            qr_code=qr_code,
            participant_name=participant.get('name', 'Unknown')
        )
        
        self.groups[qr_code] = group
        return group
    
    def _calculate_confidence_scores(self):
        """Calculate confidence scores for each group."""
        for group in self.groups.values():
            if group.get_photo_count() == 0:
                group.confidence_score = 0.0
                continue
            
            # Count photos with QR detection
            detected_count = len([p for p in group.photos if p['found']])
            total_count = group.get_photo_count()
            
            # Base confidence on detection ratio
            detection_ratio = detected_count / total_count
            
            # Adjust for group size (larger groups more confident)
            size_factor = min(1.0, total_count / 10.0)  # Cap at 10 photos
            
            # Adjust for time span (reasonable time spans more confident)
            time_span = group.get_time_span()
            time_factor = 1.0
            if time_span > 3600:  # More than 1 hour seems unlikely
                time_factor = 0.8
            elif time_span > 7200:  # More than 2 hours very unlikely
                time_factor = 0.6
            
            group.confidence_score = detection_ratio * size_factor * time_factor
    
    def _generate_statistics(self):
        """Generate grouping statistics."""
        total_photos = sum(group.get_photo_count() for group in self.groups.values()) + len(self.ungrouped_photos)
        grouped_photos = sum(group.get_photo_count() for group in self.groups.values())
        
        # Participants with photos
        participants_with_photos = len([g for g in self.groups.values() if g.get_photo_count() > 0])
        participants_without_photos = len(self.participants) - participants_with_photos
        
        # Group size distribution
        group_sizes = [group.get_photo_count() for group in self.groups.values() if group.get_photo_count() > 0]
        avg_group_size = sum(group_sizes) / len(group_sizes) if group_sizes else 0
        
        return {
            'total_photos': total_photos,
            'grouped_photos': grouped_photos,
            'ungrouped_photos': len(self.ungrouped_photos),
            'grouping_success_rate': (grouped_photos / total_photos * 100) if total_photos > 0 else 0,
            'total_participants': len(self.participants),
            'participants_with_photos': participants_with_photos,
            'participants_without_photos': participants_without_photos,
            'total_groups': len([g for g in self.groups.values() if g.get_photo_count() > 0]),
            'average_group_size': avg_group_size,
            'largest_group_size': max(group_sizes) if group_sizes else 0
        }
    
    def _serialize_groups(self):
        """Convert groups to serializable format."""
        return {
            qr_code: {
                'qr_code': group.qr_code,
                'participant_name': group.participant_name,
                'participant_info': self.participants.get(qr_code, {}),
                'photo_count': group.get_photo_count(),
                'confidence_score': group.confidence_score,
                'time_span_seconds': group.get_time_span(),
                'photos': group.photos
            }
            for qr_code, group in self.groups.items()
            if group.get_photo_count() > 0
        }
    
    def get_manual_correction_suggestions(self):
        """
        Generate suggestions for manual correction.
        
        Returns:
            dict: Suggestions for improving grouping
        """
        suggestions = {
            'low_confidence_groups': [],
            'ungrouped_with_qr': [],
            'large_gaps': [],
            'oversized_groups': []
        }
        
        # Low confidence groups
        for qr_code, group in self.groups.items():
            if group.confidence_score < 0.5 and group.get_photo_count() > 0:
                suggestions['low_confidence_groups'].append({
                    'qr_code': qr_code,
                    'participant_name': group.participant_name,
                    'confidence': group.confidence_score,
                    'photo_count': group.get_photo_count()
                })
        
        # Ungrouped photos with QR codes
        for photo in self.ungrouped_photos:
            if photo['found'] and photo['code']:
                suggestions['ungrouped_with_qr'].append({
                    'file_name': photo['file_name'],
                    'detected_qr': photo['code'],
                    'reason': photo.get('reason', 'unknown')
                })
        
        # Oversized groups (might need splitting)
        for qr_code, group in self.groups.items():
            if group.get_photo_count() > 50:  # Arbitrary threshold
                suggestions['oversized_groups'].append({
                    'qr_code': qr_code,
                    'participant_name': group.participant_name,
                    'photo_count': group.get_photo_count(),
                    'time_span_hours': group.get_time_span() / 3600
                })
        
        return suggestions

def main():
    """
    Command-line interface for photo grouping.
    Expected usage: python photo_grouper.py <detection_results.json> <participants.json>
    """
    if len(sys.argv) != 3:
        print("Usage: python photo_grouper.py <detection_results.json> <participants.json>")
        sys.exit(1)
    
    detection_file = sys.argv[1]
    participants_file = sys.argv[2]
    
    try:
        # Load detection results
        with open(detection_file, 'r') as f:
            detection_data = json.load(f)
        
        detection_results = detection_data.get('results', [])
        
        # Load participants
        with open(participants_file, 'r') as f:
            participants_data = json.load(f)
        
        # Group photos
        grouper = PhotoGrouper(participants_data)
        result = grouper.group_photos(detection_results)
        
        # Add suggestions
        result['suggestions'] = grouper.get_manual_correction_suggestions()
        
        # Output results
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
