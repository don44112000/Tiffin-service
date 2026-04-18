import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useCache } from '../../hooks/useCache';
import { useRefreshOnReload } from '../../hooks/useRefreshOnReload';
import { useToast } from '../../context/ToastContext';
import { getMenu, upsertMenu } from '../../services/api';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { RefreshButton } from '../../components/RefreshButton/RefreshButton';
import { MenuSkeleton } from '../../components/Skeleton/Skeleton';
import { invalidateCache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL_LONG, DAYS, SLOTS } from '../../utils/constants';
import type { MenuResponse, MenuItem } from '../../types';
import styles from './MenuPage.module.css';

export function MenuPage() {
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editDay, setEditDay] = useState('');
  const [editSlot, setEditSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [editDish, setEditDish] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback((isR: boolean) => getMenu(undefined, undefined, !isR), []);
  const { data, isLoading, isRefreshing, refresh } = useCache<MenuResponse>(
    CACHE_KEYS.MENU,
    fetcher,
    CACHE_TTL_LONG
  );

  useRefreshOnReload(refresh);

  // Organize menu into day -> slot -> MenuItem map
  const menuMap = useMemo(() => {
    const map: Record<string, Record<string, MenuItem>> = {};
    if (!data?.menu) return map;
    for (const item of data.menu) {
      if (!map[item.day]) map[item.day] = {};
      map[item.day][item.slot] = item;
    }
    return map;
  }, [data]);

  const openEdit = (day: string, slot: 'lunch' | 'dinner') => {
    const existing = menuMap[day]?.[slot];
    setEditDay(day);
    setEditSlot(slot);
    setEditDish(existing?.dish_name || '');
    setEditDesc(existing?.description || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editDish.trim()) {
      showToast('Dish name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await upsertMenu(editDay, editSlot, editDish.trim(), editDesc.trim());
      showToast('Menu updated');
      setEditOpen(false);
      invalidateCache(CACHE_KEYS.MENU);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <MenuSkeleton />;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">Weekly Menu</h1>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      <PullToRefresh onRefresh={refresh}>

      <div className={styles.grid}>
        {DAYS.map((day) => (
          <div key={day} className={styles.daySection}>
            <h3 className={styles.dayTitle}>{day.charAt(0).toUpperCase() + day.slice(1)}</h3>
            <div className={styles.slotsRow}>
              {SLOTS.map((slot) => {
                const item = menuMap[day]?.[slot];
                return (
                  <div key={slot} className={styles.slotCard}>
                    <div className={styles.slotHeader}>
                      <span className={styles.slotLabel}>
                        {slot === 'lunch' ? '☀️' : '🌙'} {slot.charAt(0).toUpperCase() + slot.slice(1)}
                      </span>
                    </div>
                    {item ? (
                      <div className={styles.slotContent}>
                        <div className={styles.dishName}>{item.dish_name}</div>
                        {item.description && (
                          <div className={styles.dishDesc}>{item.description}</div>
                        )}
                        <button
                          className={styles.editBtn}
                          onClick={() => openEdit(day, slot)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className={styles.emptySlot}>
                        <span>No dish set</span>
                        <button
                          className={styles.addBtn}
                          onClick={() => openEdit(day, slot)}
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Bottom Sheet */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`${editDay.charAt(0).toUpperCase() + editDay.slice(1)} ${editSlot.charAt(0).toUpperCase() + editSlot.slice(1)}`}
      >
        <div className={styles.editForm}>
          <label className="input-label">Dish Name</label>
          <input
            type="text"
            className="input-field"
            value={editDish}
            onChange={(e) => setEditDish(e.target.value)}
            placeholder="e.g. Veg Pulao"
            autoFocus
          />
          <label className="input-label">Description (optional)</label>
          <textarea
            className={`input-field ${styles.textarea}`}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="e.g. Served with raita and pickle"
            rows={3}
          />
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving || !editDish.trim()}
          >
            {saving ? 'Saving...' : 'Save Menu'}
          </button>
        </div>
      </BottomSheet>
      </PullToRefresh>
    </div>
  );
}
