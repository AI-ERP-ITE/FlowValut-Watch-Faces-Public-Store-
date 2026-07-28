/**
 * Curated list of Tabler icons mapped to watchface categories.
 * All icons verified to exist in @tabler/icons-react v3.x
 */
import type { Icon } from '@tabler/icons-react';
import {
  // Health
  IconHeart, IconHeartbeat, IconActivity, IconLungs, IconBrain, IconEye,
  IconDroplet, IconThermometer, IconStethoscope, IconPill, IconBandage,
  IconFlame, IconScale, IconRun, IconYoga, IconMoodSmile, IconZzz,
  IconWoman, IconMan, IconAccessible, IconMedicalCross, IconVaccine,
  IconMicroscope, IconDna, IconClover, IconSalad, IconApple,
  // Fitness
  IconBike, IconSwimming, IconTreadmill, IconBarbell, IconMountain,
  IconWalk, IconIceSkating, IconSkiJumping, IconBallBasketball,
  IconBallFootball, IconBallTennis, IconBallVolleyball, IconKarate,
  IconGolf, IconHorseToy, IconSkateboarding, IconTrophy, IconMedal,
  // System
  IconBattery, IconBatteryCharging, IconWifi, IconBluetooth, IconBell,
  IconBellOff, IconSettings, IconLock, IconLockOpen, IconVolume,
  IconVolumeOff, IconBrightness, IconMoon, IconSun, IconPhone,
  IconMessage, IconMail, IconAlarm,
  // Time
  IconClock, IconHourglass, IconCalendar, IconCalendarEvent,
  IconCalendarStats, IconDeviceWatch, IconSunrise, IconSunset,
  IconMoonStars, IconSunHigh, IconUvIndex, IconClockHour3, IconTimeline,
  // Weather
  IconCloud, IconCloudRain, IconSnowflake, IconCloudStorm, IconCloudFog,
  IconWind, IconDroplets, IconTemperature,
} from '@tabler/icons-react';

export interface TablerIconDef {
  key: string;                             // e.g. 'tabler:heart'
  label: string;
  category: 'health' | 'fitness' | 'weather' | 'system' | 'time';
  component: Icon;
}

export const TABLER_ICON_MAP: TablerIconDef[] = [
  // ── Health ───────────────────────────────────────────────────────────────
  { key: 'tabler:heart',         label: 'Heart',              category: 'health',  component: IconHeart },
  { key: 'tabler:heartbeat',     label: 'Heartbeat',          category: 'health',  component: IconHeartbeat },
  { key: 'tabler:activity',      label: 'Activity / EKG',     category: 'health',  component: IconActivity },
  { key: 'tabler:lungs',         label: 'Lungs',              category: 'health',  component: IconLungs },
  { key: 'tabler:brain',         label: 'Brain',              category: 'health',  component: IconBrain },
  { key: 'tabler:eye',           label: 'Eye',                category: 'health',  component: IconEye },
  { key: 'tabler:droplet',       label: 'Droplet / Blood',    category: 'health',  component: IconDroplet },
  { key: 'tabler:thermometer',   label: 'Thermometer',        category: 'health',  component: IconThermometer },
  { key: 'tabler:stethoscope',   label: 'Stethoscope',        category: 'health',  component: IconStethoscope },
  { key: 'tabler:pill',          label: 'Medication',         category: 'health',  component: IconPill },
  { key: 'tabler:bandage',       label: 'Bandage',            category: 'health',  component: IconBandage },
  { key: 'tabler:flame',         label: 'Calories / Burn',    category: 'health',  component: IconFlame },
  { key: 'tabler:scale',         label: 'Weight / Scale',     category: 'health',  component: IconScale },
  { key: 'tabler:run',           label: 'Running (outline)',  category: 'health',  component: IconRun },
  { key: 'tabler:yoga',          label: 'Yoga',               category: 'health',  component: IconYoga },
  { key: 'tabler:mood-smile',    label: 'Mood',               category: 'health',  component: IconMoodSmile },
  { key: 'tabler:zzz',           label: 'Sleep',              category: 'health',  component: IconZzz },
  { key: 'tabler:woman',         label: 'Woman',              category: 'health',  component: IconWoman },
  { key: 'tabler:man',           label: 'Man',                category: 'health',  component: IconMan },
  { key: 'tabler:accessible',    label: 'Accessible',         category: 'health',  component: IconAccessible },
  { key: 'tabler:medical-cross', label: 'Medical Cross',      category: 'health',  component: IconMedicalCross },
  { key: 'tabler:vaccine',       label: 'Vaccine',            category: 'health',  component: IconVaccine },
  { key: 'tabler:microscope',    label: 'Microscope',         category: 'health',  component: IconMicroscope },
  { key: 'tabler:dna',           label: 'DNA',                category: 'health',  component: IconDna },
  { key: 'tabler:clover',        label: 'Wellbeing',          category: 'health',  component: IconClover },
  { key: 'tabler:salad',         label: 'Nutrition',          category: 'health',  component: IconSalad },
  { key: 'tabler:apple',         label: 'Apple / Health',     category: 'health',  component: IconApple },

  // ── Fitness ──────────────────────────────────────────────────────────────
  { key: 'tabler:bike',          label: 'Cycling',            category: 'fitness', component: IconBike },
  { key: 'tabler:swimming',      label: 'Swimming',           category: 'fitness', component: IconSwimming },
  { key: 'tabler:treadmill',     label: 'Treadmill',          category: 'fitness', component: IconTreadmill },
  { key: 'tabler:barbell',       label: 'Barbell / Gym',      category: 'fitness', component: IconBarbell },
  { key: 'tabler:mountain',      label: 'Mountain / Hiking',  category: 'fitness', component: IconMountain },
  { key: 'tabler:walk',          label: 'Walking',            category: 'fitness', component: IconWalk },
  { key: 'tabler:ice-skating',   label: 'Ice Skating',        category: 'fitness', component: IconIceSkating },
  { key: 'tabler:ski-jumping',   label: 'Skiing',             category: 'fitness', component: IconSkiJumping },
  { key: 'tabler:ball-basketball', label: 'Basketball',       category: 'fitness', component: IconBallBasketball },
  { key: 'tabler:ball-football', label: 'Football',           category: 'fitness', component: IconBallFootball },
  { key: 'tabler:ball-tennis',   label: 'Tennis',             category: 'fitness', component: IconBallTennis },
  { key: 'tabler:ball-volleyball', label: 'Volleyball',       category: 'fitness', component: IconBallVolleyball },
  { key: 'tabler:karate',        label: 'Martial Arts',       category: 'fitness', component: IconKarate },
  { key: 'tabler:golf',          label: 'Golf',               category: 'fitness', component: IconGolf },
  { key: 'tabler:horse-toy',     label: 'Equestrian',         category: 'fitness', component: IconHorseToy },
  { key: 'tabler:skateboarding', label: 'Skateboarding',      category: 'fitness', component: IconSkateboarding },
  { key: 'tabler:trophy',        label: 'Trophy',             category: 'fitness', component: IconTrophy },
  { key: 'tabler:medal',         label: 'Medal',              category: 'fitness', component: IconMedal },

  // ── System ───────────────────────────────────────────────────────────────
  { key: 'tabler:battery',       label: 'Battery',            category: 'system',  component: IconBattery },
  { key: 'tabler:battery-charging', label: 'Charging',        category: 'system',  component: IconBatteryCharging },
  { key: 'tabler:wifi',          label: 'Wi-Fi',              category: 'system',  component: IconWifi },
  { key: 'tabler:bluetooth',     label: 'Bluetooth',          category: 'system',  component: IconBluetooth },
  { key: 'tabler:bell',          label: 'Notification',       category: 'system',  component: IconBell },
  { key: 'tabler:bell-off',      label: 'Do Not Disturb',     category: 'system',  component: IconBellOff },
  { key: 'tabler:settings',      label: 'Settings',           category: 'system',  component: IconSettings },
  { key: 'tabler:lock',          label: 'Locked',             category: 'system',  component: IconLock },
  { key: 'tabler:lock-open',     label: 'Unlocked',           category: 'system',  component: IconLockOpen },
  { key: 'tabler:volume',        label: 'Volume',             category: 'system',  component: IconVolume },
  { key: 'tabler:volume-off',    label: 'Muted',              category: 'system',  component: IconVolumeOff },
  { key: 'tabler:brightness',    label: 'Brightness',         category: 'system',  component: IconBrightness },
  { key: 'tabler:moon',          label: 'Night Mode',         category: 'system',  component: IconMoon },
  { key: 'tabler:sun',           label: 'Daytime',            category: 'system',  component: IconSun },
  { key: 'tabler:phone',         label: 'Phone',              category: 'system',  component: IconPhone },
  { key: 'tabler:message',       label: 'Message',            category: 'system',  component: IconMessage },
  { key: 'tabler:mail',          label: 'Email',              category: 'system',  component: IconMail },
  { key: 'tabler:alarm',         label: 'Alarm (system)',     category: 'system',  component: IconAlarm },

  // ── Time ─────────────────────────────────────────────────────────────────
  { key: 'tabler:clock',         label: 'Clock',              category: 'time',    component: IconClock },
  { key: 'tabler:hourglass',     label: 'Hourglass',          category: 'time',    component: IconHourglass },
  { key: 'tabler:calendar',      label: 'Calendar',           category: 'time',    component: IconCalendar },
  { key: 'tabler:calendar-event', label: 'Calendar Event',    category: 'time',    component: IconCalendarEvent },
  { key: 'tabler:calendar-stats', label: 'Calendar Stats',    category: 'time',    component: IconCalendarStats },
  { key: 'tabler:device-watch',  label: 'Watch',              category: 'time',    component: IconDeviceWatch },
  { key: 'tabler:sunrise',       label: 'Sunrise',            category: 'time',    component: IconSunrise },
  { key: 'tabler:sunset',        label: 'Sunset',             category: 'time',    component: IconSunset },
  { key: 'tabler:moon-stars',    label: 'Moon & Stars',       category: 'time',    component: IconMoonStars },
  { key: 'tabler:sun-high',      label: 'Noon / High Sun',    category: 'time',    component: IconSunHigh },
  { key: 'tabler:uv-index',      label: 'UV Index',           category: 'time',    component: IconUvIndex },
  { key: 'tabler:clock-hour-3',  label: 'Clock 3 o\'clock',   category: 'time',    component: IconClockHour3 },
  { key: 'tabler:timeline',      label: 'Timeline',           category: 'time',    component: IconTimeline },

  // ── Weather ──────────────────────────────────────────────────────────────
  { key: 'tabler:cloud',         label: 'Cloudy',             category: 'weather', component: IconCloud },
  { key: 'tabler:cloud-rain',    label: 'Rain',               category: 'weather', component: IconCloudRain },
  { key: 'tabler:snowflake',     label: 'Snow',               category: 'weather', component: IconSnowflake },
  { key: 'tabler:cloud-storm',   label: 'Thunderstorm',       category: 'weather', component: IconCloudStorm },
  { key: 'tabler:cloud-fog',     label: 'Fog',                category: 'weather', component: IconCloudFog },
  { key: 'tabler:wind',          label: 'Wind',               category: 'weather', component: IconWind },
  { key: 'tabler:droplets',      label: 'Humidity',           category: 'weather', component: IconDroplets },
  { key: 'tabler:temperature',   label: 'Temperature',        category: 'weather', component: IconTemperature },
];
