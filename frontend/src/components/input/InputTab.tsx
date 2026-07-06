import type { AssessmentInput, Gender, MenuFilters, TuVan } from '@dinhduong/shared';
import { useMemo, useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../shared/ToastContext';
import { useCreatePatient } from '../../hooks/usePatients';
import { useDebouncedAssessment } from '../../hooks/useDebouncedAssessment';
import { computeAgeDisplay } from '../../utils/age-display';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { SegmentedControl } from '../shared/SegmentedControl';
import { EnergyPreviewPanel } from './EnergyPreviewPanel';
import { LivePreviewPanel } from './LivePreviewPanel';
import { WhoComparePanel } from './WhoComparePanel';

interface LabFormState {
  ca: string;
  vitD: string;
  zn: string;
  hb: string;
  fe: string;
  ferritin: string;
  chol: string;
  tg: string;
}

interface FormState {
  name: string;
  dob: string;
  examDate: string;
  gender: Gender;
  revisit: string;
  guardianEmail: string;
  tuvan: TuVan;
  weight: string;
  height: string;
  muac: string;
  labs: LabFormState;
  menuFilters: Required<MenuFilters>;
}

const today = new Date().toISOString().slice(0, 10);

const initialMenuFilters: Required<MenuFilters> = {
  noSeafood: false,
  noEgg: false,
  noDairy: false,
  noPeanutNuts: false,
  vegetarian: false,
  noPork: false,
  noBeef: false,
};

const initialForm: FormState = {
  name: '',
  dob: '',
  examDate: today,
  gender: 'Nam',
  revisit: '',
  guardianEmail: '',
  tuvan: 'Có',
  weight: '',
  height: '',
  muac: '',
  labs: { ca: '', vitD: '', zn: '', hb: '', fe: '', ferritin: '', chol: '', tg: '' },
  menuFilters: initialMenuFilters,
};

const MENU_FILTER_OPTIONS: { key: keyof MenuFilters; label: string }[] = [
  { key: 'vegetarian', label: '🥦 Ăn chay (không thịt/cá/hải sản)' },
  { key: 'noSeafood', label: '🦐 Không hải sản' },
  { key: 'noEgg', label: '🥚 Không trứng' },
  { key: 'noDairy', label: '🥛 Không sữa/chế phẩm sữa' },
  { key: 'noPeanutNuts', label: '🥜 Không đậu phộng/hạt' },
  { key: 'noPork', label: '🚫🐖 Không thịt heo' },
  { key: 'noBeef', label: '🚫🐄 Không thịt bò' },
];

function toNullableNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function toNullableString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function buildAssessmentInput(form: FormState): AssessmentInput | null {
  const weight = parseFloat(form.weight);
  const height = parseFloat(form.height);
  if (!form.name.trim() || !form.dob || !form.examDate || !weight || !height) return null;
  if (weight <= 0 || height <= 0) return null;

  return {
    name: form.name.trim(),
    dob: form.dob,
    examDate: form.examDate,
    weight,
    height,
    muac: toNullableNumber(form.muac),
    gender: form.gender,
    tuvan: form.tuvan,
    revisit: form.revisit || null,
    guardianEmail: toNullableString(form.guardianEmail),
    menuFilters: form.menuFilters,
    labs: {
      ca: toNullableNumber(form.labs.ca),
      vitD: toNullableNumber(form.labs.vitD),
      zn: toNullableNumber(form.labs.zn),
      hb: toNullableNumber(form.labs.hb),
      fe: toNullableNumber(form.labs.fe),
      ferritin: toNullableNumber(form.labs.ferritin),
      chol: toNullableNumber(form.labs.chol),
      tg: toNullableNumber(form.labs.tg),
    },
  };
}

export function InputTab() {
  const [form, setForm] = useState<FormState>(initialForm);
  const { setActiveTab, setCurrentResult } = useAppState();
  const { showToast } = useToast();
  const createPatient = useCreatePatient();

  const assessmentInput = useMemo(() => buildAssessmentInput(form), [form]);
  const { result, isLoading } = useDebouncedAssessment(assessmentInput);
  const ageDisplay = computeAgeDisplay(form.dob, form.examDate);
  const bmiPreview =
    form.weight && form.height ? (parseFloat(form.weight) / (parseFloat(form.height) / 100) ** 2).toFixed(1) : '';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function updateLab<K extends keyof LabFormState>(key: K, value: string) {
    setForm((f) => ({ ...f, labs: { ...f.labs, [key]: value } }));
  }
  function updateMenuFilter(key: keyof MenuFilters, value: boolean) {
    setForm((f) => ({ ...f, menuFilters: { ...f.menuFilters, [key]: value } }));
  }

  function handleViewResult() {
    if (!result) {
      showToast('Vui lòng nhập đầy đủ: họ tên, ngày sinh, ngày khám, cân nặng và chiều cao!', 'error');
      return;
    }
    setCurrentResult(result);
    setActiveTab('result');
  }

  function handleSave() {
    if (!assessmentInput) {
      showToast('Vui lòng nhập đầy đủ thông tin bệnh nhân trước khi lưu!', 'error');
      return;
    }
    createPatient.mutate(assessmentInput, {
      onSuccess: (patient) => {
        setCurrentResult(patient.fullResult);
        showToast(`✅ Đã lưu hồ sơ bệnh nhân "${patient.name}" vào nhật ký!`, 'success');
      },
      onError: () => showToast('Lỗi khi lưu hồ sơ. Vui lòng thử lại.', 'error'),
    });
  }

  return (
    <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
      {/* LEFT: PATIENT INFO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card icon="👤" iconBg="#E8F5E9" title="A. Thông Tin Bệnh Nhân">
          <div className="form-group">
            <label className="form-label">
              Họ và tên<span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Ngày sinh<span className="required">*</span>
              </label>
              <input type="date" className="form-control" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Ngày khám<span className="required">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={form.examDate}
                onChange={(e) => update('examDate', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tuổi (tự động tính)</label>
            <input
              type="text"
              className="form-control computed"
              readOnly
              placeholder="Nhập ngày sinh và ngày khám..."
              value={ageDisplay?.text ?? ''}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Giới tính<span className="required">*</span>
            </label>
            <SegmentedControl
              options={[
                { value: 'Nam' as Gender, label: '♂ Nam' },
                { value: 'Nữ' as Gender, label: '♀ Nữ' },
              ]}
              value={form.gender}
              onChange={(v) => update('gender', v)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ngày tái khám</label>
            <input type="date" className="form-control" value={form.revisit} onChange={(e) => update('revisit', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email phụ huynh (để nhắc lịch tái khám)</label>
            <input
              type="email"
              className="form-control"
              placeholder="phuhuynh@email.com"
              value={form.guardianEmail}
              onChange={(e) => update('guardianEmail', e.target.value)}
            />
            <div className="form-hint">Tùy chọn — hệ thống tự gửi email nhắc trước ngày tái khám nếu có địa chỉ này.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Tư vấn dinh dưỡng</label>
            <SegmentedControl
              options={[
                { value: 'Có' as TuVan, label: '✅ Có' },
                { value: 'Không' as TuVan, label: '❌ Không' },
              ]}
              value={form.tuvan}
              onChange={(v) => update('tuvan', v)}
            />
          </div>
        </Card>

        <Card icon="📏" iconBg="#E3F2FD" title="B. Chỉ Số Nhân Trắc">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Cân nặng (kg)<span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                placeholder="VD: 15.5"
                value={form.weight}
                onChange={(e) => update('weight', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Chiều cao (cm)<span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                placeholder="VD: 95.0"
                value={form.height}
                onChange={(e) => update('height', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Vòng cánh tay (MUAC, cm)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              placeholder="VD: 13.5"
              value={form.muac}
              onChange={(e) => update('muac', e.target.value)}
            />
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">BMI</label>
              <input type="text" className="form-control computed" readOnly value={bmiPreview} />
            </div>
            <div className="form-group">
              <label className="form-label">Tuổi (tháng)</label>
              <input type="text" className="form-control computed" readOnly value={ageDisplay ? `${ageDisplay.totalMonths} tháng` : ''} />
            </div>
          </div>
        </Card>

        <Card icon="🧪" iconBg="#FFF8E1" title="H. Xét Nghiệm Vi Chất (Tùy chọn)">
          <InfoBox tone="info">Nhập kết quả xét nghiệm để hệ thống tự động đánh giá thiếu hụt vi chất và đề xuất bổ sung phù hợp.</InfoBox>
          <div className="grid-2">
            <LabField label="Calci toàn phần (mmol/L)" hint="Bình thường: 2.1 – 2.6 mmol/L" placeholder="BT: 2.1–2.6" value={form.labs.ca} onChange={(v) => updateLab('ca', v)} />
            <LabField label="Vitamin D 25(OH)D (ng/mL)" hint="Thiếu nặng: <12 | Thiếu nhẹ: 12–20" placeholder="BT: >20" value={form.labs.vitD} onChange={(v) => updateLab('vitD', v)} />
            <LabField label="Kẽm huyết thanh (µmol/L)" hint="Bình thường: 10.7 – 20.0 µmol/L" placeholder="BT: >10.7" value={form.labs.zn} onChange={(v) => updateLab('zn', v)} />
            <LabField label="Hemoglobin Hb (g/L)" hint="Ngưỡng thiếu máu theo tuổi" placeholder="BT: 110–160" value={form.labs.hb} onChange={(v) => updateLab('hb', v)} />
            <LabField label="Sắt huyết thanh (µmol/L)" hint="Bình thường: 11.0 – 27.0 µmol/L" placeholder="BT: 11–27" value={form.labs.fe} onChange={(v) => updateLab('fe', v)} />
            <LabField label="Ferritin (ng/mL)" hint="Trẻ ≤5t: <12 | Trẻ >5t: <15" placeholder="BT: >12" value={form.labs.ferritin} onChange={(v) => updateLab('ferritin', v)} />
            <LabField label="Cholesterol toàn phần (mg/dL)" hint="Tăng: ≥200 mg/dL" placeholder="BT: <170" value={form.labs.chol} onChange={(v) => updateLab('chol', v)} />
            <LabField label="Triglycerid (mg/dL)" hint="Trẻ <10t: <100 | Trẻ ≥10t: <130" placeholder="BT: <100" value={form.labs.tg} onChange={(v) => updateLab('tg', v)} />
          </div>
        </Card>

        <Card icon="🥗" iconBg="#E8F5E9" title="I. Lọc Thực Đơn (Tùy chọn)">
          <InfoBox tone="info">
            Món không phù hợp sẽ được thay bằng món khác cùng bữa trong thực đơn mẫu; nếu cả tuần không còn món phù hợp, hệ thống dùng món
            trung tính an toàn (cơm + đậu phụ + rau).
          </InfoBox>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {MENU_FILTER_OPTIONS.map((opt) => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.menuFilters[opt.key]}
                  onChange={(e) => updateMenuFilter(opt.key, e.target.checked)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT: STATUS + ACTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <LivePreviewPanel result={result} hasEnoughInput={!!assessmentInput} />
        <WhoComparePanel result={result} />
        <EnergyPreviewPanel result={result} />

        <button className="btn-primary" style={{ fontSize: 16, padding: 16 }} onClick={handleSave} disabled={createPatient.isPending}>
          💾 {createPatient.isPending ? 'Đang lưu...' : 'Lưu Hồ Sơ & Ghi Nhật Ký'}
        </button>
        <button className="btn-secondary" style={{ textAlign: 'center' }} onClick={handleViewResult} disabled={isLoading}>
          📊 Xem Báo Cáo Chi Tiết →
        </button>
      </div>
    </div>
  );
}

function LabField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input type="number" step="0.01" className="form-control" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="form-hint">{hint}</div>
    </div>
  );
}
