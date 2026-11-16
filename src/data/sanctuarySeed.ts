import type {
  NoticeCategory,
  PrayerCategory,
  PrayerPosture,
  SanctuaryPayload,
  SanctuaryZoneId,
} from '../types';

export const VALID_PRAYER_CATEGORIES: PrayerCategory[] = [
  '평안',
  '위로',
  '치유',
  '가족',
  '감사',
  '성찰',
];

export const VALID_NOTICE_CATEGORIES: NoticeCategory[] = [
  '본당 소식',
  '전례·성사',
  '피정·치유',
];

export const VALID_ZONES: SanctuaryZoneId[] = [
  'nave',
  'adoration',
  'candles',
  'cloister',
];

export const VALID_POSTURES: PrayerPosture[] = [
  '침묵 묵상',
  '치유 기도',
  '감사 기도',
  '촛불 봉헌',
];

export const SEED_DATA: SanctuaryPayload = {
  dailyMeditations: [
    {
      id: 'med-sun',
      dayIndex: 0,
      dateLabel: '주일 · 부활과 안식의 날',
      liturgicalTitle: '고요함 속에서 들려오는 평화의 인사',
      theme: '평안',
      scriptureRef: '요한 복음 14장 27절',
      scriptureText:
        '나는 너희에게 평화를 남기고 간다. 내 평화를 너희에게 준다. 내가 주는 평화는 세상이 주는 평화와 같지 않다. 너희 마음이 산란해지는 일도, 겁을 내는 일도 없도록 하여라.',
      reflection:
        '한 주 동안 짊어지고 온 분주한 생각들을 잠시 성당 문 밖에 내려놓습니다. 돌벽과 소나무 사이로 스며드는 빛처럼, 주님의 평화는 거창한 소리가 아니라 지친 마음을 조용히 어루만지는 숨결로 다가옵니다. 오늘 이 자리에서 아무것도 증명하려 하지 않고, 그저 있는 모습 그대로 머물러 봅니다.',
      prayerText:
        '자비로우신 주님, 세상의 빠른 걸음 속에서 지친 제 영혼에 당신의 고요한 평화를 내려주소서. 불안을 내려놓고 오늘 하루를 감사로 숨 쉬게 하시며, 이 성전을 나설 때에는 제 곁의 이웃에게도 작은 평화가 되게 하소서. 아멘.',
    },
    {
      id: 'med-mon',
      dayIndex: 1,
      dateLabel: '월요일 · 새로운 시작의 묵상',
      liturgicalTitle: '지친 어깨를 쉬게 하시는 부르심',
      theme: '위로',
      scriptureRef: '마태오 복음 11장 28절',
      scriptureText:
        '고생하며 무거운 짐을 진 너희는 모두 나에게 오너라. 내가 너희에게 안식을 주겠다.',
      reflection:
        '새로운 한 주를 여는 월요일, 마음 한편에 무거움이 남아 있다면 잠시 눈을 감고 깊은 숨을 내쉽니다. 안식은 모든 일이 완벽히 해결된 뒤에야 찾아오는 보상이 아니라, 지금 이 순간 무거운 짐을 잠시 내려놓는 신뢰에서 시작됩니다.',
      prayerText:
        '주님, 제 힘만으로 감당하려 애쓰던 걱정들을 당신 제대 앞에 올려놓습니다. 오늘 제가 마주하는 모든 일에 조급함 대신 온유함을 주시고, 홀로 걷지 않음을 기억하며 평온히 발걸음을 내딛게 하소서. 아멘.',
    },
    {
      id: 'med-tue',
      dayIndex: 2,
      dateLabel: '화요일 · 빛을 바라보는 시간',
      liturgicalTitle: '어둠을 밝히는 작은 촛불 하나',
      theme: '성찰',
      scriptureRef: '시편 119편 105절',
      scriptureText: '당신 말씀은 제 발에 등불, 저의 길에 빛이옵니다.',
      reflection:
        '성당 초 제대 위에 켜진 작은 촛불은 성전 전체를 단번에 환하게 비추지는 못해도, 바로 내 발 앞의 한 걸음을 보기에 충분한 빛을 건넵니다. 먼 내일의 불확실함을 염려하기보다, 오늘 내게 주어진 한 걸음의 선함을 바라봅니다.',
      prayerText:
        '빛의 근원이신 주님, 앞길이 흐릿하여 망설여질 때마다 당신 말씀의 작은 등불로 제 마음을 밝혀주소서. 남과 비교하며 조급해하지 않고, 제게 허락된 오늘의 빛을 성실히 살아가게 하소서. 아멘.',
    },
    {
      id: 'med-wed',
      dayIndex: 3,
      dateLabel: '수요일 · 회랑을 걷는 감사',
      liturgicalTitle: '일상의 작은 숨결에 담긴 은총',
      theme: '감사',
      scriptureRef: '데살로니가 전서 5장 16-18절',
      scriptureText:
        '언제나 기뻐하십시오. 끊임없이 기도하십시오. 모든 일에 감사하십시오. 이것이 그리스도 예수님 안에서 살아가는 여러분에게 바라시는 하느님의 뜻입니다.',
      reflection:
        '화려한 기적이 아니더라도, 아침에 눈을 뜨고 맑은 공기를 마시며 누군가의 안부를 떠올릴 수 있는 평범한 하루가 이미 깊은 선물입니다. 회랑의 돌길을 천천히 밟듯, 오늘 내게 이미 주어진 고마운 이름 세 가지를 마음속으로 불러봅니다.',
      prayerText:
        '사랑의 주님, 부족한 것보다 이미 주신 은총을 먼저 헤아리는 맑은 눈을 주소서. 작은 친절과 따뜻한 말 한마디를 감사히 여기며, 저 역시 누군가에게 고요한 기쁨이 되는 하루를 살게 하소서. 아멘.',
    },
    {
      id: 'med-thu',
      dayIndex: 4,
      dateLabel: '목요일 · 성체 앞의 침묵',
      liturgicalTitle: '말없이 건네시는 깊은 우정',
      theme: '평안',
      scriptureRef: '열왕기 상권 19장 12절',
      scriptureText: '불이 지나간 뒤에 조용하고 부드러운 소리가 들려왔다.',
      reflection:
        '거센 바람과 흔들림 뒤에는 언제나 고요하고 부드러운 속삭임이 찾아옵니다. 기도는 많은 말을 늘어놓는 시간이 아니라, 사랑하는 분 앞에 말없이 앉아 서로의 현존을 나누는 조용한 우정의 시간입니다.',
      prayerText:
        '조용한 음성으로 말씀하시는 주님, 제 안의 소란스러운 생각들을 잠재워 주소서. 당신 앞에서 설명하지 않아도 다 아시는 그 사랑 안에 머물며, 영혼의 깊은 쉼을 얻게 하소서. 아멘.',
    },
    {
      id: 'med-fri',
      dayIndex: 5,
      dateLabel: '금요일 · 치유와 화해의 날',
      liturgicalTitle: '상처 입은 마음을 싸매시는 손길',
      theme: '치유',
      scriptureRef: '시편 147편 3절',
      scriptureText: '그분께서는 마음이 부서진 이들을 고쳐 주시고 그들의 상처를 싸매어 주신다.',
      reflection:
        '스스로에게도, 타인에게도 차마 다 털어놓지 못한 아픔이 있다면 오늘 성당의 고요한 품 안에서 조용히 내어놓습니다. 부서진 마음을 감추지 않고 빛 앞에 드러낼 때, 비로소 치유의 은총이 스며들기 시작합니다.',
      prayerText:
        '치유의 주님, 오래도록 아물지 않던 마음의 상처와 후회들을 당신의 자비에 맡겨드립니다. 저 자신을 용서할 용기를 주시고, 상처 입은 또 다른 이의 아픔을 알아보는 따뜻한 마음을 허락하소서. 아멘.',
    },
    {
      id: 'med-sat',
      dayIndex: 6,
      dateLabel: '토요일 · 성모님과 함께하는 고요',
      liturgicalTitle: '모든 일을 마음속에 간직하며 묵상하다',
      theme: '성찰',
      scriptureRef: '루카 복음 2장 19절',
      scriptureText: '마리아는 이 모든 일을 마음속에 간직하고 곰곰이 되새겼다.',
      reflection:
        '한 주간을 갈무리하는 토요일 저녁, 지나온 시간의 기쁨과 아쉬움을 서둘러 판단하지 않고 마음속에 고요히 품어 봅니다. 기다림의 시간조차 열매 맺는 계절의 일부임을 배우며 내일의 안식을 준비합니다.',
      prayerText:
        '어머니 마리아의 순명과 고요를 본받게 하시는 주님, 지나온 한 주간의 모든 만남과 사건 속에서 당신의 섭리를 보게 하소서. 오늘 밤 평화로운 잠을 허락하시고 내일 아침 기쁨으로 깨어나게 하소서. 아멘.',
    },
  ],
  prayers: [
    {
      id: 'prayer-1',
      author: '마리아',
      category: '치유',
      intention: '수술을 앞둔 어머니께서 두려움 없이 평온한 마음으로 회복하시기를 기도합니다.',
      candleLit: true,
      amenCount: 18,
      blessedByPriest: true,
      createdAt: '2026-11-15T07:20:00.000Z',
    },
    {
      id: 'prayer-2',
      author: '익명의 순례자',
      category: '평안',
      intention: '요즘 마음이 많이 흔들리고 지쳤는데, 이곳에서 잠시나마 깊은 숨을 고르고 평화를 얻고 갑니다.',
      candleLit: true,
      amenCount: 24,
      blessedByPriest: true,
      createdAt: '2026-11-15T09:05:00.000Z',
    },
    {
      id: 'prayer-3',
      author: '요셉',
      category: '가족',
      intention: '멀리 떨어져 지내는 자녀들이 각자의 자리에서 건강하고 선한 이웃과 함께하기를 봉헌합니다.',
      candleLit: true,
      amenCount: 12,
      blessedByPriest: false,
      createdAt: '2026-11-15T11:40:00.000Z',
    },
    {
      id: 'prayer-4',
      author: '안나',
      category: '감사',
      intention: '오랜 기다림 끝에 다시 일을 시작할 수 있게 되어 감사 기도와 작은 초 한 자루를 밝힙니다.',
      candleLit: true,
      amenCount: 15,
      blessedByPriest: false,
      createdAt: '2026-11-15T14:15:00.000Z',
    },
  ],
  masses: [
    {
      id: 'mass-1',
      dayGroup: '주일 미사',
      time: '07:30',
      title: '새벽 고요 미사',
      location: '대성전',
      note: '소성가와 침묵 중심의 이른 아침 미사',
    },
    {
      id: 'mass-2',
      dayGroup: '주일 미사',
      time: '10:30',
      title: '교중 미사',
      location: '대성전',
      note: '본당 공동체 미사 · 성가대 봉헌',
    },
    {
      id: 'mass-3',
      dayGroup: '주일 미사',
      time: '17:00',
      title: '저녁 묵상 미사',
      location: '대성전',
      note: '청년 및 순례자 환영 미사',
    },
    {
      id: 'mass-4',
      dayGroup: '토요 특전',
      time: '18:00',
      title: '토요 특전 미사',
      location: '대성전',
      note: '주일 전례 봉헌',
    },
    {
      id: 'mass-5',
      dayGroup: '평일 미사',
      time: '06:30',
      title: '월 · 수 · 금 새벽 미사',
      location: '성체조배실',
      note: '소규모 공동체 미사',
    },
    {
      id: 'mass-6',
      dayGroup: '평일 미사',
      time: '10:00',
      title: '화 · 목 오전 미사',
      location: '대성전',
      note: '미사 후 30분 성체조배',
    },
    {
      id: 'mass-7',
      dayGroup: '고해성사',
      time: '미사 30분 전',
      title: '상시 고해 및 영적 면담',
      location: '성당 우측 고해소',
      note: '평일 예약 영적 면담은 사목실 문의',
    },
  ],
  notices: [
    {
      id: 'notice-1',
      title: '11월 위령 성월 합동 연미사 및 촛불 봉헌 안내',
      category: '전례·성사',
      date: '2026.11.12',
      summary: '먼저 세상을 떠난 가족과 은인들을 기억하며 11월 매주 수요일 저녁 합동 위령 미사를 봉헌합니다.',
      content:
        '위령 성월을 맞이하여 본당에서는 먼저 하느님 품에 안긴 가족과 지인들을 위한 기도의 자리를 마련하였습니다. 온라인 기도실에서도 위령 지향을 남기실 수 있으며, 봉헌된 지향은 매주 수요일 오전 10시 위령 미사 제대에 함께 올려집니다. 조용한 마음으로 함께 기도해 주시기 바랍니다.',
      pinned: true,
    },
    {
      id: 'notice-2',
      title: '가을 산사 회랑 걷기 피정 · 침묵의 하루 신청',
      category: '피정·치유',
      date: '2026.11.09',
      summary: '스마트폰을 잠시 내려놓고 대성전과 회랑 정원을 걸으며 내면의 평화를 회복하는 일일 침묵 피정입니다.',
      content:
        '매월 셋째 주 토요일 오전 10시부터 오후 4시까지 진행되는 일일 침묵 피정입니다. 신자가 아니더라도 고요한 쉼과 성찰이 필요한 분이라면 누구나 참여하실 수 있습니다. 간단한 점심 식사와 차가 제공되며, 사목실을 통해 사전 신청을 받습니다.',
      pinned: true,
    },
    {
      id: 'notice-3',
      title: '성전 개방 시간 및 순례객 묵상 수칙 안내',
      category: '본당 소식',
      date: '2026.11.03',
      summary: '매일 오전 6시부터 밤 9시까지 누구나 성당에 들어와 기도하고 쉴 수 있도록 성전을 개방합니다.',
      content:
        '고요의 성당은 미사 시간 외에도 언제든 들러 마음을 쉬어갈 수 있는 열린 성전입니다. 성당 내부에서는 사진 촬영과 대화를 삼가 주시고, 회랑 정원과 성체조배실의 고요를 서로 지켜 주시기를 부탁드립니다.',
      pinned: false,
    },
  ],
  spaces: [
    {
      id: 'atrium',
      orderLabel: '01',
      name: '만남의 아트리움',
      latinName: 'Atrium · Threshold of Silence',
      subtitle: '세상의 소음을 내려놓고 침묵으로 건너가는 첫 마당',
      dimensions: '18.0 × 12.5 m · 화강석 수반',
      lightingNote: '산안개와 아침 햇살이 반사되는 개방형 중정',
      description:
        '성당 문턱에 들어서기 전 마주하는 얕은 돌 수반과 소나무 마당입니다. 물 위에 비친 하늘을 잠시 바라보며 바깥의 분주한 속도를 늦추고 마음의 먼지를 씻어내는 전이 공간입니다.',
      contemplationPrompt: '이 마당을 지날 때, 오늘 내 마음을 가장 무겁게 누르던 생각 하나를 물 위에 띄워 보내 보세요.',
      isOpen: true,
      statusNote: '상시 개방 · 야간 은은한 석등 점등',
      imageKey: 'courtyard',
    },
    {
      id: 'nave',
      orderLabel: '02',
      name: '대성전 · 주 제대',
      latinName: 'Main Nave & Limestone Altar',
      subtitle: '자연광이 스며드는 라임스톤 제대와 나무 서까래의 성소',
      dimensions: '32.0 × 16.0 m · 천고 11.4 m',
      lightingNote: '동남향 고측창(Clerestory)을 통한 간접 자연 채광',
      description:
        '불필요한 장식을 비워내고 돌과 삼나무, 그리고 빛만으로 채운 본당의 중심 공간입니다. 제대 뒤 수직 창으로 들어오는 햇살이 시간에 따라 돌벽을 천천히 가로지르며 기도의 호흡을 돕습니다.',
      contemplationPrompt: '좌석에 앉아 허리를 곧게 펴고, 제대 십자가 위로 떨어지는 빛의 결을 3분간 말없이 바라보세요.',
      isOpen: true,
      statusNote: '개방 중 · 06:00–21:00',
      imageKey: 'nave',
    },
    {
      id: 'adoration',
      orderLabel: '03',
      name: '성체조배실',
      latinName: 'Eucharistic Adoration Chapel',
      subtitle: '작은 등불 아래 주님과 일대일로 머무는 고요의 방',
      dimensions: '7.5 × 6.2 m · 16석',
      lightingNote: '감실 등불과 간접 바닥 조명으로 유지되는 묵상 조도',
      description:
        '대성전 북측 돌벽 안쪽에 자리한 작은 예배당입니다. 외부 소음이 완전히 차단된 공간에서 오직 숨소리와 침묵만이 머물며, 말 없는 기도(관상 기도)를 바치기에 가장 알맞은 곳입니다.',
      contemplationPrompt: '아무 말도 준비하지 않고, "주님, 제가 여기 있습니다" 한 마디만 마음속으로 건네 보세요.',
      isOpen: true,
      statusNote: '침묵 조배 중 · 06:00–21:00',
      imageKey: 'nave',
    },
    {
      id: 'candles',
      orderLabel: '04',
      name: '봉헌 초 제대',
      latinName: 'Votive Candle Alcove',
      subtitle: '소중한 이의 이름을 담아 작은 불빛을 남기는 돌 감실',
      dimensions: '4.2 × 3.8 m · 황동 촛대',
      lightingNote: '밀랍 초의 따뜻한 호박색 불빛',
      description:
        '아치형 석조 벽감 안에 자리한 봉헌 공간입니다. 떠나온 뒤에도 성당에 남은 불빛이 나를 대신해 기도해 준다는 믿음으로, 가족의 건강과 이별한 이들의 안식을 빌며 초를 밝힙니다.',
      contemplationPrompt: '지금 마음속에 가장 먼저 떠오르는 한 사람의 이름을 떠올리며 작은 빛을 봉헌해 보세요.',
      isOpen: true,
      statusNote: '상시 봉헌 가능 · 온라인 초 봉헌 연동',
      imageKey: 'candle',
    },
    {
      id: 'confession',
      orderLabel: '05',
      name: '화해의 고해소',
      latinName: 'Chapel of Reconciliation',
      subtitle: '오래된 죄책감을 내려놓고 다시 시작하는 온기의 방',
      dimensions: '3.6 × 3.2 m · 참나무 흡음 목재',
      lightingNote: '따뜻한 벽면 간접등 · 대면 및 익명 선택 가능',
      description:
        '어둡고 좁은 닫힌 칸막이가 아니라, 따뜻한 참나무 결이 감싸는 평온한 화해의 공간입니다. 판단이 아닌 경청과 용서를 통해 영혼이 가벼워지는 치유의 자리입니다.',
      contemplationPrompt: '스스로를 오랫동안 책망해 왔던 일이 있다면, 오늘 주님의 자비 앞에 내려놓아도 괜찮습니다.',
      isOpen: true,
      statusNote: '미사 30분 전 성사 집전',
      imageKey: 'candle',
    },
    {
      id: 'cloister',
      orderLabel: '06',
      name: '회랑 정원과 종탑',
      latinName: 'Cloister Garden & Bell Tower',
      subtitle: '소나무와 이끼 길을 천천히 거닐며 바치는 걷기 묵상',
      dimensions: '회랑 둘레 84.0 m · 야외 산책로',
      lightingNote: '나뭇잎 사이로 부서지는 숲의 자연광',
      description:
        '기도를 마친 뒤 바로 일상으로 돌아가기 전, 느린 걸음으로 생각을 정돈하는 목조 회랑과 정원입니다. 정오와 저녁 여섯 시에는 작은 종탑에서 삼종기도를 알리는 맑은 종소리가 울려 퍼집니다.',
      contemplationPrompt: '발바닥이 돌길에 닿는 감각에 집중하며 열 걸음만 천천히 걸어보세요.',
      isOpen: true,
      statusNote: '산책 개방 · 삼종기도 타종 12:00 / 18:00',
      imageKey: 'cloister',
    },
  ],
};
