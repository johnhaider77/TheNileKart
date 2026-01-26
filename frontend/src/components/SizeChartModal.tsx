import React from 'react';
import './SizeChartModal.css';

interface SizeChartData {
  rows: number;
  columns: number;
  headers?: string[];
  data: string[][];
}

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart?: SizeChartData | null;
}

const SizeChartModal: React.FC<SizeChartModalProps> = ({ isOpen, onClose, sizeChart }) => {
  if (!isOpen) {
    console.log('📏 SizeChartModal: isOpen=false, not rendering');
    return null;
  }

  console.log('📏 SizeChartModal rendering:', { 
    isOpen, 
    sizeChartExists: !!sizeChart, 
    sizeChartData: sizeChart,
    hasData: (sizeChart?.data?.length ?? 0) > 0
  });

  if (!sizeChart || !sizeChart.data || sizeChart.data.length === 0) {
    console.warn('⚠️ Size chart is empty or invalid:', sizeChart);
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content size-chart-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Size Chart</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No size chart available for this product.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content size-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Size Chart</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="size-chart-container">
            <table className="size-chart-table">
              <thead>
                <tr>
                  {sizeChart.headers && sizeChart.headers.length > 0 ? (
                    sizeChart.headers.map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))
                  ) : (
                    Array.from({ length: sizeChart.columns }).map((_, idx) => (
                      <th key={idx}>Column {idx + 1}</th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {sizeChart.data.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeChartModal;
