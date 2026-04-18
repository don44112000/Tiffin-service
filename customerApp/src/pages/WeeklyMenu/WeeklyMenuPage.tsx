import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { getMenu } from "../../services/api";
import { useCache } from "../../hooks/useCache";
import { useRefreshOnReload } from "../../hooks/useRefreshOnReload";
import { getDayOfWeek } from "../../utils/dates";
import RefreshButton from "../../components/RefreshButton/RefreshButton";
import PullToRefresh from "../../components/PullToRefresh/PullToRefresh";
import type { MenuItem } from "../../types";
import Footer from "../../components/Footer/Footer";
import styles from "./WeeklyMenuPage.module.css";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function WeeklyMenuPage() {
  const navigate = useNavigate();
  const today = getDayOfWeek();

  const fetchMenu = useCallback(
    (isRefresh: boolean) => getMenu(undefined, undefined, isRefresh).then((r) => r.menu),
    []
  );

  const {
    data: menu,
    isLoading,
    isRefreshing,
    refresh,
  } = useCache<MenuItem[]>(
    "weekly_menu",
    fetchMenu,
    24 * 60 * 60 * 1000 // Cache for 24 hours
  );

  useRefreshOnReload(refresh);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.pageTitle}>Weekly Menu</h1>
        </div>
        <div className={styles.content}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 160, borderRadius: 24, marginBottom: 16 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.pageTitle}>Weekly Menu</h1>
        <div style={{ marginLeft: "auto" }}>
          <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
        </div>
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className={styles.content}>
          {DAYS.map((day, index) => {
            const dayLunch = menu?.find((m) => m.day === day && m.slot === "lunch");
            const dayDinner = menu?.find((m) => m.day === day && m.slot === "dinner");
            const isTodayDay = day === today;

            return (
              <div
                key={day}
                className={`${styles.dayCard} ${isTodayDay ? styles.activeDay : ""} ${styles.fadeIn}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={styles.dayHeader}>
                  <h2 className={styles.dayName}>{day}</h2>
                  {isTodayDay && <span className={styles.todayBadge}>TODAY</span>}
                </div>

                <div className={styles.slots}>
                  <div className={styles.slotBox}>
                    <div className={styles.slotHeader}>
                      <Clock size={12} className={styles.slotIcon} />
                      <span>🌞 Lunch</span>
                    </div>
                    {dayLunch ? (
                      <>
                        <p className={styles.dishName}>{dayLunch.dish_name}</p>
                        {dayLunch.description && <p className={styles.dishDesc}>{dayLunch.description}</p>}
                      </>
                    ) : (
                      <p className={styles.emptySlot}>Not listed</p>
                    )}
                  </div>

                  <div className={styles.slotBox}>
                    <div className={styles.slotHeader}>
                      <Clock size={12} className={styles.slotIcon} />
                      <span>🌙 Dinner</span>
                    </div>
                    {dayDinner ? (
                      <>
                        <p className={styles.dishName}>{dayDinner.dish_name}</p>
                        {dayDinner.description && <p className={styles.dishDesc}>{dayDinner.description}</p>}
                      </>
                    ) : (
                      <p className={styles.emptySlot}>Not listed</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PullToRefresh>
      <Footer />
    </div>
  );
}
