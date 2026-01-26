import React, { useState } from 'react';
import './SizeChartBuilder.css';

interface SizeChartData {
  rows: number;
  columns: number;
  headers?: string[];
  data: string[][];
}

interface SizeChartBuilderProps {
  initialData?: SizeChartData | null;
  onSave: (sizeChart: SizeChartData) => void;
  onCancel: () => void;
}

const SizeChartBuilder: React.FC<SizeChartBuilderProps> = ({ initialData, onSave, onCancel }) => {
  const [step, setStep] = useState<'dimensions' | 'data'>('dimensions');
  const [rows, setRows] = useState(initialData?.rows || 1);
  const [columns, setColumns] = useState(initialData?.columns || 1);
  const [headers, setHeaders] = useState<string[]>(initialData?.headers || []);
  const [data, setData] = useState<string[][]>(
    initialData?.data || Array(initialData?.rows || 1).fill(null).map(() => Array(initialData?.columns || 1).fill(''))
  );

  const handleDimensionsSubmit = () => {
    if (rows < 1 || columns < 1) {
      alert('Rows and columns must be at least 1');
      return;
    }

    // Initialize or resize data array
    const newData: string[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < columns; j++) {
        // Preserve existing data if it exists
        row.push(data[i]?.[j] || '');
      }
      newData.push(row);
    }
    setData(newData);

    // Initialize headers if empty
    if (headers.length === 0) {
      setHeaders(Array(columns).fill('').map((_, i) => `Column ${i + 1}`));
    } else if (headers.length !== columns) {
      // Adjust headers to match columns
      const newHeaders = [...headers];
      while (newHeaders.length < columns) {
        newHeaders.push(`Column ${newHeaders.length + 1}`);
      }
      setHeaders(newHeaders.slice(0, columns));
    }

    setStep('data');
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newData = data.map((r, i) =>
      i === rowIdx ? r.map((c, j) => (j === colIdx ? value : c)) : r
    );
    setData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIdx] = value;
    setHeaders(newHeaders);
  };

  const handleSave = () => {
    if (data.some(row => row.some(cell => cell.trim() === ''))) {
      alert('Please fill in all cells in the size chart');
      return;
    }

    onSave({
      rows,
      columns,
      headers: headers.filter(h => h.trim() !== ''),
      data
    });
  };

  if (step === 'dimensions') {
    return (
      <div className="size-chart-builder">
        <h3 className="builder-title">Create Size Chart</h3>
        <p className="builder-subtitle">Step 1: Define table dimensions</p>

        <div className="dimension-inputs">
          <div className="input-group">
            <label htmlFor="rows">Number of Rows *</label>
            <input
              id="rows"
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field"
              placeholder="Number of rows"
            />
            <small>How many rows (data entries) do you need?</small>
          </div>

          <div className="input-group">
            <label htmlFor="columns">Number of Columns *</label>
            <input
              id="columns"
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field"
              placeholder="Number of columns"
            />
            <small>How many columns (fields) do you need?</small>
          </div>
        </div>

        <div className="builder-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleDimensionsSubmit}>
            Next: Fill Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="size-chart-builder">
      <h3 className="builder-title">Create Size Chart</h3>
      <p className="builder-subtitle">Step 2: Fill in the data</p>

      <div className="data-input-section">
        <div className="headers-row">
          <label className="headers-label">Column Headers (Optional)</label>
          <div className="headers-inputs">
            {headers.map((header, idx) => (
              <input
                key={`header-${idx}`}
                type="text"
                value={header}
                onChange={(e) => handleHeaderChange(idx, e.target.value)}
                className="header-input"
                placeholder={`Header ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="data-table">
          <table className="chart-preview-table">
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={`th-${idx}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr key={`row-${rowIdx}`}>
                  {row.map((cell, colIdx) => (
                    <td key={`cell-${rowIdx}-${colIdx}`}>
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        className="cell-input"
                        placeholder={`Row ${rowIdx + 1}, Col ${colIdx + 1}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-info">
          <p>
            <strong>Table Info:</strong> {rows} rows × {columns} columns
          </p>
        </div>
      </div>

      <div className="builder-actions">
        <button className="btn btn-secondary" onClick={() => setStep('dimensions')}>
          Back: Change Dimensions
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Size Chart
        </button>
      </div>
    </div>
  );
};

export default SizeChartBuilder;
