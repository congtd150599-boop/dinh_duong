import type { AssessmentInput, ChildRecord, Gender, GuardianRelationship, MenuFilters, TuVan } from '@dinhduong/shared';
import { useMemo, useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../shared/ToastContext';
import { useCreatePatient } from '../../hooks/usePatients';
import { useSearchChildren } from '../../hooks/useChildren';
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
  /** Quick-entry contact for whichever parent the doctor is talking to right now — required unless the selected child already has a qualifying guardian (see selectedChildHasQualifyingGuardian). Full dual-parent detail (dob/address/the other parent) is filled in later via ChildHistoryPanel. */
  guardianRelationship: GuardianRelationship;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  tuvan: TuVan;
  weight: string;
  height: string;
  muac: string;
  labs: LabFormState;
  menuFilters: Required<MenuFilters>;
  /** Set when the doctor picked an existing child from the search dropdown below "Họ và tên" — cleared as soon as name/dob is edited again, so a new visit never silently attaches to the wrong child. */
  selectedChildId: string | null;
  /** From the selected child's search result — true means InputTab's guardian fields aren't required (someone already qualifies). Resets to false when selectedChildId is cleared. */
  selectedChildHasQualifyingGuardian: boolean;
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
  guardianRelationship: 'Mẹ',
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  tuvan: 'Có',
  weight: '',
  height: '',
  muac: '',
  labs: { ca: '', vitD: '', zn: '', hb: '', fe: '', ferritin: '', chol: '', tg: '' },
  menuFilters: initialMenuFilters,
  selectedChildId: null,
  selectedChildHasQualifyingGuardian: false,
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

/** true if the doctor started filling in the representative guardian but didn't finish all 3 fields (name+email+phone) — this is treated as a mistake, not "no guardian entered". */
function isGuardianPartiallyFilled(form: FormState): boolean {
  const filled = [form.guardianName.trim(), form.guardianEmail.trim(), form.guardianPhone.trim()].filter(Boolean).length;
  return filled > 0 && filled < 3;
}

/** A brand-new child (no selection) or an existing child that doesn't yet have anyone with both email+phone must provide the representative guardian before saving. */
function isGuardianRequired(form: FormState): boolean {
  return !form.selectedChildHasQualifyingGuardian;
}

function buildAssessmentInput(form: FormState): AssessmentInput | null {
  const weight = parseFloat(form.weight);
  const height = parseFloat(form.height);
  if (!form.name.trim() || !form.dob || !form.examDate || !weight || !height) return null;
  if (weight <= 0 || height <= 0) return null;

  const name = form.guardianName.trim();
  const email = form.guardianEmail.trim();
  const phone = form.guardianPhone.trim();
  const representativeGuardian = name && email && phone ? { relationship: form.guardianRelationship, name, email, phone } : null;

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
    representativeGuardian,
    menuFilters: form.menuFilters,
    childId: form.selectedChildId,
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
  const [nameFieldFocused, setNameFieldFocused] = useState(false);
  const { setActiveTab, setCurrentResult, setCurrentPatientId, setCurrentAssessmentInput } = useAppState();
  const { showToast } = useToast();
  const createPatient = useCreatePatient();
  const { results: childSuggestions } = useSearchChildren(form.selectedChildId ? '' : form.name);

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

  // Editing name/dob after a child was selected means the doctor no longer
  // means that exact record — clear the lock so save falls back to
  // find-or-create by name+dob instead of silently misattaching this visit,
  // and re-require guardian info since we no longer know if this "new" child qualifies.
  function handleNameChange(value: string) {
    setForm((f) => ({ ...f, name: value, selectedChildId: null, selectedChildHasQualifyingGuardian: false }));
  }
  function handleDobChange(value: string) {
    setForm((f) => ({ ...f, dob: value, selectedChildId: null, selectedChildHasQualifyingGuardian: false }));
  }
  function handleSelectChild(child: ChildRecord) {
    setForm((f) => ({
      ...f,
      name: child.name,
      dob: child.dob.slice(0, 10),
      gender: child.gender,
      selectedChildId: child.id,
      selectedChildHasQualifyingGuardian: child.hasQualifyingGuardian,
    }));
    setNameFieldFocused(false);
  }

  const guardianRequired = isGuardianRequired(form);

  function handleViewResult() {
    if (!result) {
      showToast('Vui lòng nhập đầy đủ: họ tên, ngày sinh, ngày khám, cân nặng và chiều cao!', 'error');
      return;
    }
    setCurrentResult(result);
    setCurrentPatientId(null); // live preview, not yet saved
    setCurrentAssessmentInput(assessmentInput); // lets ResultTab's own "Lưu hồ sơ" reuse this exact payload (incl. childId/representativeGuardian)
    setActiveTab('result');
  }

  function handleSave() {
    if (!assessmentInput) {
      showToast('Vui lòng nhập đầy đủ thông tin bệnh nhân trước khi lưu!', 'error');
      return;
    }
    if (isGuardianPartiallyFilled(form)) {
      showToast('Vui lòng điền đủ cả Họ tên, Email và SĐT của người đại diện (hoặc để trống cả 3 nếu chưa có).', 'error');
      return;
    }
    if (guardianRequired && !assessmentInput.representativeGuardian) {
      showToast('Cần nhập người đại diện (Bố hoặc Mẹ) — bắt buộc có Họ tên, Email và Số điện thoại.', 'error');
      return;
    }
    createPatient.mutate(assessmentInput, {
      onSuccess: (patient) => {
        setCurrentResult(patient.fullResult);
        setCurrentPatientId(patient.id);
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
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">
              Họ và tên<span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setNameFieldFocused(true)}
              onBlur={() => setNameFieldFocused(false)}
            />
            {form.selectedChildId ? (
              <div className="form-hint" style={{ color: 'var(--success)' }}>
                ✓ Đã chọn hồ sơ trẻ có sẵn — lần khám này sẽ được gộp vào lịch sử của trẻ này.{' '}
                <button
                  type="button"
                  onClick={() => update('selectedChildId', null)}
                  style={{ border: 'none', background: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Bỏ chọn
                </button>
              </div>
            ) : (
              nameFieldFocused &&
              childSuggestions.length > 0 && (
                <div
                  className="card"
                  style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}
                >
                  {childSuggestions.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectChild(child)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--card)',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <strong>{child.name}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>
                        · {child.gender} · sinh {child.dob.slice(0, 10)}
                        {child.lastExamDate && ` · khám gần nhất ${child.lastExamDate.slice(0, 10)}`}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Ngày sinh<span className="required">*</span>
              </label>
              <input type="date" className="form-control" value={form.dob} onChange={(e) => handleDobChange(e.target.value)} />
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
            <label className="form-label">
              Người đại diện{guardianRequired && <span className="required">*</span>}
            </label>
            <SegmentedControl
              options={[
                { value: 'Bố' as GuardianRelationship, label: 'Bố' },
                { value: 'Mẹ' as GuardianRelationship, label: 'Mẹ' },
              ]}
              value={form.guardianRelationship}
              onChange={(v) => update('guardianRelationship', v)}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Họ tên người đại diện"
              value={form.guardianName}
              onChange={(e) => update('guardianName', e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                placeholder="Email người đại diện"
                value={form.guardianEmail}
                onChange={(e) => update('guardianEmail', e.target.value)}
              />
            </div>
            <div className="form-group">
              <input
                type="tel"
                className="form-control"
                placeholder="SĐT người đại diện"
                value={form.guardianPhone}
                onChange={(e) => update('guardianPhone', e.target.value)}
              />
            </div>
          </div>
          <div className="form-hint" style={{ marginTop: -8, marginBottom: 16 }}>
            {guardianRequired
              ? 'Bắt buộc — trẻ này chưa có ai đủ điều kiện liên hệ (họ tên + email + SĐT). Chỉ cần 1 người, có thể bổ sung người còn lại/ngày sinh/địa chỉ sau ở tab Nhật Ký BN → Lịch sử.'
              : 'Đã có người đại diện đủ điều kiện — không cần nhập lại. Để trống, hoặc điền để cập nhật thông tin mới nhất.'}
          </div>
          {isGuardianPartiallyFilled(form) && (
            <InfoBox tone="warn">Cần điền đủ cả Họ tên, Email và SĐT của người đại diện, hoặc để trống cả 3.</InfoBox>
          )}
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
            <LabField label="Cholesterol toàn phần (mmol/L)" hint="Ranh giới: ≥4.4 | Tăng: ≥5.2 mmol/L" placeholder="BT: <4.4" value={form.labs.chol} onChange={(v) => updateLab('chol', v)} />
            <LabField label="Triglycerid (mmol/L)" hint="Trẻ <10t: <1.13 | Trẻ ≥10t: <1.47 mmol/L" placeholder="BT: <1.13" value={form.labs.tg} onChange={(v) => updateLab('tg', v)} />
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
