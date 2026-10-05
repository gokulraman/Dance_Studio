import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Choices, ErrorText, Field, Muted, SectionHeader, Spinner } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { makeStyles } from '@/lib/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WHOLE = /^\d+$/;

type Day = { on: boolean; start: string; end: string };
type Duration = { id: number; days: number; label: string };
type DbError = { message: string; code?: string };

const emptyWeek = (): Day[] => DAYS.map(() => ({ on: false, start: '18:00', end: '19:00' }));

function friendly(e: DbError) {
  if (e.code === '23505' && e.message.includes('batches_name_uq')) return 'A batch with this name already exists.';
  return e.message;
}

export default function BatchEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studioId = useStudioId();
  const styles = useStyles();

  // Becomes the real id after the first successful insert, so a retry never creates a duplicate.
  const [batchId, setBatchId] = useState<number | null>(id === 'new' ? null : Number(id));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [level, setLevel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [active, setActive] = useState(true);
  const [week, setWeek] = useState<Day[]>(emptyWeek);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});

  useEffect(() => {
    const existing = id === 'new' ? null : Number(id);
    (async () => {
      const d = await supabase.from('durations').select('id, days, label').eq('studio_id', studioId).eq('is_active', true).order('days');
      if (d.error) return setError(d.error.message);
      setDurations(d.data as Duration[]);
      if (existing === null) return;

      const [b, s, p] = await Promise.all([
        supabase.from('batches').select('name, dance_style, level, capacity, is_active').eq('id', existing).single(),
        supabase.from('batch_schedules').select('day_of_week, start_time, end_time').eq('batch_id', existing),
        supabase.from('batch_prices').select('duration_id, price_rupees').eq('batch_id', existing),
      ]);
      const failed = b.error ?? s.error ?? p.error;
      if (failed) return setError(failed.message);

      const batch = b.data as { name: string; dance_style: string | null; level: string | null; capacity: number | null; is_active: boolean };
      setName(batch.name);
      setStyle(batch.dance_style ?? '');
      setLevel(batch.level ?? '');
      setCapacity(batch.capacity ? String(batch.capacity) : '');
      setActive(batch.is_active);
      const w = emptyWeek();
      for (const row of s.data as { day_of_week: number; start_time: string; end_time: string }[]) {
        w[row.day_of_week - 1] = { on: true, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) };
      }
      setWeek(w);
      setPrices(Object.fromEntries((p.data as { duration_id: number; price_rupees: number }[]).map((x) => [x.duration_id, String(x.price_rupees)])));
    })().finally(() => setLoading(false));
  }, [id, studioId]);

  function setDay(i: number, patch: Partial<Day>) {
    setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function validate(): string | null {
    if (!name.trim()) return 'Enter a batch name.';
    if (capacity && (!WHOLE.test(capacity) || Number(capacity) < 1)) return 'Capacity must be a whole number above 0, or left empty.';
    for (const [i, d] of week.entries()) {
      if (!d.on) continue;
      if (!TIME.test(d.start) || !TIME.test(d.end)) return `${DAYS[i]}: use 24-hour times like 18:30.`;
      if (d.end <= d.start) return `${DAYS[i]}: end time must be after start time.`;
    }
    if (!week.some((d) => d.on)) return 'Pick at least one class day in the weekly schedule.';
    for (const d of durations) {
      const v = prices[d.id]?.trim();
      if (v && (!WHOLE.test(v) || Number(v) < 1)) return `${d.label}: price must be whole rupees above 0, or left empty.`;
    }
    if (!durations.some((d) => prices[d.id]?.trim())) return 'Set a price for at least one duration.';
    return null;
  }

  async function save() {
    const invalid = validate();
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      const fields = {
        name: name.trim(),
        dance_style: style.trim() || null,
        level: level.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        is_active: active,
      };
      let bid = batchId;
      if (bid === null) {
        const { data, error } = await supabase.from('batches').insert({ studio_id: studioId, ...fields }).select('id').single();
        if (error) throw error;
        bid = data.id as number;
        setBatchId(bid);
      } else {
        const { error } = await supabase.from('batches').update(fields).eq('id', bid);
        if (error) throw error;
      }

      const offDays = week.flatMap((d, i) => (d.on ? [] : [i + 1]));
      const onDays = week.flatMap((d, i) =>
        d.on ? [{ studio_id: studioId, batch_id: bid, day_of_week: i + 1, start_time: d.start, end_time: d.end }] : [],
      );
      if (offDays.length) {
        const { error } = await supabase.from('batch_schedules').delete().eq('batch_id', bid).in('day_of_week', offDays);
        if (error) throw error;
      }
      if (onDays.length) {
        const { error } = await supabase.from('batch_schedules').upsert(onDays, { onConflict: 'batch_id,day_of_week' });
        if (error) throw error;
      }

      const unpriced = durations.filter((d) => !prices[d.id]?.trim()).map((d) => d.id);
      const priced = durations
        .filter((d) => prices[d.id]?.trim())
        .map((d) => ({ studio_id: studioId, batch_id: bid, duration_id: d.id, price_rupees: Number(prices[d.id]) }));
      if (unpriced.length) {
        const { error } = await supabase.from('batch_prices').delete().eq('batch_id', bid).in('duration_id', unpriced);
        if (error) throw error;
      }
      if (priced.length) {
        const { error } = await supabase.from('batch_prices').upsert(priced, { onConflict: 'batch_id,duration_id' });
        if (error) throw error;
      }

      router.back();
    } catch (e) {
      setError(friendly(e as DbError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: batchId === null ? 'New batch' : 'Edit batch' }} />

      <Field label="Batch name" value={name} onChangeText={setName} placeholder="e.g. Bollywood Beginners" />
      <Field label="Dance style" value={style} onChangeText={setStyle} placeholder="Optional" />
      <Field label="Level" value={level} onChangeText={setLevel} placeholder="Optional" />
      <Field label="Capacity" value={capacity} onChangeText={setCapacity} placeholder="Optional" keyboardType="number-pad" />
      {batchId !== null && (
        <Choices
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={active ? 'active' : 'inactive'}
          onChange={(v) => setActive(v === 'active')}
        />
      )}

      <SectionHeader>Weekly schedule</SectionHeader>
      <Muted>Pick at least one day.</Muted>
      <View style={styles.days}>
        {DAYS.map((label, i) => (
          <Pressable key={label} onPress={() => setDay(i, { on: !week[i].on })} style={[styles.chip, week[i].on && styles.chipOn]}>
            <Text style={[styles.chipText, week[i].on && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {week.map((d, i) =>
        d.on ? (
          <View key={DAYS[i]} style={styles.timeRow}>
            <Text style={styles.dayLabel}>{DAYS[i]}</Text>
            <View style={styles.flex}>
              <Field label="Start" value={d.start} onChangeText={(v) => setDay(i, { start: v })} placeholder="18:00" />
            </View>
            <View style={styles.flex}>
              <Field label="End" value={d.end} onChangeText={(v) => setDay(i, { end: v })} placeholder="19:00" />
            </View>
          </View>
        ) : null,
      )}

      <SectionHeader>Prices (₹)</SectionHeader>
      <Muted>Set at least one price. Leave a duration empty if this batch isn&apos;t sold for that length.</Muted>
      {durations.map((d) => (
        <Field
          key={d.id}
          label={d.label}
          value={prices[d.id] ?? ''}
          onChangeText={(v) => setPrices((p) => ({ ...p, [d.id]: v }))}
          placeholder="Not offered"
          keyboardType="number-pad"
        />
      ))}

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Save" onPress={save} busy={busy} />
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  chipOn: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { color: t.text, fontSize: 14 },
  chipTextOn: { color: t.onPrimary, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  dayLabel: { width: 40, fontSize: 15, fontWeight: '600', color: t.text, paddingBottom: 12 },
  flex: { flex: 1 },
}));
