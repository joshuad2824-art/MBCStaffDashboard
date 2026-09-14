import { CounterStrip } from './today/CounterStrip'
import { Forecast } from './today/Forecast'
import { MonthCalendar } from './today/MonthCalendar'
import { NotificationRail } from './today/NotificationRail'
import { OverviewCards } from './today/OverviewCards'
import { RightNowBand } from './today/RightNowBand'
import { Announcements } from './discussion/Announcements'

export function Today() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <RightNowBand />
      <Announcements side="staff" />
      <CounterStrip />
      <Forecast />
      {/* The rail drops below the calendar rather than squeezing it: a day cell
          must never fall under about 90px wide. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '3 1 640px', minWidth: 0 }}>
          <MonthCalendar />
        </div>
        <div style={{ flex: '1 1 288px', minWidth: 0 }}>
          <NotificationRail />
        </div>
      </div>
      <OverviewCards />
    </div>
  )
}
