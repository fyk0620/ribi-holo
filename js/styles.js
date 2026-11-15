
window.Ribi = window.Ribi || {};

(function (R) {
  const css = (id, label, attrs) => ({ id: 'css:' + id, engine: 'css', label, attrs });
  const s151 = (id, label, attrs) => ({ id: '151:' + id, engine: '151', label, attrs });

  const P = { supertype: 'pokémon', subtypes: 'basic' };
  const STAGE = { supertype: 'pokémon', subtypes: 'stage 1' };
  const TRAINER = { supertype: 'trainer', subtypes: 'item' };
  const SUPPORTER = { supertype: 'trainer', subtypes: 'supporter' };

  R.ENGINES = {
    css: {
      label: 'Pokémon Cards CSS',
      dir: 'css/pokemon-cards-css/',
      files: [
        'cards/base.css', 'cards/cards.css', 'cards/basic.css', 'cards/reverse-holo.css', 'cards/regular-holo.css',
        'cards/cosmos-holo.css', 'cards/amazing-rare.css', 'cards/radiant-holo.css', 'cards/v-regular.css',
        'cards/v-full-art.css', 'cards/v-max.css', 'cards/v-star.css', 'cards/trainer-full-art.css',
        'cards/rainbow-holo.css', 'cards/rainbow-alt.css', 'cards/secret-rare.css',
        'cards/trainer-gallery-holo.css', 'cards/trainer-gallery-v-regular.css',
        'cards/trainer-gallery-v-max.css', 'cards/trainer-gallery-secret-rare.css',
        'cards/shiny-rare.css', 'cards/shiny-v.css', 'cards/shiny-vmax.css', 'cards/swsh-pikachu.css',
      ],
    },
    '151': {
      label: 'Pokémon Cards 151',
      dir: 'css/pokemon-cards-151/',
      files: [
        'cards/base.css', 'cards/cards.css', 'cards/basic.css', 'cards/reverse-holo.css', 'cards/regular-holo.css',
        'cards/radiant-holo.css', 'cards/rainbow-alt.css', 'cards/ex-regular.css', 'cards/ex-full-art.css',
        'cards/illustration-rare.css', 'cards/poke-ball-holo.css',
        'cards/ex-special-illustration-rare.css', 'cards/hyper-rare.css',
      ],
    },
  };

  R.STYLES = [
    
    css('regular-holo', 'Regular Holo', { rarity: 'rare holo', ...P }),
    css('cosmos-holo', 'Cosmos Holo', { rarity: 'rare holo cosmos', ...P }),
    css('amazing-rare', 'Amazing Rare', { rarity: 'amazing rare', ...P }),
    css('v', 'V', { rarity: 'rare holo v', subtypes: 'basic v', supertype: 'pokémon' }),
    css('v-full-art', 'V Full Art', { rarity: 'rare ultra', subtypes: 'basic v', supertype: 'pokémon' }),
    css('v-max', 'VMAX', { rarity: 'rare holo vmax', subtypes: 'vmax', supertype: 'pokémon' }),
    css('v-star', 'VSTAR', { rarity: 'rare holo vstar', subtypes: 'vstar', supertype: 'pokémon' }),
    css('trainer-full-art', 'Trainer Full Art', { rarity: 'rare ultra', ...SUPPORTER }),
    css('rainbow-holo', 'Rainbow Rare', { rarity: 'rare rainbow', subtypes: 'basic v', supertype: 'pokémon' }),
    css('rainbow-alt', 'Rainbow Alt', { rarity: 'rare rainbow alt', subtypes: 'vmax', supertype: 'pokémon' }),
    css('secret-rare', 'Secret Rare', { rarity: 'rare secret', ...P }),
    css('shiny-rare', 'Shiny Rare', { rarity: 'rare shiny', ...P }),
    css('shiny-v', 'Shiny V', { rarity: 'rare shiny v', subtypes: 'basic v', supertype: 'pokémon' }),
    css('shiny-vmax', 'Shiny VMAX', { rarity: 'rare shiny vmax', subtypes: 'vmax', supertype: 'pokémon' }),
    css('swsh-pikachu', 'Pikachu SWSH 160', { rarity: 'rare secret', set: 'swsh12pt5', number: '160', ...P }),
    css('tg-holo', 'Trainer Gallery • Holo', { rarity: 'rare holo', gallery: true, number: 'tg01', ...P }),
    css('tg-v', 'Trainer Gallery • V', { rarity: 'rare holo v', gallery: true, number: 'tg01', subtypes: 'basic v', supertype: 'pokémon' }),
    css('tg-vmax', 'Trainer Gallery • VMAX', { rarity: 'rare holo vmax', gallery: true, number: 'tg01', subtypes: 'vmax', supertype: 'pokémon' }),
    css('tg-secret', 'Trainer Gallery • Secret Rare', { rarity: 'rare secret', gallery: true, number: 'tg01', ...P }),

    
    s151('basic', 'Basic', { rarity: 'common', ...P }),
    s151('reverse-holo', 'Reverse Holo', { rarity: 'common reverse holo', ...P }),
    s151('regular-holo', 'Regular Holo', { rarity: 'rare holo', ...P }),
    s151('radiant-rare', 'Radiant Rare', { rarity: 'radiant rare', ...P }),
    s151('rainbow-alt', 'Rainbow Alt', { rarity: 'rare rainbow alt', subtypes: 'vmax', supertype: 'pokémon' }),
    s151('double-rare', 'Double Rare (ex)', { rarity: 'double rare', subtypes: 'basic ex', supertype: 'pokémon' }),
    s151('ultra-rare', 'Ultra Rare (ex Full Art & Trainer)', { rarity: 'ultra rare', subtypes: 'basic ex', supertype: 'pokémon' }),
    s151('illustration-rare', 'Illustration Rare', { rarity: 'illustration rare', ...P }),
    s151('special-illustration-rare', 'Special Illustration Rare', { rarity: 'special illustration rare', subtypes: 'basic ex', supertype: 'pokémon' }),
    s151('hyper-rare', 'Hyper Rare (Gold card)', { rarity: 'hyper rare', subtypes: 'basic ex', supertype: 'pokémon' }),
    s151('pokeball-holo', 'Poké Ball Holo', { rarity: 'pokeball holo', ...P }),
    s151('masterball-holo', 'Master Ball Holo', { rarity: 'masterball holo', ...P }),
  ];

  R.DEFAULT_STYLE = 'css:trainer-full-art';
})(window.Ribi);
