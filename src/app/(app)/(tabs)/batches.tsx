import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { Badge, Card, Fab, FAB_CLEARANCE, IconButton, Muted, Row, StateMessage, Title } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type BatchRow = {
  id: number;
  name: string;
  dance_style: string | null;
  level: string | null;
  capacity: number | null;
  enrolled_count: number;
  is_full: boolean;
  is_active: boolean;
};

const fetchBatches = (studioId: number) =>
  supabase
    .from('batch_overview')
    .select('id, name, dance_style, level, capacity, enrolled_count, is_full, is_active')
    .eq('studio_id', studioId)
    .order('is_active', { ascending: false })
    .order('name')
    .then((r) => ({ data: r.data as BatchRow[] | null, error: r.error }));

export default function Batches() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchBatches, studioId);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => String(b.id)}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: FAB_CLEARANCE }}
        ListEmptyComponent={<StateMessage isLoading={isLoading} error={error} empty="No batches yet. Tap + to add one." />}
        renderItem={({ item }) => (
          <Card>
            <Row>
              <Title>{item.name}</Title>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!item.is_active ? (
                  <Badge label="Inactive" tone="neutral" />
                ) : item.is_full ? (
                  <Badge label="Full" tone="warn" />
                ) : null}
                <IconButton
                  icon="create-outline"
                  label={`Edit ${item.name}`}
                  onPress={() => router.push({ pathname: '/batch/[id]', params: { id: String(item.id) } })}
                />
              </View>
            </Row>
            {(item.dance_style || item.level) && <Muted>{[item.dance_style, item.level].filter(Boolean).join(' · ')}</Muted>}
            <Muted>
              {item.enrolled_count} enrolled{item.capacity ? ` of ${item.capacity}` : ''}
            </Muted>
          </Card>
        )}
      />
      <Fab label="New batch" onPress={() => router.push({ pathname: '/batch/[id]', params: { id: 'new' } })} />
    </View>
  );
}
