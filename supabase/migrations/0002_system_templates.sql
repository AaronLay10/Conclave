insert into public.event_templates
  (name, category, default_scope, description, preparation, default_rules, reminder_offsets_minutes, is_system)
values
  (
    'Mightiest Governor',
    'Competitive',
    'kingdom',
    'Six-day competition with stage instructions, placements, caps, and enforcement.',
    'Save speedups, AP, resources, gathering boosts, and hospital capacity.',
    'Publish rank reservations, point caps, and Kill Event rules before the event.',
    array[10080, 1440, 60],
    true
  ),
  (
    'Ark of Osiris',
    'Alliance PvP',
    'alliance',
    'Registration, roster lock, strategy, voice, match reminders, and results.',
    'Confirm roster, attendance, equipment, presets, and teleports.',
    'Use designated voice and follow the assigned Ark role.',
    array[10080, 1440, 60, 30],
    true
  ),
  (
    'Dark Fortress Raid',
    'Alliance Raid',
    'alliance',
    'Raid Coin collection, fortress selection, rally coordination, and damage reporting.',
    'Donate Raid Coins and prepare the requested troop type.',
    'Only assigned rally leaders launch rallies.',
    array[4320, 1440, 60],
    true
  ),
  (
    'Shadow Legion',
    'Alliance Defense',
    'alliance',
    'Alliance-selected defense window with reinforcement and offline-member planning.',
    'Return to alliance territory and prepare city garrison commanders.',
    'Reinforce assigned offline cities and begin only in the approved window.',
    array[1440, 120, 30],
    true
  ),
  (
    'Guardian Rotation',
    'Kingdom Routine',
    'kingdom',
    'Protected kingdom guardian schedule.',
    'Arrive before the protected start call.',
    'No early hits. Follow alliance or rotation assignments.',
    array[60, 15],
    true
  );
