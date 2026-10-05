import { Field, Muted, SectionHeader } from '@/components/ui';
import { isValidIsoDate, normalizePhone, PHONE, studioToday } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export type StudentValues = {
  name: string;
  dob: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  email: string;
};

export const EMPTY_STUDENT: StudentValues = { name: '', dob: '', phone: '', guardianName: '', guardianPhone: '', email: '' };

export type StudentRow = {
  full_name: string;
  date_of_birth: string;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  email: string | null;
};

export function toValues(row: StudentRow): StudentValues {
  return {
    name: row.full_name,
    dob: row.date_of_birth,
    phone: row.phone ?? '',
    guardianName: row.guardian_name ?? '',
    guardianPhone: row.guardian_phone ?? '',
    email: row.email ?? '',
  };
}

export function validateStudent(v: StudentValues): { error: string } | { row: StudentRow } {
  const phone = normalizePhone(v.phone);
  const guardianPhone = normalizePhone(v.guardianPhone);
  const guardianName = v.guardianName.trim() || null;

  if (!v.name.trim()) return { error: 'Enter the student’s name.' };
  if (!isValidIsoDate(v.dob)) return { error: 'Enter date of birth as YYYY-MM-DD, e.g. 2015-06-21.' };
  if (v.dob > studioToday()) return { error: 'Date of birth cannot be in the future.' };
  if (!phone && !guardianPhone) return { error: 'Enter the student’s phone or a guardian’s phone.' };
  if (phone && !PHONE.test(phone)) return { error: 'Student phone: enter 10 digits, or +country code and number.' };
  if (guardianPhone && !PHONE.test(guardianPhone)) return { error: 'Guardian phone: enter 10 digits, or +country code and number.' };
  if (!!guardianName !== !!guardianPhone) return { error: 'Enter both guardian name and guardian phone, or neither.' };

  return {
    row: {
      full_name: v.name.trim(),
      date_of_birth: v.dob,
      phone,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      email: v.email.trim() || null,
    },
  };
}

export type PhoneMatch = { id: number; student_number: number; full_name: string };

// Shared numbers are allowed (siblings), so callers only warn and ask for a second tap.
export async function findPhoneMatches(studioId: number, row: StudentRow, excludeId: number | null) {
  const phones = [row.phone, row.guardian_phone].filter((x): x is string => !!x);
  const [a, b] = await Promise.all([
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId).in('phone', phones),
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId).in('guardian_phone', phones),
  ]);
  const error = a.error ?? b.error;
  if (error) return { matches: [], error: error.message };
  const matches = [...(a.data as PhoneMatch[]), ...(b.data as PhoneMatch[])].filter(
    (m, i, all) => m.id !== excludeId && all.findIndex((x) => x.id === m.id) === i,
  );
  return { matches, error: null };
}

export function SharedPhoneNotice({ matches }: { matches: PhoneMatch[] }) {
  return (
    <Muted>
      This phone is already used by {matches.map((m) => `#${m.student_number} ${m.full_name}`).join(', ')}. If they are
      siblings, tap Save again to continue.
    </Muted>
  );
}

export function StudentFields({ values, onChange }: { values: StudentValues; onChange: (patch: Partial<StudentValues>) => void }) {
  return (
    <>
      <Field label="Full name" value={values.name} onChangeText={(name) => onChange({ name })} />
      <Field label="Date of birth" value={values.dob} onChangeText={(dob) => onChange({ dob })} placeholder="YYYY-MM-DD" />

      <SectionHeader>Contact</SectionHeader>
      <Muted>At least one phone is needed. Reminders go to the guardian if there is one.</Muted>
      <Field
        label="Student phone"
        value={values.phone}
        onChangeText={(phone) => onChange({ phone })}
        placeholder="10 digits"
        keyboardType="phone-pad"
      />
      <Field
        label="Guardian name"
        value={values.guardianName}
        onChangeText={(guardianName) => onChange({ guardianName })}
        placeholder="Optional"
      />
      <Field
        label="Guardian phone"
        value={values.guardianPhone}
        onChangeText={(guardianPhone) => onChange({ guardianPhone })}
        placeholder="10 digits"
        keyboardType="phone-pad"
      />
      <Field
        label="Email"
        value={values.email}
        onChangeText={(email) => onChange({ email })}
        placeholder="Optional"
        autoCapitalize="none"
        keyboardType="email-address"
      />
    </>
  );
}
