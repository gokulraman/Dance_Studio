import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Choices, Muted, Row, StateMessage, Title } from '@/components/ui';
import { rupees, shortDate, statusInfo } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type MembershipRow = {
  id: number;
  student_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  days_left: number | null;
  amount_due_rupees: number;
  outstanding_rupees: number;
};
type StudentName = { id: number; student_number: number; full_name: string };
type Item = MembershipRow & { student: StudentName | undefined };

async function fetchMemberships(studioId: number) {
  const [m, s] = await Promise.all([
    supabase
      .from('membership_overview')
      .select('id, student_id, status, start_date, end_date, days_left, amount_due_rupees, outstanding_rupees')
      .eq('studio_id', studioId)
      .neq('status', 'cancelled')
      .order('end_date', { ascending: true, nullsFirst: true }),
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId),
  ]);
  const error = m.error ?? s.error;
  if (error) return { data: null, error };
  const names = new Map((s.data as StudentName[]).map((x) => [x.id, x]));
  return { data: (m.data as MembershipRow[]).map((x): Item => ({ ...x, student: names.get(x.student_id) })), error: null };
}

const FILTERS: { label: string; match: (m: Item) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Expiring', match: (m) => m.status === 'expiring_soon' || m.status === 'expires_today' },
  { label: 'Expired', match: (m) => m.status === 'recently_expired' || m.status === 'expired' },
  { label: 'Awaiting', match: (m) => m.status === 'awaiting_activation' },
  { label: 'Balance due', match: (m) => m.outstanding_rupees > 0 },
];

export default function Memberships() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchMemberships, studioId);
  const [filter, setFilter] = useState(0);

  const visible = useMemo(() => (data ?? []).filter(FILTERS[filter].match), [data, filter]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(m) => String(m.id)}
      refreshing={isLoading}
      onRefresh={reload}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ padding: 16 }}>
          <Choices options={FILTERS.map((f, i) => ({ value: i, label: f.label }))} value={filter} onChange={setFilter} />
        </View>
      }
      ListEmptyComponent={<StateMessage isLoading={isLoading} error={error} empty="No memberships here." />}
      renderItem={({ item }) => {
        const status = statusInfo(item.status);
        return (
          <Card>
            <Row>
              <Title>
                {item.student ? `#${item.student.student_number} ${item.student.full_name}` : `Student ${item.student_id}`}
              </Title>
              <Badge label={status.label} tone={status.tone} />
            </Row>
            <Muted>
              {item.start_date ? `${shortDate(item.start_date)} – ${shortDate(item.end_date)}` : 'Start date not set'}
              {item.days_left !== null ? ` · ${item.days_left} days left` : ''}
            </Muted>
            <Row>
              <Muted>Fee {rupees(item.amount_due_rupees)}</Muted>
              {item.outstanding_rupees > 0 && <Muted>Due {rupees(item.outstanding_rupees)}</Muted>}
            </Row>
          </Card>
        );
      }}
    />
  );
}
