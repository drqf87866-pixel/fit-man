/**
 * Bewegungsmuster. Push/Pull beschreiben Oberkörperbewegungen; Beine folgen
 * ihrer Biomechanik (Knie-/Hüftstreckung = push, Knieflexion/Hip Hinge = pull).
 * `core` und `cardio` gibt es, weil Plank, Crunches oder Laufband weder ein
 * Drücken noch ein Ziehen sind – ein erzwungenes Push/Pull würde die Filter
 * verfälschen.
 *
 * Die Labels heißen bewusst "Core"/"Ausdauer" und nicht "Rumpf"/"Cardio":
 * Letztere sind bereits Kategorienamen, die Chips und Badges stünden sonst
 * doppelt und mit unterschiedlicher Wirkung nebeneinander.
 */
export const MOVEMENT_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  core: 'Core',
  cardio: 'Ausdauer',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  freihantel: 'Freihantel',
  maschine: 'Maschine',
  koerpergewicht: 'Körpergewicht',
};

/** Erlaubte Werte – einzige Quelle für Formular-Optionen und Validierung. */
export const MOVEMENT_VALUES = Object.keys(MOVEMENT_LABELS);
export const EQUIPMENT_VALUES = Object.keys(EQUIPMENT_LABELS);
