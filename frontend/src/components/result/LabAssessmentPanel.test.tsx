import type { LabResult } from '@dinhduong/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LabAssessmentPanel } from './LabAssessmentPanel';

const labs: LabResult[] = [
  {
    name: 'Calci toàn phần',
    icon: '🦴',
    value: 1.9,
    unit: 'mmol/L',
    normal: '2.1–2.6',
    status: 'deficit',
    diagnosis: 'Thiếu Calci (hạ calci huyết)',
    recommendation: 'Bổ sung Calci.',
  },
  {
    name: 'Cholesterol toàn phần',
    icon: '💛',
    value: 210,
    unit: 'mg/dL',
    normal: '<170',
    status: 'excess',
    diagnosis: 'Tăng Cholesterol (≥200 mg/dL)',
    recommendation: 'Giảm béo bão hòa.',
  },
  {
    name: 'Kẽm huyết thanh',
    icon: '⚗️',
    value: 15,
    unit: 'µmol/L',
    normal: '10.7–20.0',
    status: 'ok',
    diagnosis: 'Bình thường',
    recommendation: '',
  },
];

describe('LabAssessmentPanel', () => {
  it('renders one row per lab with the correct status class applied', () => {
    const { container } = render(<LabAssessmentPanel labs={labs} />);

    expect(screen.getByText('Calci toàn phần')).toBeInTheDocument();
    expect(screen.getByText('Thiếu Calci (hạ calci huyết)')).toBeInTheDocument();
    expect(screen.getByText('Tăng Cholesterol (≥200 mg/dL)')).toBeInTheDocument();

    expect(container.querySelector('.micro-item.deficit')).not.toBeNull();
    expect(container.querySelector('.micro-item.excess')).not.toBeNull();
    expect(container.querySelector('.micro-item.ok')).not.toBeNull();
  });

  it('renders nothing when there are no labs', () => {
    const { container } = render(<LabAssessmentPanel labs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
