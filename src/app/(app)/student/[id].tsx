import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  findPhoneMatches,
  SharedPhoneNotice,
  StudentFields,
  toValues,
  validateStudent,
  type PhoneMatch,
  type StudentRow,
  type StudentValues,
} from '@/components/student-form';
import { Badge, Button, Card, Choices, ErrorText, Field, Muted, Row, SectionHeader, Spinner, Title } from '@/components/ui';
import { isValidIsoDate, PAYMENT_METHODS, rupees, shortDate, statusInfo, studioToday, WHOLE_NUMBER } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type Membership = {
  id: number;
  status: string;
  lifecycle: 'pending_activation' | 'activated' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  amount_due_rupees: number;
  outstanding_rupees: number;
  batches: string[];
};

async function fetchMemberships(studentId: number) {
  const m = await supabase
    .from('membership_overview')
    .select('id, status, lifecycle, start_date, end_date, amount_due_rupees, outstanding_rupees')
    .eq('student_id', studentId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (m.error) return { data: null, error: m.error };
  const rows = m.data as Omit<Membership, 'batches'>[];
  const mb = await supabase
    .from('membership_batches')
    .select('membership_id, batch_id')
    .in('membership_id', rows.map((r) => r.id));
  if (mb.error) return { data: null, error: mb.error };
  const links = mb.data as { membership_id: number; batch_id: number }[];
  const b = await supabase.from('batches').select('id, name').in('id', [...new Set(links.map((l) => l.batch_id))]);
  if (b.error) return { data: null, error: b.error };
  const names = new Map((b.data as { id: number; name: string }[]).map((x) => [x.id, x.name]));
  const data = rows.map((r) => ({
    ...r,
    batches: links.filter((l) => l.membership_id === r.id).map((l) => names.get(l.batch_id) ?? `Batch ${l.batch_id}`),
  }));
  return { data, error: null };
}

export default function EditStudent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const studioId = useStudioId();

  const [heading, setHeading] = useState('Edit student');
  const [values, setValues] = useState<StudentValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharedWith, setSharedWith] = useState<PhoneMatch[] | null>(null);
  const memberships = useLoad(fetchMemberships, studentId);

  useEffect(() => {
    supabase
      .from('students')
      .select('student_number, full_name, date_of_birth, phone, guardian_name, guardian_phone, email')
      .eq('id', studentId)
      .single()
      .then(({ data, error }) => {
        if (error) return setLoadError(error.message);
        const row = data as StudentRow & { student_number: number };
        setHeading(`#${row.student_number} ${row.full_name}`);
        setValues(toValues(row));
      });
  }, [studentId]);

  async function saveDetails() {
    if (!values) return;
    setError(null);
    setSaved(false);
    const result = validateStudent(values);
    if ('error' in result) return setError(result.error);

    setBusy(true);
    try {
      if (sharedWith === null) {
        const { matches, error } = await findPhoneMatches(studioId, result.row, studentId);
        if (error) return setError(error);
        if (matches.length) return setSharedWith(matches);
      }
      const { error } = await supabase.from('students').update(result.row).eq('id', studentId);
      if (error) return setError(error.message);
      setSharedWith(null);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!values) return <Spinner />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: heading }} />

      <StudentFields
        values={values}
        onChange={(patch) => {
          setValues((v) => (v ? { ...v, ...patch } : v));
          setSharedWith(null);
          setSaved(false);
        }}
      />
      {sharedWith && <SharedPhoneNotice matches={sharedWith} />}
      {error && <ErrorText>{error}</ErrorText>}
      {saved && <Muted>Details saved.</Muted>}
      <Button label={sharedWith ? 'Save anyway' : 'Save details'} onPress={saveDetails} busy={busy} />

      <SectionHeader>Memberships</SectionHeader>
      {memberships.error && <ErrorText>{memberships.error}</ErrorText>}
      {memberships.isLoading && !memberships.data && <Spinner />}
      {memberships.data?.length === 0 && <Muted>No memberships yet.</Muted>}
      <View style={{ marginHorizontal: -16 }}>
        {memberships.data?.map((m) => <MembershipCard key={m.id} membership={m} onChanged={memberships.reload} />)}
      </View>
      <Button
        label="Add to another batch"
        variant="plain"
        onPress={() => router.push({ pathname: '/enroll/[studentId]', params: { studentId: String(studentId) } })}
      />
    </ScrollView>
  );
}

function MembershipCard({ membership: m, onChanged }: { membership: Membership; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'start' | 'pay'>('view');
  const [startDate, setStartDate] = useState(m.start_date ?? studioToday());
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(String(m.outstanding_rupees));
  const [method, setMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = statusInfo(m.status);
  const pending = m.lifecycle === 'pending_activation';

  const amountValue = WHOLE_NUMBER.test(amount.trim()) ? Number(amount.trim()) : null;
  const clearsBalance = amountValue === m.outstanding_rupees;
  // Paying off a waiting membership in full always starts it, so the owner sets the date now.
  const activateWithPayment = pending && (clearsBalance || startNow);

  function open(next: 'start' | 'pay') {
    setError(null);
    setStartDate(m.start_date ?? studioToday());
    setAmount(String(m.outstanding_rupees));
    setMode(next);
  }

  async function saveStartDate() {
    setError(null);
    if (!isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');
    if (!pending && !reason.trim()) return setError('Enter a reason for the change.');
    setBusy(true);
    const { error } = pending
      ? await supabase.rpc('activate_membership', { p_membership_id: m.id, p_start_date: startDate })
      : await supabase.rpc('correct_membership_start_date', {
          p_membership_id: m.id,
          p_start_date: startDate,
          p_reason: reason.trim(),
        });
    setBusy(false);
    if (error) return setError(error.message);
    setMode('view');
    setReason('');
    onChanged();
  }

  async function savePayment() {
    setError(null);
    if (amountValue === null || amountValue < 1) return setError('Enter an amount of at least ₹1.');
    if (amountValue > m.outstanding_rupees) return setError(`Amount cannot be more than the ${rupees(m.outstanding_rupees)} due.`);
    if (method === null) return setError('Choose how they paid.');
    if (activateWithPayment && !isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');
    setBusy(true);
    const { error } = await supabase.rpc('record_payment', {
      p_membership_id: m.id,
      p_amount_rupees: amountValue,
      p_method: method,
      p_reference: reference.trim() || null,
      p_activate_start_date: activateWithPayment ? startDate : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setMode('view');
    setReference('');
    setMethod(null);
    setStartNow(false);
    onChanged();
  }

  return (
    <Card>
      <Row>
        <Title>{m.batches.join(' + ') || 'Batch'}</Title>
        <Badge label={status.label} tone={status.tone} />
      </Row>
      <Muted>{m.start_date ? `${shortDate(m.start_date)} – ${shortDate(m.end_date)}` : 'Start date not set'}</Muted>
      <Row>
        <Muted>Fee {rupees(m.amount_due_rupees)}</Muted>
        {m.outstanding_rupees > 0 && <Muted>Due {rupees(m.outstanding_rupees)}</Muted>}
      </Row>

      {mode === 'start' && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Field label={pending ? 'Start date' : 'New start date'} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          {!pending && <Field label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. entered wrong date" />}
          {error && <ErrorText>{error}</ErrorText>}
          <Button label={pending ? 'Activate' : 'Save start date'} onPress={saveStartDate} busy={busy} />
          <Button label="Cancel" variant="plain" onPress={() => setMode('view')} />
        </View>
      )}

      {mode === 'pay' && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Field label={`Amount (₹, up to ${rupees(m.outstanding_rupees)})`} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
          <Choices options={PAYMENT_METHODS} value={method} onChange={setMethod} />
          <Field label="Reference" value={reference} onChangeText={setReference} placeholder="Optional, e.g. UPI ref" />
          {pending &&
            (clearsBalance ? (
              <Muted>This clears the balance, so the membership starts. Set its start date.</Muted>
            ) : (
              <Choices
                options={[
                  { value: 'now', label: 'Start now' },
                  { value: 'later', label: 'Wait until fully paid' },
                ]}
                value={startNow ? 'now' : 'later'}
                onChange={(v) => setStartNow(v === 'now')}
              />
            ))}
          {activateWithPayment && <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />}
          {error && <ErrorText>{error}</ErrorText>}
          <Button label="Record payment" onPress={savePayment} busy={busy} />
          <Button label="Cancel" variant="plain" onPress={() => setMode('view')} />
        </View>
      )}

      {mode === 'view' && (
        <>
          {m.outstanding_rupees > 0 && <Button label="Record payment" variant="plain" onPress={() => open('pay')} />}
          <Button label={pending ? 'Set start date' : 'Change start date'} variant="plain" onPress={() => open('start')} />
        </>
      )}
    </Card>
  );
}
