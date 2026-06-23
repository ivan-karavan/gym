import type {
  EntityMeta,
  Exercise,
  MediaAsset,
  Program,
  ProgramBundle,
  ProgramVersion,
  WorkoutTemplate,
} from "../domain/types";

const now = "2026-06-23T00:00:00.000Z";

const meta = (id: string): EntityMeta => ({
  id,
  createdAt: now,
  updatedAt: now,
  schemaVersion: 1,
});

const media: MediaAsset[] = [
  {
    id: "media-barbell-squat",
    localPath: "/exercises/barbell-squat.png",
    alt: "Присед со штангой",
  },
  {
    id: "media-bench-press",
    localPath: "/exercises/bench-press.png",
    alt: "Жим лежа",
  },
  {
    id: "media-horizontal-row",
    localPath: "/exercises/horizontal-row.png",
    alt: "Тяга горизонтального блока или штанги в наклоне",
  },
  {
    id: "media-romanian-deadlift",
    localPath: "/exercises/romanian-deadlift.png",
    alt: "Румынская тяга",
  },
  {
    id: "media-plank",
    localPath: "/exercises/plank.png",
    alt: "Планка",
  },
  {
    id: "media-deadlift",
    localPath: "/exercises/deadlift.png",
    alt: "Становая тяга классическая или трап-гриф",
  },
  {
    id: "media-overhead-press",
    localPath: "/exercises/overhead-press.png",
    alt: "Жим гантелей сидя или армейский жим",
  },
  {
    id: "media-pull-up",
    localPath: "/exercises/pull-up.png",
    alt: "Подтягивания",
  },
  {
    id: "media-leg-press-lunge",
    localPath: "/exercises/leg-press-lunge.png",
    alt: "Жим ногами или выпады",
  },
  {
    id: "media-face-pull",
    localPath: "/exercises/face-pull.png",
    alt: "Face pull или разведения на заднюю дельту",
  },
  {
    id: "media-front-squat",
    localPath: "/exercises/front-squat.png",
    alt: "Фронтальный присед или обычный присед полегче",
  },
  {
    id: "media-incline-dumbbell-press",
    localPath: "/exercises/incline-dumbbell-press.png",
    alt: "Жим гантелей на наклонной скамье",
  },
  {
    id: "media-lat-pulldown",
    localPath: "/exercises/lat-pulldown.png",
    alt: "Тяга верхнего блока или подтягивания",
  },
  {
    id: "media-hyperextension-leg-curl",
    localPath: "/exercises/hyperextension-leg-curl.png",
    alt: "Гиперэкстензия или сгибание ног",
  },
  {
    id: "media-lateral-raise-abs",
    localPath: "/exercises/lateral-raise-abs.png",
    alt: "Подъемы гантелей в стороны и пресс",
  },
];

const exercises: Exercise[] = [
  {
    ...meta("ex-barbell-squat"),
    name: "Присед со штангой",
    loggingType: "weight_reps",
    description: "Базовое упражнение для ног и корпуса. Начинай с 2-3 разминочных подходов и держи запас 2-3 повтора.",
    cues: ["Стопы устойчиво на полу", "Колени движутся по линии носков", "Спина остается нейтральной"],
    mediaId: "media-barbell-squat",
  },
  {
    ...meta("ex-bench-press"),
    name: "Жим лежа",
    loggingType: "weight_reps",
    description: "Горизонтальный жим для груди, плеч и трицепсов. Работай уверенно, без отказа.",
    cues: ["Лопатки сведены и опущены", "Стопы плотно стоят на полу", "Гриф опускается контролируемо"],
    mediaId: "media-bench-press",
  },
  {
    ...meta("ex-horizontal-row"),
    name: "Тяга горизонтального блока или штанги в наклоне",
    loggingType: "weight_reps",
    description: "Горизонтальная тяга для спины, которая балансирует жимовые движения.",
    cues: ["Тяни локти назад", "Не раскачивай корпус", "В конце движения сведи лопатки"],
    mediaId: "media-horizontal-row",
  },
  {
    ...meta("ex-romanian-deadlift"),
    name: "Румынская тяга",
    loggingType: "weight_reps",
    description: "Тяга с акцентом на заднюю поверхность бедра и технику тазового наклона.",
    cues: ["Отводи таз назад", "Гриф идет близко к ногам", "Держи спину нейтральной"],
    mediaId: "media-romanian-deadlift",
  },
  {
    ...meta("ex-plank"),
    name: "Планка",
    loggingType: "duration",
    description: "Статическое упражнение для корпуса. Держи ровное положение и прекращай подход до потери формы.",
    cues: ["Корпус образует прямую линию", "Не проваливай поясницу", "Дыши ровно"],
    mediaId: "media-plank",
  },
  {
    ...meta("ex-deadlift"),
    name: "Становая тяга классическая или трап-гриф",
    loggingType: "weight_reps",
    description: "Тяжелое базовое движение для задней цепи. На старте приоритет у техники и спокойного веса.",
    cues: ["Гриф близко к телу", "Натяни корпус перед подъемом", "Не работай в отказ"],
    mediaId: "media-deadlift",
  },
  {
    ...meta("ex-overhead-press"),
    name: "Жим гантелей сидя или армейский жим",
    loggingType: "weight_reps",
    description: "Вертикальный жим для плеч и трицепсов с контролем корпуса.",
    cues: ["Ребра не выпячиваются вперед", "Жми по устойчивой траектории", "Опускай вес контролируемо"],
    mediaId: "media-overhead-press",
  },
  {
    ...meta("ex-pull-up"),
    name: "Подтягивания",
    loggingType: "reps",
    description: "Вертикальная тяга с собственным весом. Выполняй подходы не до отказа.",
    cues: ["Начинай движение лопатками", "Подбородок идет выше перекладины", "Оставляй запас повторов"],
    mediaId: "media-pull-up",
  },
  {
    ...meta("ex-leg-press-lunge"),
    name: "Жим ногами или выпады",
    loggingType: "weight_reps",
    description: "Дополнительное упражнение для ног после основной тяги.",
    cues: ["Контролируй глубину", "Не заваливай колени внутрь", "Держи темп ровным"],
    mediaId: "media-leg-press-lunge",
  },
  {
    ...meta("ex-face-pull"),
    name: "Face pull или разведения на заднюю дельту",
    loggingType: "weight_reps",
    description: "Легкая тяга для задней дельты, осанки и баланса плечевого пояса.",
    cues: ["Тяни к лицу или верхней груди", "Локти идут в стороны", "Не перегружай вес"],
    mediaId: "media-face-pull",
  },
  {
    ...meta("ex-front-squat-light"),
    name: "Фронтальный присед или обычный присед полегче",
    loggingType: "weight_reps",
    description: "Более легкий присед в тренировке C, чтобы сохранить технику и восстановление.",
    cues: ["Держи корпус высоким", "Работай легче, чем в тренировке A", "Оставляй запас"],
    mediaId: "media-front-squat",
  },
  {
    ...meta("ex-incline-dumbbell-press"),
    name: "Жим гантелей на наклонной скамье",
    loggingType: "weight_reps",
    description: "Жим под наклоном для верхней части груди и плеч.",
    cues: ["Лопатки стабильны", "Гантели идут симметрично", "Не бей гантелями вверху"],
    mediaId: "media-incline-dumbbell-press",
  },
  {
    ...meta("ex-lat-pulldown"),
    name: "Тяга верхнего блока или подтягивания",
    loggingType: "weight_reps",
    description: "Вертикальная тяга для широчайших и верхней части спины.",
    cues: ["Тяни локти вниз", "Не отклоняйся слишком сильно", "Контролируй возврат рукояти"],
    mediaId: "media-lat-pulldown",
  },
  {
    ...meta("ex-hyperextension-leg-curl"),
    name: "Гиперэкстензия или сгибание ног",
    loggingType: "weight_reps",
    description: "Дополнительная работа для задней поверхности бедра и разгибателей спины.",
    cues: ["Двигайся без рывков", "Не переразгибай поясницу", "Выбирай комфортную амплитуду"],
    mediaId: "media-hyperextension-leg-curl",
  },
  {
    ...meta("ex-lateral-raise-abs"),
    name: "Подъемы гантелей в стороны и пресс",
    loggingType: "weight_reps",
    description: "Легкая завершающая работа для средней дельты и корпуса.",
    cues: ["Поднимай гантели контролируемо", "Не раскачивай корпус", "Для пресса сохраняй ровное дыхание"],
    mediaId: "media-lateral-raise-abs",
  },
];

const workouts: WorkoutTemplate[] = [
  {
    ...meta("workout-a"),
    code: "A",
    name: "Тренировка A",
    exercises: [
      { exerciseId: "ex-barbell-squat", order: 1, target: "3x6-8" },
      { exerciseId: "ex-bench-press", order: 2, target: "3x6-8" },
      { exerciseId: "ex-horizontal-row", order: 3, target: "3x8-10" },
      { exerciseId: "ex-romanian-deadlift", order: 4, target: "2-3x8-10" },
      { exerciseId: "ex-plank", order: 5, target: "3x30-60 sec" },
    ],
  },
  {
    ...meta("workout-b"),
    code: "B",
    name: "Тренировка B",
    exercises: [
      { exerciseId: "ex-deadlift", order: 1, target: "3x4-6" },
      { exerciseId: "ex-overhead-press", order: 2, target: "3x6-8" },
      { exerciseId: "ex-pull-up", order: 3, target: "3 sets not to failure" },
      { exerciseId: "ex-leg-press-lunge", order: 4, target: "3x8-10" },
      { exerciseId: "ex-face-pull", order: 5, target: "2-3x12-15" },
    ],
  },
  {
    ...meta("workout-c"),
    code: "C",
    name: "Тренировка C",
    exercises: [
      { exerciseId: "ex-front-squat-light", order: 1, target: "3x8" },
      { exerciseId: "ex-incline-dumbbell-press", order: 2, target: "3x8-10" },
      { exerciseId: "ex-lat-pulldown", order: 3, target: "3x8-10" },
      { exerciseId: "ex-hyperextension-leg-curl", order: 4, target: "2-3x10-12" },
      { exerciseId: "ex-lateral-raise-abs", order: 5, target: "2-3x12-15" },
    ],
  },
];

const program: Program = {
  ...meta("program-full-body-return"),
  name: "Full-body 3x/week: возвращение регулярности",
  currentVersionId: "program-version-full-body-return-v1",
};

const version: ProgramVersion = {
  ...meta("program-version-full-body-return-v1"),
  programId: program.id,
  versionName: "Initial 6-8 week full-body plan",
  activeFrom: now,
  workoutIds: workouts.map((workout) => workout.id),
};

export const initialProgram: ProgramBundle = {
  program,
  version,
  workouts,
  exercises,
  media,
};
