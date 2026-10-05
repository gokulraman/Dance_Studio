import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Fab, FAB_CLEARANCE, Field, IconButton, Muted, Row, StateMessage, Title } from '@/components/ui';
import { rupees, shortDate, statusInfo } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type StudentRow = {
  id: number;
  student_number: number;
  full_name: string;
  phone: string | null;
  guardian_phone: string | null;
  status: string;
  outstanding_rupees: number;
  latest_end_date: string | null;
};

const fetchStudents = (studioId: number) =>
  supabase
    .from('student_overview')
    .select('id, student_number, full_name, phone, guardian_phone, status, outstanding_rupees, latest_end_date')
    .eq('studio_id', studioId)
    .neq('status', 'archived')
    .order('student_number')
    .then((r) => ({ data: r.data as StudentRow[] | null, error: r.error }));

export default function Students() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchStudents, studioId);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        String(s.student_number) === q.replace(/^#/, '') ||
        s.phone?.includes(q) ||
        s.guardian_phone?.includes(q),
    );
  }, [data, query]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(s) => String(s.id)}
        refreshing={isLoading}
        onRefresh={reload}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Field label="Search" placeholder="Name, number or phone" value={query} onChangeText={setQuery} autoCorrect={false} />
          </View>
        }
        ListEmptyComponent={
          <StateMessage isLoading={isLoading} error={error} empty={query ? 'No students match.' : 'No students yet. Tap + to add one.'} />
        }
        renderItem={({ item }) => {
          const status = statusInfo(item.status);
          return (
            <Card>
              <Row>
                <Title>#{item.student_number} {item.full_name}</Title>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge label={status.label} tone={status.tone} />
                  <IconButton
                    icon="create-outline"
                    label={`Edit ${item.full_name}`}
                    onPress={() => router.push({ pathname: '/student/[id]', params: { id: String(item.id) } })}
                  />
                </View>
              </Row>
              <Muted>{item.phone ?? `Guardian ${item.guardian_phone}`}</Muted>
              <Row>
                <Muted>Ends {shortDate(item.latest_end_date)}</Muted>
                {item.outstanding_rupees > 0 && <Muted>Due {rupees(item.outstanding_rupees)}</Muted>}
              </Row>
            </Card>
          );
        }}
      />
      <Fab label="Add student" onPress={() => router.push('/student/new')} />
    </View>
  );
}
