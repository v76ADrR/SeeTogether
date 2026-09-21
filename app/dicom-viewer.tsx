import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Disc, Box, LayoutGrid } from 'lucide-react';
import type { SessionFile } from './upload-session';

interface DicomViewerProps {
  sessionFiles: SessionFile[];
}

export function DicomViewer({ sessionFiles }: DicomViewerProps) {
  const [layout, setLayout] = useState<'stack' | 'mpr'>('stack');
  const [activePreset, setActivePreset] = useState<string>('soft-tissue');

  const mediaFiles = sessionFiles.filter(f => f.category === 'media' || f.name.endsWith('.dcm') || f.name.endsWith('.zip'));

  return (
    <div className="glass" style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#ffffffeb', color: '#26313c', border: '1px solid #18253612' }}>
      {/* Sidebar Series Browser */}
      <div style={{ width: '260px', borderRight: '1px solid #18253612', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#65717e', textTransform: 'uppercase', margin: 0 }}>Series Browser</h2>
          <Badge variant="outline" style={{ fontSize: '10px', padding: '0 5px' }}>
            {sessionFiles.length} {sessionFiles.length === 1 ? 'file' : 'files'}
          </Badge>
        </div>

        {sessionFiles.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#788694', lineHeight: 1.5, background: '#18253606', padding: '12px', borderRadius: '8px', border: '1px dashed #18253618' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: '#263b48', marginBottom: '4px' }}>
              <Disc size={14} /> No media staged
            </div>
            Drop DICOM (<code>.dcm</code>), archives (<code>.zip</code>), or clinical documents into the <b>Upload Session</b> dock below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sessionFiles.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#ffffffc4',
                  border: '1px solid #18253610',
                  borderRadius: '6px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ fontWeight: 500, color: '#26313c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: '10px', color: '#788694', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'uppercase' }}>{f.category}</span>
                  <span>{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Viewport Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', padding: '10px 16px', gap: '8px', borderBottom: '1px solid #18253612', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('stack')}
            style={layout === 'stack' ? { background: '#263b4812', color: '#263b48', fontWeight: 600 } : { color: '#65717e' }}
          >
            <Layers size={14} style={{ marginRight: '5px' }} /> Stack (Axial)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('mpr')}
            style={layout === 'mpr' ? { background: '#263b4812', color: '#263b48', fontWeight: 600 } : { color: '#65717e' }}
          >
            <LayoutGrid size={14} style={{ marginRight: '5px' }} /> MPR (3-Plane)
          </Button>

          <div style={{ width: '1px', background: '#18253612', margin: '0 4px', height: '20px' }} />

          <Button
            variant="ghost"
            size="sm"
            style={activePreset === 'soft-tissue' ? { background: '#263b4812', color: '#263b48', fontWeight: 600 } : { color: '#65717e' }}
            onClick={() => setActivePreset('soft-tissue')}
          >
            Soft Tissue
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={activePreset === 'brain' ? { background: '#263b4812', color: '#263b48', fontWeight: 600 } : { color: '#65717e' }}
            onClick={() => setActivePreset('brain')}
          >
            Brain
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={activePreset === 'bone' ? { background: '#263b4812', color: '#263b48', fontWeight: 600 } : { color: '#65717e' }}
            onClick={() => setActivePreset('bone')}
          >
            Bone
          </Button>
        </div>

        {/* Quiet dark canvas viewport placeholder */}
        <div style={{ flex: 1, display: 'flex', padding: '4px', gap: '4px', backgroundColor: '#0b1218', position: 'relative' }}>
          {layout === 'stack' ? (
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#788694', gap: '10px' }}>
              <Box size={32} style={{ color: '#458a85', opacity: 0.8 }} />
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#d0d8e0' }}>DICOM Imaging Viewport (Axial)</div>
              <div style={{ fontSize: '11px', maxWidth: '360px', textAlign: 'center', color: '#687786' }}>
                Cornerstone3D pipeline placeholder. When full Cornerstone libraries are linked, DICOM series and multi-slice stacks will render here.
              </div>
              {mediaFiles.length > 0 && (
                <div style={{ fontSize: '11px', color: '#458a85', marginTop: '6px', background: '#458a8515', padding: '4px 10px', borderRadius: '4px', border: '1px solid #458a8530' }}>
                  {mediaFiles.length} media file(s) staged in memory
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', height: '100%' }}>
              <div style={{ background: '#0f171e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#458a85', fontWeight: 600 }}>AXIAL</span>
                <span style={{ fontSize: '10px', color: '#556575' }}>Transverse plane</span>
              </div>
              <div style={{ background: '#0f171e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#458a85', fontWeight: 600 }}>SAGITTAL</span>
                <span style={{ fontSize: '10px', color: '#556575' }}>Lateral plane</span>
              </div>
              <div style={{ background: '#0f171e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#458a85', fontWeight: 600 }}>CORONAL</span>
                <span style={{ fontSize: '10px', color: '#556575' }}>Frontal plane</span>
              </div>
              <div style={{ background: '#0f171e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#458a85', fontWeight: 600 }}>3D MIP / VOLUME</span>
                <span style={{ fontSize: '10px', color: '#556575' }}>Raycasting stub</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DicomViewer;
