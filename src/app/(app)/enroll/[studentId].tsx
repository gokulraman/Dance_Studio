import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Card, Choices, ErrorText, Field, Muted, Row, SectionHeader, Spinner, Title } from '@/components/ui';
import { isValidIsoDate, PAYMENT_METHODS, rupees, studioToday, WHOLE_NUMBER as WHOLE } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';

type Student = { id: number; student_number: number; full_name: string };
type Batch = { id: number; name: string };
type Duration = { id: number; label: string; days: number };
type Price = { batch_id: number; duration_id: number; price_rupees: number };

export default function Enrol() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const studioId = useStudioId();

  const [student, setStudent] = useState<Student | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  const [batchId, setBatchId] = useState<number | null>(null);
  const [durationId, setDurationId] = useState<number | null>(null);
  const [discount, setDiscount] = useState('');
  // null means "pay the full amount due", so changing batch, duration or discount keeps it in sync.
  const [paid, setPaid] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [startDate, setStartDate] = useState(studioToday());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, b, d, p] = await Promise.all([
        supabase.from('students').select('id, student_number, full_name').eq('id', Number(studentId)).single(),
        supabase.from('batches').select('id, name').eq('studio_id', studioId).eq('is_active', true).order('name'),
        supabase.from('durations').select('id, label, days').eq('studio_id', studioId).eq('is_active', true).order('days'),
        supabase.from('batch_prices').select('batch_id, duration_id, price_rupees').eq('studio_id', studioId),
      ]);
      const failed = s.error ?? b.error ?? d.error ?? p.error;
      if (failed) return setError(failed.message);
      const priceRows = p.data as Price[];
      setStudent(s.data as Student);
      setBatches((b.data as Batch[]).filter((x) => priceRows.some((r) => r.batch_id === x.id)));
      setDurations(d.data as Duration[]);
      setPrices(priceRows);
    })().finally(() => setLoading(false));
  }, [studentId, studioId]);

  const offered = useMemo(
    () => durations.filter((d) => prices.some((p) => p.batch_id === batchId && p.duration_id === d.id)),
    [durations, prices, batchId],
  );
  const price = prices.find((p) => p.batch_id === batchId && p.duration_id === durationId)?.price_rupees ?? null;
  const discountValue = discount.trim() ? Number(discount) : 0;
  const due = price !== null && WHOLE.test(String(discountValue)) ? price - discountValue : null;
  const paidText = paid ?? (due !== null && due > 0 ? String(due) : '');
  const paidValue = WHOLE.test(paidText) ? Number(paidText) : null;
  const fullyPaid = due !== null && paidValue === due;
  const activate = fullyPaid || startNow;

  async function save() {
    setError(null);
    if (batchId === null) return setError('Choose a batch.');
    if (durationId === null || price === null) return setError('Choose a duration.');
    if (discount.trim() && !WHOLE.test(discount.trim())) return setError('Discount must be whole rupees.');
    if (due === null || due <= 0) return setError('Discount must be less than the price.');
    if (paidValue === null || paidValue < 1) return setError('Amount paid now must be at least ₹1.');
    if (paidValue > due) return setError(`Amount paid now cannot be more than ${rupees(due)}.`);
    if (method === null) return setError('Choose how they paid.');
    if (activate && !isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');

    setBusy(true);
    const { error } = await supabase.rpc('create_membership', {
      p_student_id: Number(studentId),
      p_duration_id: durationId,
      p_payment_rupees: paidValue,
      p_payment_method: method,
      p_batch_id: batchId,
      p_discount_rupees: discountValue,
      p_activate: activate,
      p_start_date: activate ? startDate : null,
      p_reference: reference.trim() || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.back();
  }

  if (loading) return <Spinner />;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: student ? `Enrol #${student.student_number} ${student.full_name}` : 'Enrol' }} />

      <SectionHeader>Batch</SectionHeader>
      {batches.length === 0 ? (
        <Muted>No active batch has a price yet. Add prices in the Batches tab first.</Muted>
      ) : (
        <Choices
          options={batches.map((b) => ({ value: b.id, label: b.name }))}
          value={batchId}
          onChange={(v) => {
            setBatchId(v);
            setDurationId(null);
            setPaid(null);
          }}
        />
      )}

      {batchId !== null && (
        <>
          <SectionHeader>Duration</SectionHeader>
          <Choices
            options={offered.map((d) => ({
              value: d.id,
              label: `${d.label} · ${rupees(prices.find((p) => p.batch_id === batchId && p.duration_id === d.id)!.price_rupees)}`,
            }))}
            value={durationId}
            onChange={(v) => {
              setDurationId(v);
              setPaid(null);
            }}
          />
        </>
      )}

      {price !== null && (
        <>
          <SectionHeader>Payment</SectionHeader>
          <Field
            label="Discount (₹)"
            value={discount}
            onChangeText={(v) => {
              setDiscount(v);
              setPaid(null);
            }}
            placeholder="0"
            keyboardType="number-pad"
          />
          <Card>
            <Row><Muted>Price</Muted><Title>{rupees(price)}</Title></Row>
            <Row><Muted>Amount due</Muted><Title>{due !== null && due > 0 ? rupees(due) : '—'}</Title></Row>
          </Card>
          <Field label="Paid now (₹)" value={paidText} onChangeText={setPaid} keyboardType="number-pad" />
          <Choices options={PAYMENT_METHODS} value={method} onChange={setMethod} />
          <Field label="Reference" value={reference} onChangeText={setReference} placeholder="Optional, e.g. UPI ref" />

          <SectionHeader>Start</SectionHeader>
          {!fullyPaid && (
            <Choices
              options={[
                { value: 'now', label: 'Start now' },
                { value: 'later', label: 'Start when fully paid' },
              ]}
              value={startNow ? 'now' : 'later'}
              onChange={(v) => setStartNow(v === 'now')}
            />
          )}
          {activate ? (
            <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          ) : (
            <Muted>The membership waits until the balance is paid; you set the start date then.</Muted>
          )}
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Create membership" onPress={save} busy={busy} disabled={price === null} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
});
