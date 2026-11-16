import courtyardImg from './images/sanctuary_hero_courtyard_1794795252335.jpg';
import naveImg from './images/sanctuary_main_nave_1794795251794.jpg';
import candleImg from './images/sanctuary_candle_alcove_1794795252703.jpg';
import cloisterImg from './images/sanctuary_cloister_garden_1794795253094.jpg';

export const SANCTUARY_IMAGES = {
  courtyard: courtyardImg,
  nave: naveImg,
  candle: candleImg,
  cloister: cloisterImg,
} as const;

export type SanctuaryImageKey = keyof typeof SANCTUARY_IMAGES;
